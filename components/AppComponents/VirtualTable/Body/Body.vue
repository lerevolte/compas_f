<template>
    <div 
        v-if="table.rowVirtualizer"
        class="table__body" 
        :class="{'table__body_edit': table.state == 'edit', 'table__body_choose': table.body.filter(row => row.isChoose).length > 0, 'table__body_saving': table.saving}"
    >
        <div 
            v-for="(row, index) in table.rowVirtualizer.getVirtualItems()" 
            :key="row.key" 
            class="table__row"
            :ref="el => el && table.rowVirtualizer.measureElement(el)" 
            :data-index="row.index"
            :style="`--row-start: ${row.start}px; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : '#FFF'}`"
            :class="{
                'table__row_edit': table.body[row.index] && table.body[row.index].edit, 
                'table__row_choose': table.body[row.index] && table.body[row.index].isChoose
            }"
            @click="(event) => doubleClick(event)"
        >
            <div 
                v-for="column in table.header" 
                class="table__cell" 
                :class="{ 
                    'table__cell_loading': table.loading,
                    'table__cell_fixed': column.fixed,
                    'table__cell_hide': !column.enabled,
                }"
                :data-column-key="column.key" 
                :key="`row-${index}_${column.key}`" 
                :style="`--cell-size: ${column.width}; --cell-left: ${column.left ?? 0}px;`"
                @click="(event) => cell.setActiveCell(event, row.index)"
            >
                <span class="table__label">
                    {{ column.title }}
                </span>

                <AppCheckbox 
                    v-if="column.key == 'isChoose' && table.body[row.index]"
                    v-model="table.body[row.index].isChoose"
                />
                <AppShowMore 
                    v-else-if="column.key == 'actions' && table.body[row.index]"
                    :options="table.body[row.index].edit ? cell.actions.edit : cell.actions.default"
                    @initClick="action => table[action](table.body[row.index])"
                />

                <AppRelation  
                    v-else-if="column.type == 'relation' && table.body[row.index]"
                    :parentContainer="sectionRef"
                    :options="{
                        id: `${row.index}_${column.key}`,
                        title: null,
                        edit: table.body[row.index]?.edit,
                        type: column.type,
                        list: column.options,
                        name: column.key,
                        relation: column.id,
                        searchable: true,
                        required: false,
                        isHaveNull: true,
                        multiple: column.is_plural,
                        placeholder: '' 
                    }"
                    v-model="cell.useCellModel(row.index, column).value"
                    @clickLink="id => table.open({id, slug: column.related_table})"
                    @create="item => table.create(item)"
                />

                <div class="table__cell-content" v-else-if="column.type == 'file' && table.body[row.index]">
                    <AppFansyBox class='table__text-group_file table__file'>
                        <template v-if="Array.isArray(table.body[row.index][column.key]) && table.body[row.index][column.key].length">
                            <AppFansyBoxItem 
                                v-for="file in table.body[row.index][column.key]"
                                :style="`--count-files: '${table.body[row.index][column.key].length}'`"
                                :id="`${row.index}_${column.key}`"
                                :image="{
                                    path: file.file,
                                    thumbnail_path: file.url,
                                }"
                            />
                        </template>
                    </AppFansyBox>
                </div>

                <template v-else-if="table.body[row.index] && table.body[row.index].edit" >
                    <AppInput
                        v-if="column.type == 'text'" 
                        :model-value="cell.useCellModel(row.index, column).value"
                        @update:model-value="val => cell.useCellModel(row.index, column).value = val"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: column.type,
                            name: column.key,
                            placeholder: null,
                            mask: column.mask ?? null
                        }"
                    />
                    <AppSelect 
                        v-else-if="column.type == 'select_dropdown'" 
                        :parentContainer="sectionRef"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: column.type,
                            list: column.options,
                            name: column.key,
                            relation: null,
                            edit: table.body[row.index].edit,
                            searchable: false,
                            required: false,
                            isHaveNull: true,
                            multiple: column.is_plural,
                            placeholder: '' 
                        }"
                        v-model="cell.useCellModel(row.index, column).value"
                    />

                    <AppDate 
                        v-else-if="column.type == 'date'"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: 'date',
                            name: 'date',
                            multiple: false,
                            placeholder: ''
                        }"
                        v-model="cell.useCellModel(row.index, column).value"
                        @open="event => cell.setActiveCell({currentTarget: event.closest('.table__cell')}, row.index, column.key)"
                    />

                    <AppStatus 
                        v-else-if="column.type == 'status'"
                        :parentContainer="sectionRef"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: column.type,
                            list: column.options,
                            name: column.key,
                            relation: null,
                            edit: table.body[row.index] && table.body[row.index].edit,
                            required: false,
                            isHaveNull: true,
                            placeholder: '' 
                        }"
                        v-model="cell.useCellModel(row.index, column).value"
                    />

                    <AppSelect 
                        v-else-if="column.type == 'address'" 
                        :parentContainer="sectionRef"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: column.type,
                            list: column.options,
                            name: column.key,
                            relation: null,
                            searchable: true,
                            required: false,
                            isHaveNull: true,
                            multiple: false,
                            placeholder: '' 
                        }"
                        v-model="cell.useCellModel(row.index, column).value"
                    />
                </template>

                <div class="table__cell-content" v-else-if="table.body[row.index] && !table.body[row.index].edit" >
                    <span class="table__text text" v-if="['text', 'number'].includes(column.type) && (!column.is_external_link || !table.body[row.index][column.key]?.external_link)">
                        {{ cell.useCellModel(row.index, column).value }}
                    </span>

                    <a :href="cell.useCellModel(row.index, column, 'external_link').value" target="_blank" class="table__text text" v-else-if="column.type == 'text' && column.is_external_link">
                        {{ cell.useCellModel(row.index, column, 'value').value }}
                    </a>

                    <div class="table__text-group"  v-else-if="column.type == 'address'">
                        <span class="table__text text">
                            {{ cell.useCellModel(row.index, column).value?.text }}
                        </span>
                        <AppButton 
                            v-show="cell.useCellModel(row.index, column).value != null" 
                            class="button_text button_copy" 
                            @click="event => cell.copyText(cell.useCellModel(row.index, column).value?.text, event.target)"
                        />
                    </div>

                    <span class="table__text text" v-else-if="column.type == 'date'">
                        {{ cell.useCellModel(row.index, column).value ? format(cell.useCellModel(row.index, column).value, 'dd.MM.yyyy') : null }}
                    </span>

                    <span class="table__text text" v-else-if="column.type == 'select_dropdown'">
                        {{ cell.useCellSelectModel(row.index, column).value }}
                    </span>

                    <AppStatus 
                        v-else-if="column.type == 'status'"
                        :options="{
                            id: `${row.index}_${column.key}`,
                            title: null,
                            type: column.type,
                            edit: table.body[row.index] && table.body[row.index].edit,
                            list: column.options,
                            name: column.key,
                            required: false,
                            isHaveNull: false,
                            placeholder: '' 
                        }"
                        :model-value="cell.useCellModel(row.index, column).value"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Body.scss';

    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppFansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppFansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import { Common } from '@/helpers/classes.js'
    import { format } from 'date-fns'

    const table = inject('table')
    const sectionRef = inject('sectionRef')
    const common = new Common()

    const doubleClick = common.useDoubleClick((elem, event) => {
        let cell = event.target.closest('.table__cell')
        
        if (table.value.state == 'edit' || ['isChoose', 'actions'].includes(cell.getAttribute('data-column-key'))) return
        // Support both Element and Event inputs
        const el = elem?.getAttribute ? elem : (elem?.currentTarget || elem?.target)
        const rowIndex = el?.getAttribute ? el.getAttribute('data-index') : null
        if (rowIndex != null) {
            table.value.open(table.value.body[rowIndex], table.value.slug)
        }
    })

    class Cell {
        constructor() {
            this.actions = {
                default: [
                    {
                        name: 'Открыть',
                        action: 'open'
                    },    
                    {
                        name: 'Редактировать',
                        action: 'edit'
                    },
                    {
                        name: 'Скопировать',
                        action: 'copy'
                    },
                    {
                        name: 'Удалить',
                        action: 'initDelete'
                    }
                ],
                edit: [
                    {
                        name: 'Сохранить',
                        action: 'save'
                    },
                    {
                        name: 'Отмена',
                        action: 'cancel'
                    },
                    {
                        name: 'Удалить',
                        action: 'initDelete'
                    }
                ]
            }
            this.activeCell = null
            this._modelCache = new Map()
            this._selectCache = new Map()
        }

        // Очистка кэша
        clearCache() {
            this._modelCache.clear()
            this._selectCache.clear()
        }

        // Получение значения (с кэшем computed)
        useCellModel(rowIndex, column, slug = 'value') {
            const cacheKey = `${rowIndex}__${column.key}__${slug}`
            if (this._modelCache.has(cacheKey)) return this._modelCache.get(cacheKey)

            const c = computed({
                get() {
                    // Проверяем что строка существует
                    if (!table.value.body[rowIndex]) {
                        return null
                    }
                    
                    const cell = table.value.body[rowIndex][column.key]
                    if (column.type == 'address') {
                        return cell
                    } else if (Array.isArray(cell)) {
                        return cell
                    } else if (column.type == 'relation') {
                        return cell ?? null
                    } else {
                        return typeof cell === 'object' && cell !== null ? cell[slug] : cell
                    }
                },
                set(val) {
                    // Проверяем что строка существует
                    if (!table.value.body[rowIndex]) {
                        return
                    }
                    
                    const cell = table.value.body[rowIndex][column.key]

                    if (column.type == 'address') {
                        table.value.body[rowIndex][column.key] = val
                    }  else if (column.type == 'relation') {
                        table.value.body[rowIndex][column.key] = val
                    }
                     else if (typeof cell === 'object' && cell !== null) {
                        if (slug in cell) {
                            cell[slug] = val
                        } else if ('value' in cell) {
                            cell.value = val
                        } else {
                            table.value.body[rowIndex][column.key] = val
                        }
                    } else {
                        table.value.body[rowIndex][column.key] = val
                    }
                }
            })
            this._modelCache.set(cacheKey, c)
            return c
        }

        // Получение значений для выпадающих списков (с кэшем)
        useCellSelectModel(rowIndex, column) {
            const cacheKey = `${rowIndex}__${column.key}__select`
            if (this._selectCache.has(cacheKey)) return this._selectCache.get(cacheKey)

            const c = computed({
                get() {
                    // Проверяем что строка существует
                    if (!table.value.body[rowIndex]) {
                        return null
                    }
                    
                    const cell = table.value.body[rowIndex][column.key]
                    let response = null
                    
                    if (cell == null) return null
                    if (Array.isArray(cell)) response = column.options.filter(option => cell.includes(option.value)).map(option => option.label)
                    else if (typeof cell == 'object' && cell !== null) response = column.options.filter(option => option.value == cell.value).map(option => option.label)
                    else response = column.options.filter(option => option.value == cell).map(option => option.label)
                
                    if (column.type == 'select_dropdown') {
                        return response.join(', ')
                    } 
                    return response
                }
            })
            this._selectCache.set(cacheKey, c)
            return c
        }

        // Копирование текста
        copyText(value, buttonRef) {
            buttonRef.classList.add('button_copy_active')
            common.copyText(value)

            setTimeout(() => {
                buttonRef.classList.remove('button_copy_active')
            }, 3000);
        }

        // Установка z-index на кликнутую ячейку
        setActiveCell(event, rowIndex) {
            if (!table.value.body[rowIndex].edit && !event.target.closest('.show-more')) return
            
            // Снимаем класс у предыдущей
            if (this.activeCell) {
                if (this.activeCell.closest('.table__row')) {
                    this.activeCell.closest('.table__row').classList.remove('table__row_active')
                }
                this.activeCell.classList.remove('table__cell_active')
            }

            // Добавляем на новую
            const cellEl = event.currentTarget
            cellEl.classList.add('table__cell_active')
            cellEl.closest('.table__row').classList.add('table__row_active')
            this.activeCell = cellEl
        }
    }

    const cell = new Cell()

    // Очищаем кэш при изменении данных таблицы
    watch(() => table.value.body, () => {
        cell.clearCache()
    }, { deep: true })
</script>