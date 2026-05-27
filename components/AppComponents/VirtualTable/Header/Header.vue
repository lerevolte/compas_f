<template>
    <div class="table__header">
        <div class="table__row" ref="headerRowRef">
            <div 
                v-for="(column, idx) in table.header" 
                class="table__cell" 
                :class="{
                    'table__cell_hide-text': column.width.replace('px', '') < 50, 
                    'table__cell_sort': column.key == table.sortItem.sort_field,
                    'table__cell_hide': !column.enabled,
                    'table__cell_fixed': column.fixed
                }"
                :key="column.key" 
                :style="`--cell-size: ${column.width}; --cell-left: ${column.left}px;`"
                :data-column-key="column.key"
                :data-idx="idx"
                :draggable="true"
                @dragover.prevent
				@dragenter.prevent
                @dragstart="(event) => dragger.dragStart(event, column.key)"
                @dragend="() => dragger.dragEnd(null)"   
                @click="(event) => doubleClick(event)"
            >
                <span 
                    class="table__cell-border"
                    @mousedown.prevent="(e) => resizer.onRightResizeMouseDown(e, idx)"
                />
                <AppCheckbox
                    v-if="column.key == 'isChoose'"
                    v-model="column.value"
                    :options="{
                        title: column.title,
                        disabled: table.options?.isDisableMassAction
                    }"
                    @update:model-value="table.chooseAll(column.value)"
                />
                <span class="text" v-else>
                    {{ column.title }}
                </span>

                <IconSort v-if="!table.options?.isDisableSort && column.key == table.sortItem.sort_field" :class="{'icon_sort_up': table.sortItem.sort_order == 'asc'}"/>
            </div>
        </div>
        <slot></slot>
    </div>
</template>

