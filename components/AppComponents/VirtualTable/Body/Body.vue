<template>
        <draggable
            v-if="table.rowVirtualizer"
            tag="div"
            :group="{
                name: props.options?.group ?? 'table',
                pull: !props.options?.isDisablePull ?? true,
                put: !props.options?.isDisablePut ?? true
            }"
            :sort="!props.options?.isDisableSort"
            v-model="rows" 
            :handle="table.options?.isDraggable && table.state != 'edit' && !isMobile ? table.options?.draggableTarget ?? '.table__row' : 'null'"
            :forceFallback="true"
            :fallbackOnBody="true"
            :delay="props.options?.dragDelay ?? 120"
            :delayOnTouchOnly="props.options?.dragDelayOnTouchOnly ?? false"
            :touchStartThreshold="props.options?.touchStartThreshold ?? 3"
            :scroll="false"
            :bubbleScroll="false"
            :item-key="getItemKey"
            class="table__body" 
            drag-class="draggable-drag"
            ghost-class="draggable-ghost"
            fallback-class="draggable-fallback"
            :class="{
                'table__body_edit': table.state == 'edit', 
                'table__body_choose': table.body.filter(row => row.isChoose).length > 0, 
                'table__body_saving': table.saving,
                'table__body_dragging': table.isDragging
            }"
            :move="onMoveCheck"
            @start="event => {draggableRow = event.item; table.dragStart(event)}"
            @end="event => dragEnd(event)"
            @change="event => table.changeDrag(event)"
        >
            <template #item="{ element: row, index }">
                <div
                    :key="row.key"
                    class="table__row"
                    :ref="el => el && !table.isDragging && table.rowVirtualizer.measureElement(el)"
                    :data-index="row.index"
                    :data-id="row.original?.id"
                    :data-height="row.size"
                    :style="table.isDragging ? `position: relative; top: 0; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : '#FFF'};` : `--row-start: ${row.start}px; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : '#FFF'};`"
                    :class="{
                        'table__row_hidden': table.options?.isHaveLocalFilter && !checkEnabledRow(table.body[row.index]),
                        'table__row_socket-change': table.body[row.index] && table.body[row.index].socketChange,
                        'table__row_clicked': table.body[row.index] && table.body[row.index].clicked, 
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
                        <AppCheckbox 
                            v-else-if="column.key == 'clicked' && table.body[row.index]"
                            v-model="table.body[row.index].clicked"
                        />
                        <AppCheckbox 
                            v-else-if="column.key == 'active' && table.body[row.index]"
                            v-model="table.body[row.index].active"
                            @update:modelValue="() => {
                                emit('changeActive', {
                                    ...table.body[row.index],
                                    slug: table.slug
                                })
                            }" 
                        />
                        <AppShowMore
                            v-else-if="column.key == 'actions' && table.body[row.index]"
                            :options="table.options.isTrash
                                ? cell.actions.trash
                                : table.slug == 'products'
                                    ? cell.actions.products
                                    : table.body[row.index].edit ? cell.actions.edit : cell.actions.default"
                            @initClick="action => table[action](table.body[row.index], table.slug)"
                        />

                        <template v-else-if="column.key == 'iconDrag'">
                            <IconDrag 
                                class="table__icon-drag"
                            />
                            {{ index + 1}}
                        </template>

                        <IconClose 
                            v-else-if="column.key == 'iconDelete'"
                            class="table__icon-delete"
                            @click="() => localDelete(table.body[row.index])"
                        />

                        <AppRelation  
                            v-else-if="column.type == 'relation' && table.body[row.index]"
                            :options="{
                                id: `${row.index}_${column.key}`,
                                title: null,
                                edit: table.body[row.index] && !column.read_only && (table.body[row.index]?.edit || table.options.isPermanentEdit),
                                type: column.type,
                                relation_type: table.slug == 'products' ? 'products' : null,
                                list: column.options,
                                slug: column.related_table,
                                name: column.key,
                                relation: column.id,
                                searchable: true,
                                required: false,
                                isHaveNull: true,
                                multiple: column.is_plural,
                                visibleCount: props.options?.isShort ? 0 : 5,
                                placeholder: '' 
                            }"
                            v-model="cell.useCellModel(row.index, column).value"
                            @clickLink="id => table.open({id, related_table: column.related_table})"
                            @create="item => table.create(column.related_table)"
                            @showAll="() => table.open({id: table.body[row.index].id, related_table: table.slug, tab_slug: column.related_table})"
                            @update:model-value="val => table.slug == 'products' && getRow(val, table.body[row.index])"
                            @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
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


                        <template v-else-if="table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit)" >
                            <AppInput
                                v-if="['text', 'number'].includes(column.type)" 
                                :model-value="cell.useCellModel(row.index, column).value"
                                @update:model-value="val => cell.useCellModel(row.index, column).value = val"
                                @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
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
                                    edit: table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit),
                                    searchable: false,
                                    required: false,
                                    isHaveNull: true,
                                    multiple: column.is_plural,
                                    placeholder: '' 
                                }"
                                v-model="cell.useCellModel(row.index, column).value"
                                @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
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
                                :isPreventBottom="props.options.isShort"
                                v-model="cell.useCellModel(row.index, column).value"
                                @open="event => cell.setActiveCell({currentTarget: event.closest('.table__cell')}, row.index, column.key)"
                            />

                            <AppStatus
                                v-else-if="column.type == 'status'"
                                :parentContainer="sectionRef"
                                :options="{
                                    id: `${row.index}_${column.key}`,
                                    field_id: column.id,
                                    title: null,
                                    type: column.type,
                                    list: column.options,
                                    name: column.key,
                                    relation: null,
                                    edit: table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit),
                                    required: false,
                                    isHaveNull: true,
                                    isCanCreate: column.can_create ?? false,
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

                        <div class="table__cell-content" v-else-if="table.body[row.index] && (!table.body[row.index].edit || column.read_only)">
                            <span class="table__text text" v-if="['text', 'number'].includes(column.type) && (!column.is_external_link || !table.body[row.index][column.key]?.external_link)">
                                {{ cell.useCellModel(row.index, column).value }}<span class="table__unit" v-if="column.unit && cell.useCellModel(row.index, column).value"> {{ column.unit }}</span>
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

                            <span class="table__text text" v-else-if="column.type == 'json'" v-html="cell.useCellModel(row.index, column).value"></span>

                            <AppStatus
                                v-else-if="column.type == 'status'"
                                :options="{
                                    id: `${row.index}_${column.key}`,
                                    field_id: column.id,
                                    title: null,
                                    type: column.type,
                                    edit: table.body[row.index] && table.body[row.index].edit,
                                    list: column.options,
                                    name: column.key,
                                    required: false,
                                    isHaveNull: false,
                                    isCanCreate: column.can_create ?? false,
                                    placeholder: ''
                                }"
                                :model-value="cell.useCellModel(row.index, column).value"
                            />
                        </div>
                    </div>
                </div>
            </template>
        </draggable> 
