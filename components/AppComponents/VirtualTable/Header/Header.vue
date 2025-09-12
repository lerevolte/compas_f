<template>
    <div class="table__header">
        <div class="table__row" ref="headerRowRef">
            <div 
                v-for="(column, idx) in table.visibleColumns" 
                class="table__cell" 
                :class="{'table__cell_hide-text': column.width.replace('px', '') < 50, 'table__cell_sort': column.key == table.sortItem.sort_field}"
                :key="column.key" 
                :style="`--cell-size: ${column.width}`"
                :data-column-key="column.key"
                :data-idx="idx"
                @click="(event) => doubleClick(event)"
            >
                <span 
                    class="table__cell-border"
                    @mousedown.prevent="(e) => resizer.onRightResizeMouseDown(e, idx)"
                />
                <AppCheckbox 
                    v-if="column.key == 'isChoose'"
                    v-model="column.value"
                    :options="{title: column.title}"
                    @update:model-value="table.chooseAll(column.value)"
                />
                <span class="text" v-else>
                    {{ column.title }}
                </span>

                <IconSort v-if="column.key == table.sortItem.sort_field" :class="{'icon_sort_up': table.sortItem.sort_order == 'asc'}"/>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Header.scss'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import IconSort from '@AppIcons/Table/Sort.vue'
    import { throttle } from 'lodash'
    import { Common } from '@/helpers/classes.js'

    const table = inject('table')
    const tableRef = inject('tableRef')

    const MIN_COLUMN_WIDTH = 40

    class Resize {
        constructor() {
            this.isResizing = ref(false)
            this.startClientX = 0
            this.startWidthPx = 0
            this.resizingColumnIdx = -1
            this.choosed = ref({ list: [], headerColumn: null })

            this.onMouseMove = this.onMouseMove.bind(this)
            this.onMouseUp = this.onMouseUp.bind(this)
            this.SCROLLBAR_COMPENSATION = 15
        }

        /** Старт ресайза */
        onRightResizeMouseDown(e, idx) {
            this.isResizing.value = true
            this.resizingColumnIdx = idx
            this.startClientX = e.clientX
            this.startWidthPx = this.parseWidthToPx(table.value.visibleColumns[idx].width)

            tableRef.value.classList.add('table_resize')

            this.choosed.value.list = tableRef.value.querySelectorAll(`.table__cell[data-column-key="${table.value.visibleColumns[idx].key}"]`)
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
            // Модель уже обновлена во время ресайза через setColumnWidth

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
            table.value.isChanged = true
            this.normalizeToContainerMinWidth()
        }

        /** Обработка движения мыши */
        onMouseMove(e) {
            if (!this.isResizing.value || this.resizingColumnIdx < 0) return
            const delta = e.clientX - this.startClientX
            this.setWidthPx(this.resizingColumnIdx, this.startWidthPx + delta)
            // Во время ресайза поддерживаем минимальную ширину контейнера
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

        /** Установка ширины колонки по индексу */
        setWidthPx(idx, px) {
            if (!table?.value?.visibleColumns?.[idx]) return
            const newPx = Math.max(MIN_COLUMN_WIDTH, Math.round(px))
            const colKey = table.value.visibleColumns[idx].key
            this.setColumnWidth(colKey, newPx)
        }

        /** Применить ширину к колонке (модель + DOM) */
        setColumnWidth(columnKey, widthPx) {
            const newPx = Math.max(MIN_COLUMN_WIDTH, Math.round(widthPx))
            const column = table.value.visibleColumns.find(c => c.key === columnKey)
            if (column) column.width = `${newPx}px`

            const tableEl = tableRef?.value
            if (!tableEl) return
            const cells = tableEl.querySelectorAll(`.table__cell[data-column-key="${columnKey}"]`)
            cells.forEach(cell => {
                cell.style.setProperty('--cell-size', `${newPx}px`)
                if (newPx <= 50) {
                    cell.classList.add('table__cell_hide-text')
                } else {
                    cell.classList.remove('table__cell_hide-text')
                }
            })
        }

        /** Текущая минимальная ширина контейнера таблицы */
        getContainerWidth() {
            const tableEl = tableRef?.value
            if (!tableEl) return 0
            const cw = tableEl.clientWidth || 0
            return cw > 0 ? Math.max(0, cw - this.SCROLLBAR_COMPENSATION) : 0
        }

        /** Получить массив текущих ширин колонок в пикселях */
        getCurrentWidthsPx(useDomCurrent = false) {
            const tableEl = tableRef?.value
            return table.value.visibleColumns.map(col => {
                if (useDomCurrent && tableEl) {
                    const cell = tableEl.querySelector(`.table__cell[data-column-key="${col.key}"]`)
                    const cssVar = cell?.style?.getPropertyValue('--cell-size')?.trim()
                    if (cssVar) {
                        const px = parseInt(cssVar.replace('px', ''))
                        if (Number.isFinite(px)) return px
                    }
                }
                return this.parseWidthToPx(col.width)
            })
        }

        /** Пропорционально увеличивает ширины колонок, если их сумма меньше ширины контейнера */
        normalizeToContainerMinWidth(useDomCurrent = false) {
            if (!Array.isArray(table?.value?.visibleColumns)) return

            const containerWidth = this.getContainerWidth()
            if (containerWidth <= 0) return

            const currentWidthsPx = this.getCurrentWidthsPx(useDomCurrent)
            const sumWidths = currentWidthsPx.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0)

            if (sumWidths <= 0 || sumWidths >= containerWidth) return

            const scale = containerWidth / sumWidths
            let accumulated = 0

            table.value.visibleColumns.forEach((col, index) => {
                const base = currentWidthsPx[index] || 0
                const isLast = index === table.value.visibleColumns.length - 1
                const proposed = isLast ? (containerWidth - accumulated) : Math.round(base * scale)
                const newWidth = Math.max(MIN_COLUMN_WIDTH, proposed)
                accumulated += newWidth
                this.setColumnWidth(col.key, newWidth)
            })

            table.value.isChanged = true
        }

        /** Очистка обработчиков */
        clear() {
            window.removeEventListener('mousemove', this.onMouseMove)
            window.removeEventListener('mouseup', this.onMouseUp)
            document.body.classList.remove('body_resize')
        }
    }

    const resizer = new Resize()
    const common = new Common()

    const doubleClick = common.useDoubleClick((event) => {
        table.value.sort(table.value.visibleColumns[event.getAttribute('data-idx')])
    })
 
    onBeforeUnmount(() => {
        resizer.clear()
    })

    onMounted(() => {
        nextTick(() => resizer.normalizeToContainerMinWidth())
    })
</script>