<script setup>
    import './Header.scss'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import IconSort from '@AppIcons/Table/Sort.vue'
    import throttle from 'lodash/throttle'
    import { Common } from '@/helpers/classes.js'

    const table = inject('table')
    const tableRef = inject('tableRef')

    class Resize {
        constructor() {
            this.MIN_COLUMN_WIDTH = 40
            this.isResizing = ref(false)
            this.startClientX = 0
            this.startWidthPx = 0
            this.resizingColumnIdx = -1
            this.choosed = ref({ list: [], headerColumn: null })
            this.visibleHeader = reactive(table.value.header.filter(el => el.enabled))
            this.onMouseMove = this.onMouseMove.bind(this)
            this.onMouseUp = this.onMouseUp.bind(this)
        }

        /** Старт ресайза */
        onRightResizeMouseDown(e, idx) {
            this.isResizing.value = true
            this.resizingColumnIdx = idx
            this.startClientX = e.clientX
            this.startWidthPx = this.parseWidthToPx(table.value.header[idx].width)

            tableRef.value.classList.add('table_resize')

            this.choosed.value.list = tableRef.value.querySelectorAll(`.table__cell[data-column-key="${table.value.header[idx].key}"]`)
            this.choosed.value.headerColumn = e.target.closest('.table__cell')
            this.choosed.value.headerColumn.classList.add('table__cell_resize')

            this.throttledMouseMove = throttle(this.onMouseMove, 10)
            window.addEventListener('mousemove', this.throttledMouseMove, { passive: true })
            window.addEventListener('mouseup', this.onMouseUp, { passive: false })
            document.body.classList.add('body_resize')
        }

        /** Завершение ресайза */
        onMouseUp() {
            if (!this.isResizing.value) return
            const colKey = table.value.header[this.resizingColumnIdx].key
            const findedColumn = table.value.header.find(el => el.key === colKey)
            findedColumn.width = this.choosed.value.list[0].style.getPropertyValue('--cell-size')

            this.isResizing.value = false
            this.resizingColumnIdx = -1
            this.startWidthPx = 0
            this.startClientX = 0

            window.removeEventListener('mousemove', this.onMouseMove)
            window.removeEventListener('mouseup', this.onMouseUp)
            if (this.throttledMouseMove) {
            window.removeEventListener('mousemove', this.throttledMouseMove)
            this.throttledMouseMove.cancel?.()
            }

            this.choosed.value.list = []
            this.choosed.value.headerColumn.classList.remove('table__cell_resize')
            this.choosed.value.headerColumn = null
            
            document.body.classList.remove('body_resize')
            tableRef.value.classList.remove('table_resize')
            this.normalizeToContainerMinWidth()
            table.value.isChanged = true
            this.setFixedLeft()
        }

        /** Обработка движения мыши */
        onMouseMove(e) {
            if (!this.isResizing.value || this.resizingColumnIdx < 0) return
            const delta = e.clientX - this.startClientX
            this.setWidthPx(this.resizingColumnIdx, this.startWidthPx + delta)
            this.normalizeToContainerMinWidth(true)
        }

        /** Преобразование ширины в пиксели */
        parseWidthToPx(width) {
            if (typeof width === 'number') return width
            if (!width) return 0
            if (width.endsWith('px')) return parseInt(width)
            if (width.endsWith('%')) {
            const tableEl = document.querySelector('.table')
            const tableWidth = tableEl ? tableEl.clientWidth : 0
            return Math.round((parseFloat(width) / 100) * tableWidth)
            }
            const n = parseInt(width)
            return Number.isNaN(n) ? 0 : n
        }

        /** Установка ширины ячеек */
        setWidthPx(idx, px) {
            if (!table?.value?.header?.[idx]) return
            const newPx = Math.max(this.MIN_COLUMN_WIDTH, Math.round(px))
            
            if (newPx <= 50) {
                this.choosed.value.headerColumn.classList.add('table__cell_hide-text')
            } else {
                this.choosed.value.headerColumn.classList.remove('table__cell_hide-text')
            }

            this.choosed.value.list.forEach(el => {
                el.style.setProperty('--cell-size', `${newPx}px`)
            })
        }

        // Установка отступов слева у блоков
        setFixedLeft() {
            let left = 0
            
            table.value.header.forEach((column, idx) => {
                if (column.fixed && column.enabled) {
                column.left = left
                left += parseInt(column.width.replace('px', ''))
                }
            })
            // Сообщаем, что позиции фиксированных колонок обновились
            if (tableRef.value) {
                tableRef.value.dispatchEvent(new CustomEvent('vt-fixed-update'))
            }      
        }

        /** Пропорционально увеличивает ширины колонок, если их сумма меньше ширины контейнера **/
        normalizeToContainerMinWidth(useDomCurrent = false) {
            const tableEl = tableRef?.value
            if (!tableEl || !Array.isArray(table?.value?.header)) return

            const containerWidth = tableEl.clientWidth - 15 || 0
            if (containerWidth <= 0) return

            const currentWidthsPx = this.visibleHeader.map(col => {
                if (useDomCurrent) {
                    const cell = tableEl.querySelector(`.table__cell[data-column-key="${col.key}"]`)
                    const cssVar = cell?.style?.getPropertyValue('--cell-size')?.trim()
                    if (cssVar) {
                        const px = parseInt(cssVar.replace('px', ''))
                        if (Number.isFinite(px)) return px
                    }
                }
                return this.parseWidthToPx(col.width)
            })
            const sumWidths = currentWidthsPx.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0)

            if (sumWidths <= 0 || sumWidths >= containerWidth) return

            const scale = containerWidth / sumWidths
            let accumulated = 0

            this.visibleHeader.forEach((col, index) => {
                const base = currentWidthsPx[index] || 0
                let newWidth = index === this.visibleHeader.length - 1
                    ? Math.max(this.MIN_COLUMN_WIDTH, containerWidth - accumulated)
                    : Math.max(this.MIN_COLUMN_WIDTH, Math.round(base * scale))

                accumulated += newWidth

                col.width = `${newWidth}px`

                const cells = tableEl.querySelectorAll(`.table__cell[data-column-key="${col.key}"]`)
                cells.forEach(cell => {
                    cell.style.setProperty('--cell-size', `${newWidth}px`)
                    if (newWidth <= 50) {
                        cell.classList.add('table__cell_hide-text')
                    } else {
                        cell.classList.remove('table__cell_hide-text')
                    }
                })
            })
        }

        /** Очистка обработчиков */
        clear() {
            window.removeEventListener('mousemove', this.onMouseMove)
            window.removeEventListener('mouseup', this.onMouseUp)
            document.body.classList.remove('body_resize')
        }
    }

    let draggingItem = ref(null)
    let prevMouseCoords = ref(null)

    class Drag {
        constructor() {
            this.copy = null
            this.draggingCell = null
        }

        // Начало перетаскивания
        dragStart(event, key) {
            if (event.target.classList.contains('table__cell_stuck')) {
                event.preventDefault()
                return
            }

            draggingItem.value = key
            this.setDragImage(event)
            document.addEventListener("dragover", this.onMouseMove);
            tableRef.value.classList.add('table_dragging')
        }

        // Конец перетаскивания
        async dragEnd() {
            let removingItem = document.getElementById('table_transfer')
            this.copy.remove()
            if (removingItem != null) {
                removingItem.remove()
            }

            this.draggingCell.classList.remove('table__cell_dragging')
            this.draggingCell.style.removeProperty('--table-height')
            this.draggingCell = null

            table.value.header = common.reorderArrayByKey(
                table.value.header, 
                [...tableRef.value.querySelectorAll('.table__header .table__cell')].map(el => {return {key: el.getAttribute('data-column-key')}}), 
                'key'
            )
            tableRef.value.classList.remove('table_dragging')
            table.value.isChanged = true
            await nextTick()
            resizer.setFixedLeft()
        }

        // Создание колонки для дататрансфера
        setDragImage(event) {
            const setCopy = () => {
                this.copy = tableRef.value.cloneNode(true);
                this.copy.classList.add('table_copy')
                this.copy.id = "table_transfer";
                this.copy.style.maxWidth = this.copy.querySelector(`.table__header .table__cell[data-column-key=${draggingItem.value}]`)?.style.getPropertyValue('--cell-size')
                document.body.appendChild(this.copy);


                this.draggingCell = tableRef.value.querySelector(`.table__header .table__cell[data-column-key=${draggingItem.value}]`)
                this.draggingCell.classList.add('table__cell_dragging')
                this.draggingCell.style.setProperty('--table-height', `${tableRef.value.offsetHeight}px`)
            }

            const setRow = () => {
                let backupRows = tableRef.value.querySelectorAll('.table__row')
                let rows = this.copy?.querySelectorAll('.table__row') || []
    
                rows.forEach((row, index) => {
                    let items = row.querySelectorAll('.table__cell')
                    for (let item of items) {
                        if (item.getAttribute('data-column-key') != draggingItem.value) {
                            item.remove()
                        } else {
                            let findedRow = [...backupRows][index]
                            if (findedRow != undefined) {
                                item.style.height = `${ findedRow.offsetHeight}px`
                            } else {
                                item.style.height = `${ row.offsetHeight}px`
                            }
                        }
                    }
                })
            }
            
            setCopy()
            setRow()
            event.dataTransfer.setDragImage(this.copy, event.offsetX, event.offsetY);
        }

        // Движение мыши
        onMouseMove(e) {
            // Перетаскивание колонки
            const moveColumn = (posX) => {
                let itemListParent = tableRef.value.querySelector('.table__header .table__row');
                let itemList = itemListParent.querySelectorAll('.table__cell');


                let tableBodyListParent = tableRef.value.querySelectorAll('.table__body .table__row')
                let fromIndex = [...itemList].findIndex(p => p.getAttribute('data-column-key') == draggingItem.value)
                let stopDrag = false

                let hoverElementIndex = [...itemList].findIndex((elem, index) => {
                    let itemCoords = elem.getBoundingClientRect();
                    let startCoord = itemCoords.x
                    let center = (itemCoords.x + (itemCoords.x + itemCoords.width)) / 2 + 10
                    let endCoord = itemCoords.x + itemCoords.width + 10
                    let coord = (startCoord + center) / 2

                    if ((posX >= coord && posX <= endCoord) && ((posX > center + 3 && fromIndex > index) || (posX < center - 3 && fromIndex < index))) {
                        stopDrag = true
                    }

                    return posX >= coord && posX <= endCoord
                })

                if (stopDrag || [null, undefined, -1].includes(hoverElementIndex) || itemList[hoverElementIndex].classList.contains('table__cell_stuck')) return

                if (fromIndex > hoverElementIndex) {
                    itemListParent.insertBefore(itemList[fromIndex], itemList[hoverElementIndex]);

                    for (let row of tableBodyListParent) {
                        row.insertBefore(row.children[fromIndex], row.children[hoverElementIndex]);
                    }
                } else if (fromIndex < hoverElementIndex) {
                    itemListParent.insertBefore(itemList[hoverElementIndex], itemList[fromIndex]);

                    for (let row of tableBodyListParent) {
                        row.insertBefore(row.children[hoverElementIndex], row.children[fromIndex]);
                    }
                } else {
                    return
                }
            }

            e = e || window.event;
            var dragX = e.pageX
            if (prevMouseCoords.value != dragX) {
                moveColumn(dragX)
            }
            prevMouseCoords.value = dragX
        }
    }

    class Fixed {
        constructor() {
            // Кэш natural offsetLeft каждой fixed-ячейки (по data-column-key).
            // Перечитываем только при vt-fixed-update / resize, а не при каждом скролле,
            // чтобы убрать дёргание из-за layout-reads на 60 FPS в Safari.
            this.naturalLeftCache = new Map()
        }

        invalidateCache() {
            this.naturalLeftCache.clear()
        }

        // Функция для проверки sticky позиционирования при горизонтальном скролле
        checkStickyCells() {
            if (!tableRef.value) return

            const fixedCells = tableRef.value.querySelectorAll('.table__cell_fixed')
            const tableRect = tableRef.value.getBoundingClientRect()
            const scrollLeft = tableRef.value.scrollLeft
            const isScrolledHorizontally = scrollLeft > 0

            // На мобильных ячейки выводятся друг под другом (карточный вид) —
            // фиксация и transform только мешают. Сбрасываем все позиционные стили.
            const isMobileLayout = typeof window !== 'undefined' && window.innerWidth <= 990
            if (isMobileLayout) {
                fixedCells.forEach(cell => {
                    if (cell.style.transform) cell.style.transform = ''
                    if (cell.style.position) cell.style.position = ''
                    if (cell.style.left) cell.style.left = ''
                    if (cell.classList.contains('table__cell_stuck')) {
                        cell.classList.remove('table__cell_stuck')
                    }
                })
                return
            }

            // Safari: position:sticky на flex-ячейках внутри position:absolute row'a
            // местами теряет фиксацию при горизонтальной прокрутке. В этом случае
            // компенсируем смещение через translateX(scrollLeft).
            const isSafari = typeof navigator !== 'undefined'
                && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

            fixedCells.forEach(cell => {
                const stickyLeft = parseFloat(cell.style.getPropertyValue('--cell-left') || '0')

                if (isSafari) {
                    // Safari: эмулируем sticky через transform.
                    // Колонка должна "залипать" только когда её естественная видимая позиция
                    // (offsetLeft в строке минус scrollLeft) опускается ниже stickyLeft.
                    if (cell.style.position !== 'relative') {
                        cell.style.position = 'relative'
                        cell.style.left = '0px'
                    }

                    // Кэшируем offsetLeft по строке+колонке. offsetLeft = layout read,
                    // если делать его 60 раз в секунду — получаем дёргание.
                    const row = cell.parentElement
                    const cacheKey = `${row?.getAttribute('data-index') ?? '?'}:${cell.getAttribute('data-column-key')}`
                    let cellOffsetLeft = this.naturalLeftCache.get(cacheKey)
                    if (cellOffsetLeft === undefined) {
                        cellOffsetLeft = cell.offsetLeft
                        this.naturalLeftCache.set(cacheKey, cellOffsetLeft)
                    }

                    const naturalVisibleLeft = cellOffsetLeft - scrollLeft
                    if (naturalVisibleLeft < stickyLeft) {
                        const offset = stickyLeft - naturalVisibleLeft
                        cell.style.transform = `translate3d(${offset}px, 0, 0)`
                        if (!cell.classList.contains('table__cell_stuck')) {
                            cell.classList.add('table__cell_stuck')
                        }
                    } else {
                        if (cell.style.transform) cell.style.transform = ''
                        if (cell.classList.contains('table__cell_stuck')) {
                            cell.classList.remove('table__cell_stuck')
                        }
                    }
                    return
                }

                const rect = cell.getBoundingClientRect()
                const actualLeft = rect.left - tableRect.left
                const tolerance = 2

                let isStuck = Math.abs(actualLeft - stickyLeft) <= tolerance
                if (!isScrolledHorizontally) {
                    isStuck = false
                }

                cell.classList.toggle('table__cell_stuck', isStuck)
            })
        }
    }

    const resizer = new Resize()
    const dragger = new Drag()
    const fixed = new Fixed()
    const common = new Common()

    const doubleClick = common.useDoubleClick((event) => {
        if (table.value.options.isDisableSort) return
        table.value.sort(table.value.header[event.getAttribute('data-idx')])
    })
 
    onBeforeUnmount(() => {
        resizer.clear()

        // Очищаем обработчики
        if (tableRef.value) {
            if (window._stickyScrollHandler) {
                tableRef.value.removeEventListener('scroll', window._stickyScrollHandler)
                delete window._stickyScrollHandler
            }
            if (window._stickyFixedUpdateHandler) {
                tableRef.value.removeEventListener('vt-fixed-update', window._stickyFixedUpdateHandler)
                delete window._stickyFixedUpdateHandler
            }
        }
        if (window._stickyResizeHandler) {
            window.removeEventListener('resize', window._stickyResizeHandler)
            delete window._stickyResizeHandler
        }
    })

    onMounted(() => {
        // nextTick(() => resizer.normalizeToContainerMinWidth())

        // Обработчик горизонтального скролла
        // rAF-склейка скролла для снижения дрожи и reflow
        let scheduled = false
        const handleScrollRaf = () => {
            if (scheduled) return
            scheduled = true
            requestAnimationFrame(() => {
                scheduled = false
                fixed.checkStickyCells()
            })
        }

        // Добавляем обработчик скролла (passive)
        tableRef.value.addEventListener('scroll', handleScrollRaf, { passive: true })
        
        // Проверяем состояние сразу после монтирования
        nextTick(() => {
            fixed.checkStickyCells()
        })

        // Сохраняем ссылку на обработчик для очистки
        window._stickyScrollHandler = handleScrollRaf
        
        // Добавляем обработчик для обновления позиций фиксированных колонок
        const handleFixedUpdate = () => {
            // Конфигурация колонок изменилась — кэш natural offsetLeft устаревает.
            fixed.invalidateCache()
            nextTick(() => fixed.checkStickyCells())
        }

        tableRef.value.addEventListener('vt-fixed-update', handleFixedUpdate)
        window._stickyFixedUpdateHandler = handleFixedUpdate

        // Сбрасываем кэш при ресайзе окна (ширины перерасчитываются).
        const handleResize = () => fixed.invalidateCache()
        window.addEventListener('resize', handleResize)
        window._stickyResizeHandler = handleResize
    })

    // Автоматически пересчитывать позиции при динамическом изменении колонок (fixed/width/enabled)
    watch(() => table.value.header, async () => {
        if (table.value.header.length == 0) return
        resizer.visibleHeader = table.value.header.filter(el => el.enabled)
        nextTick(() => resizer.setFixedLeft())
        nextTick(() => resizer.normalizeToContainerMinWidth())
    })
</script>