</template>

<script setup>
    import './Body.scss';
    import draggable from 'vuedraggable'; 

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
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import IconClose from '@AppIcons/Close.vue'
    import { Common } from '@/helpers/classes.js'
    import { format } from 'date-fns'
    import isEqual from 'lodash/isEqual'
    import { useMediaQuery } from '@vueuse/core'

    const table = inject('table')
    const sectionRef = inject('sectionRef')
    const common = new Common()
    const draggableRow = ref(null)
    const tableRef = inject('tableRef')
    const isMobile = ref(useMediaQuery('(max-width: 990px)'))

    const emit = defineEmits([
        'choseRow',
        'changeActive',
        'getData'
    ])

    const props = defineProps({
        options: {
            default: {},
            type: Object
        }
    })

    const doubleClick = common.useDoubleClick((elem, event) => {
        let cell = event.target.closest('.table__cell')

        if (table.value.state == 'edit' || table.value.options?.isPermanentEdit || (cell && ['isChoose'].includes(cell.getAttribute('data-column-key')))) return
        if (event.target.closest('.show-more')) return
        // Support both Element and Event inputs
        const el = elem?.getAttribute ? elem : (elem?.currentTarget || elem?.target)
        const rowIndex = el?.getAttribute ? el.getAttribute('data-index') : null
        if (rowIndex != null) {
            table.value.open(table.value.body[rowIndex], table.value.slug)
        }
    }, (elem, event) => {
        let cell = event.target.closest('.table__cell')
        if (table.value.state == 'edit' || table.value.options?.isPermanentEdit || (cell && ['isChoose', 'actions'].includes(cell.getAttribute('data-column-key')))) return
        const el = elem?.getAttribute ? elem : (elem?.currentTarget || elem?.target)
        const rowIndex = el?.getAttribute ? el.getAttribute('data-index') : null
        if (table.value.body[rowIndex]?.clicked) return

        table.value.body = table.value.body.map((item, index) => {
            return {
                ...item,
                clicked: table.value.body[rowIndex]?.id == item.id ? true : false
            }
        })
        

        emit('choseRow', {
            ...table.value.body[rowIndex],
            slug: table.value.slug
        })
    }, 200, emit)

    class Cell {
        constructor() {
            this.actions = {
                default: [
                    {
                        name: 'Открыть',
                        action: 'open',
                        enabled: true
                    },    
                    {
                        name: 'Редактировать',
                        action: 'edit',
                        enabled: true
                    },
                    {
                        name: 'Скопировать',
                        action: 'copy',
                        enabled: true
                    },
                    {
                        name: 'Скопировать ссылку',
                        action: 'copyLink',
                        enabled: true
                    },
                    {
                        name: 'Скопировать внешнюю ссылку',
                        action: 'copyExternalLink',
                        enabled: true
                    },
                    {
                        name: 'Удалить',
                        action: 'initDelete',
                        enabled: true
                    }
                ],
                edit: [
                    {
                        name: 'Сохранить',
                        action: 'save',
                        enabled: true
                    },
                    {
                        name: 'Отмена',
                        action: 'cancel',
                        enabled: true
                    },
                    {
                        name: 'Удалить',
                        action: 'initDelete',
                        enabled: true
                    }
                ],
                trash: [
                    {
                        name: 'Открыть',
                        action: 'open',
                        enabled: true
                    },
                    {
                        name: 'Восстановить',
                        action: 'initRestore',
                        enabled: true
                    },
                ],
                // Колонка действий в order_products — только два пункта.
                // Удалять надо локально (таблица локальная), а не дергать API.
                products: [
                    {
                        name: 'Посмотреть',
                        action: 'open',
                        enabled: true
                    },
                    {
                        name: 'Удалить',
                        action: 'localDelete',
                        enabled: true
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

                    if (table.value.slug == 'products' && column.key == 'product_sum') {
                        return  common.transformPrice(table.value.body[rowIndex]?.product_price * table.value.body[rowIndex]?.product_count, 0) 
                    } else if (column.type == 'address') {
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
            if (!table.value.body[rowIndex]) return

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

        checkEditting(row, prevValue) {
            if (row.edit) return

            if (table.value.slug == 'products') {
                table.value.backupLocalBody()
            } else {
                table.value.backup.body = JSON.parse(JSON.stringify([...table.value.backup.body, row]))
            }
            // Раньше тут ставили row.isChoose = true, и чекбокс выделения
            // визуально включался при любой правке поля в строке. Теперь
            // isChoose отвечает только за явный клик пользователя на чекбокс.
            row.edit = true
            table.value.state = 'edit'
        }
    }

    const cell = new Cell()

    const getItemKey = (item) => {
        // Используем original если доступен (реальные данные строки), иначе сам item
        const rowData = item.original || item
        // Используем id, local_id или комбинацию slug + index как уникальный ключ
        return rowData.id ?? rowData.local_id ?? `${table.value.slug}_${item.index ?? item.key}`
    }

    const rows = computed({
        get() {
            // Во время перетаскивания показываем все элементы для корректного позиционирования
            if (table.value.isDragging) {
                // Используем фиксированную высоту для всех элементов во время перетаскивания
                // Это обеспечит плавное перетаскивание без лагов
                const estimatedHeight = 50
                return table.value.body.map((item, index) => {
                    return {
                        key: `row-${index}`,
                        index: index,
                        start: index * estimatedHeight,
                        size: estimatedHeight,
                        original: item
                    }
                })
            }
            
            if (!table.value.rowVirtualizer) return []
            
            return table.value.rowVirtualizer.getVirtualItems().map(virtualItem => {
                return {
                    ...virtualItem,
                    original: table.value.body[virtualItem.index]
                }
            })
        },
        set(newValue) {
            // Инициализируем body как массив, если он не существует
            if (!table.value.body) {
                table.value.body = []
            }
            
            // Если newValue пустой и таблица пустая, ничего не делаем
            if (!newValue || (newValue.length === 0 && table.value.body.length === 0)) return
            
            // Обрабатываем перетаскивание внутри таблицы или между таблицами
            const reorderedBody = []
            
            for (const virtualItem of newValue) {
                let rowData = null
                
                // Если есть original, значит это виртуальный элемент из текущей таблицы - используем original
                if (virtualItem && virtualItem.original !== undefined && virtualItem.original !== null) {
                    rowData = virtualItem.original
                }
                // Проверяем если это реальный объект строки из другой таблицы
                else if (typeof virtualItem === 'object' && virtualItem !== null) {
                    // Проверяем наличие полей реальных данных строки (id, local_id и т.д.)
                    // И отсутствие виртуальных свойств или их наличие только как undefined
                    const hasRealData = virtualItem.id !== undefined || 
                                       virtualItem.local_id !== undefined ||
                                       (Object.keys(virtualItem).length > 0 && 
                                        Object.keys(virtualItem).some(key => {
                                            // Игнорируем виртуальные свойства
                                            if (['index', 'start', 'size', 'key', 'original'].includes(key)) {
                                                return false
                                            }
                                            // Если есть любое другое поле со значением, это данные строки
                                            return virtualItem[key] !== undefined
                                        }))
                    
                    // Если есть реальные данные и нет original (или original undefined/null), это объект из другой таблицы
                    if (hasRealData && (virtualItem.original === undefined || virtualItem.original === null)) {
                        // Убираем виртуальные свойства если они есть
                        const { index, start, size, key, original, ...cleanData } = virtualItem
                        rowData = cleanData
                    }
                    // Если index есть и соответствует индексу в текущей таблице (перетаскивание внутри таблицы)
                    else if (virtualItem.index !== undefined && virtualItem.index >= 0 && virtualItem.index < table.value.body.length) {
                        rowData = table.value.body[virtualItem.index]
                    }
                }
                
                if (rowData) {
                    reorderedBody.push(rowData)
                }
            }

            // Обновляем body только если получили валидные данные
            if (reorderedBody.length > 0) {
                // Если количество элементов совпадает с текущим (перетаскивание внутри таблицы)
                if (reorderedBody.length === table.value.body.length && table.value.body.length > 0) {
                    // Быстрая проверка, изменился ли порядок
                    let hasChanged = false
                    for (let i = 0; i < reorderedBody.length; i++) {
                        const newId = reorderedBody[i].id ?? reorderedBody[i].local_id
                        const oldId = table.value.body[i]?.id ?? table.value.body[i]?.local_id
                        if (newId !== oldId) {
                            hasChanged = true
                            break
                        }
                    }
                    if (hasChanged) {
                        table.value.body = reorderedBody
                    }
                } else {
                    // Если количество изменилось (межтабличное перетаскивание или добавление в пустую таблицу)
                    table.value.body = reorderedBody
                    // Обновляем виртуализатор после изменения body
                    nextTick(() => {
                        if (table.value.rowVirtualizer) {
                            table.value.initVirtualizer()
                        }
                    })
                }
            }
        }
    })

    const localDelete = (row) => {
        table.value.localDelete(row);
        rows.value = table.value.body.filter(p => p.local_id != row.local_id);
    }

    const onMoveCheck = (evt) => {
        // Разрешаем перемещение - виртуализатор сам управляет позициями
        // Не нужно вручную менять позиции, это вызывает конфликт с виртуализатором
        if (typeof props.options?.onMove === 'function') {
            const result = props.options.onMove(evt)
            if (result === false) return false
        }
        return true;
    };

    const dragEnd = (event) => {
        // Не нужно вручную пересчитывать позиции - виртуализатор сделает это автоматически
        // через changeDrag -> initVirtualizer() который уже вызывается при изменении порядка
        draggableRow.value = null
        table.value.dragEnd(event)
    }

    const getRow = (val, row) => {
        const activeOption = val.localOptions.find(option => option.value == val.value[0])?.label
        if (!activeOption) return

        // Подтягиваем поля выбранного товара. label может прийти как с числовыми
        // полями (count/weight/price) — кладём их в product_-варианты,
        // остальные ключи копируем в row напрямую.
        for (let key in row) {
            if (key in activeOption) {
                if (["count", "weight", "price"].includes(key)) {
                    row[`product_${key}`] = activeOption[key];
                } else {
                    row[key] = activeOption[key];
                }
            }
        }
        // Явно подхватываем числовые поля даже если ключа нет в row.
        if (activeOption.price !== undefined) row.product_price = activeOption.price
        if (activeOption.count !== undefined) row.product_count = activeOption.count
        if (activeOption.weight !== undefined) row.product_weight = activeOption.weight

        row.name = activeOption.text
        row.product_name = activeOption.text

        // Без этого панель сохранения не появляется при добавлении товара
        // (isChoosed-computed смотрит на edit / isChoose).
        row.edit = true
        if (table.value.state !== 'edit') {
            table.value.state = 'edit'
        }
    }
    
    const checkEnabledRow = (row) => {
        if (table.value.options.localFilter.state) {
            return table.value.options.localFilter.value.find(option => isEqual(option, row.address?.coords))
        } else {
            return true
        }
    }

    // Очищаем кэш при изменении данных таблицы
    watch(() => table.value.body, () => {
        cell.clearCache()
    }, { deep: true })
</script>