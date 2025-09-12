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
            const colKey = table.value.visibleColumns[this.resizingColumnIdx].key
            const findedColumn = table.value.visibleColumns.find(el => el.key === colKey)
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
            table.value.isChanged = true
        }

        /** Обработка движения мыши */
        onMouseMove(e) {
            if (!this.isResizing.value || this.resizingColumnIdx < 0) return
            const delta = e.clientX - this.startClientX
            this.setWidthPx(this.resizingColumnIdx, this.startWidthPx + delta)
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
            if (!table?.value?.visibleColumns?.[idx]) return
            const newPx = Math.max(MIN_COLUMN_WIDTH, Math.round(px))
            
            
            if (newPx <= 50) {
                this.choosed.value.headerColumn.classList.add('table__cell_hide-text')
            } else {
                this.choosed.value.headerColumn.classList.remove('table__cell_hide-text')
            }

            this.choosed.value.list.forEach(el => {
                el.style.setProperty('--cell-size', `${newPx}px`)
            })
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
</script>
