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
            :filter="props.options?.dragFilter ?? '.table__cell-content, .blank__text, .blank__link, input, textarea, select, [contenteditable]'"
            :preventOnFilter="false"
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
            @start="handleDragStart"
            @end="event => dragEnd(event)"
            @change="event => table.changeDrag(event)"
        >
            <template #item="{ element: row, index }">
                <div
                    :key="row.key"
                    class="table__row"
                    :ref="el => el && !table.isDragging && !props.options?.isShort && table.rowVirtualizer && table.rowVirtualizer.measureElement(el)"
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

        // Во внешней ссылке деталку по двойному клику не открываем.
        if (table.value.options?.isExternal) return
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

        // Мутируем .clicked у каждой строки in-place вместо body.map() с
        // пересборкой массива. body.map создаёт новые объекты, и хотя массив
        // становится новым, Vue в виртуализированной таблице иногда не успевал
        // переотрисовать чекбоксы в `clicked`-колонке у строк, которые ушли
        // из видимой области виртуализатора — старая галочка визуально
        // оставалась. Прямая мутация реактивного свойства гарантирует
        // обновление всех потребителей.
        const targetId = table.value.body[rowIndex]?.id
        for (const row of table.value.body) {
            if (!row) continue
            const isMatch = row.id == targetId
            if (!!row.clicked !== isMatch) row.clicked = isMatch
        }

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
                // Колонка действий в order_products — только удалить.
                // "Посмотреть" убрали по запросу: в контексте задачи
                // переход на карточку товара не нужен.
                products: [
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

            // isCellCopy: вне режима редактирования клик выделяет ячейку,
            // её значение можно скопировать по Ctrl+C (см. onCopyKeydown).
            const isCopySelect = table.value.options?.isCellCopy && !table.value.body[rowIndex].edit

            if (!table.value.body[rowIndex].edit && !event.target.closest('.show-more') && !isCopySelect) return

            // Снимаем класс у предыдущей
            if (this.activeCell) {
                if (this.activeCell.closest('.table__row')) {
                    this.activeCell.closest('.table__row').classList.remove('table__row_active')
                }
                this.activeCell.classList.remove('table__cell_active')
            }

            // copy-select глобально один на страницу: несколько таблиц логистики
            // имеют собственные инстансы Cell, чистим выделение через DOM.
            if (typeof document !== 'undefined') {
                document.querySelectorAll('.table__cell_copy-select').forEach(el => el.classList.remove('table__cell_copy-select'))
            }

            // Добавляем на новую
            const cellEl = event.currentTarget
            cellEl.classList.add('table__cell_active')
            if (isCopySelect && this.isCopyableColumn(cellEl)) {
                cellEl.classList.add('table__cell_copy-select')
            }
            cellEl.closest('.table__row').classList.add('table__row_active')
            this.activeCell = cellEl
        }

        // Колонки, значение которых логично копировать (не чекбоксы/действия)
        isCopyableColumn(cellEl) {
            const key = cellEl?.getAttribute?.('data-column-key')
            const column = table.value.header.find(c => c.key == key)
            return !!column && ['text', 'number', 'date', 'address', 'select_dropdown', 'status', 'json', 'relation'].includes(column.type)
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

            // isShort-таблицы (логистика: «Маршруты», «Задачи логистики», «Задачи
            // в машине» — максимум ~12 строк) НЕ виртуализируем. В их раскладке
            // высота скролл-контейнера .table бывает 0 → у виртуализатора
            // outerSize=0 → getVirtualItems()=[] (calculateRange требует
            // outerSize>0). Из-за этого единственная строка либо не появляется,
            // либо измеряется в 0 и пропадает. Рендерим body напрямую — позиции
            // те же (start=index*50), а видимость больше не зависит от
            // outerSize/measureElement. Для ≤12 строк виртуализация не нужна.
            if (props.options?.isShort && Array.isArray(table.value.body)) {
                const estimatedHeight = 50
                return table.value.body.map((item, index) => ({
                    key: `row-${index}`,
                    index: index,
                    start: index * estimatedHeight,
                    size: estimatedHeight,
                    original: item
                }))
            }

            if (!table.value.rowVirtualizer) return []

            const virtualItems = table.value.rowVirtualizer.getVirtualItems()
            // Фолбэк для таблицы из одной строки: её высота (50px) равна min-height тела,
            // поэтому ResizeObserver не срабатывает и виртуализатор не получает notify —
            // getVirtualItems() остаётся пустым, а строка не отрисовывается (хотя задача
            // привязана к маршруту и видна на карте/в деталке). Если виртуализатор пуст,
            // но в body есть строки — рендерим их напрямую (срабатывает только до первого
            // notify, на больших списках не включается).
            if (virtualItems.length === 0 && Array.isArray(table.value.body) && table.value.body.length > 0) {
                const estimatedHeight = 50
                return table.value.body.map((item, index) => ({
                    key: `row-${index}`,
                    index: index,
                    start: index * estimatedHeight,
                    size: estimatedHeight,
                    original: item
                }))
            }

            return virtualItems.map(virtualItem => {
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
                    let finalBody = reorderedBody

                    // ОТМЕНА (возврат строки в исходную таблицу обычным драгом):
                    // dragOriginBody выставлен только у таблицы-ИСТОЧНИКА (где начался
                    // драг). Если строка вернулась — набор строк совпал с исходным —
                    // возвращаем ИСХОДНЫЙ порядок прямо здесь, ДО emit('addRow')
                    // в changeDrag, чтобы родитель сохранил исходный порядок, а не тот,
                    // куда строку занесли при возврате.
                    if (dragWasGeneral && dragOriginBody) {
                        const curIds = reorderedBody.map(r => r?.id ?? r?.local_id)
                        const origIds = dragOriginBody.map(r => r?.id ?? r?.local_id)
                        const sameSet = curIds.length === origIds.length
                            && [...curIds].sort().join('|') === [...origIds].sort().join('|')
                        if (sameSet) {
                            table.value.body = [...dragOriginBody]
                            nextTick(() => { if (table.value.rowVirtualizer) table.value.initVirtualizer() })
                            return
                        }
                    }

                    // isAppendOnDrop — задача, перетянутая из другой таблицы,
                    // ВСЕГДА добавляется в конец (напр. «Задачи в машине»:
                    // новая точка маршрута = последняя). Sortable вставляет
                    // строку по позиции курсора, поэтому переносим только что
                    // добавленные (которых не было по id в старом body) в конец,
                    // сохраняя порядок остальных.
                    if (props.options?.isAppendOnDrop) {
                        const oldIds = new Set(
                            table.value.body
                                .map(r => r?.id ?? r?.local_id)
                                .filter(x => x != null)
                        )
                        const existing = []
                        const added = []
                        for (const r of reorderedBody) {
                            const rid = r?.id ?? r?.local_id
                            if (rid != null && oldIds.has(rid)) existing.push(r)
                            else added.push(r)
                        }
                        finalBody = [...existing, ...added]
                    }
                    table.value.body = finalBody
                    // Обновляем виртуализатор после изменения body
                    nextTick(() => {
                        if (table.value.rowVirtualizer) {
                            table.value.initVirtualizer()
                        }
                    })
                }
            } else if (
                table.value.isDragging &&
                Array.isArray(newValue) && newValue.length === 0 &&
                Array.isArray(table.value.body) && table.value.body.length > 0
            ) {
                // Перетащили ПОСЛЕДНЮЮ строку в другую таблицу — таблица должна
                // стать пустой. Без этого guard `reorderedBody.length > 0` не
                // давал очистить body, и последняя задача «не убиралась».
                table.value.body = []
                nextTick(() => {
                    if (table.value.rowVirtualizer) {
                        table.value.initVirtualizer()
                    }
                })
            }
        }
    })

    const localDelete = (row) => {
        table.value.localDelete(row);
        rows.value = table.value.body.filter(p => p.local_id != row.local_id);
    }

    // Перетаскивание начато хватом за ручку (.table__icon-drag)? Запоминаем на
    // pointerdown — только хват за ручку разрешает РЕОРДЕР строк внутри таблицы.
    let draggedFromHandle = false
    const onTablePointerDown = (ev) => {
        draggedFromHandle = !!ev.target?.closest?.('.table__icon-drag')
    }

    // Снимок исходного порядка строк и признак «обычного» драга — чтобы при
    // возврате строки в исходную таблицу (отмена) восстановить её на своё место.
    let dragOriginBody = null
    let dragWasGeneral = false
    // Плейсхолдер (строка-ghost) растягивается на ширину КОНТЕНТА таблицы и в
    // горизонтально проскроленной таблице уходил влево за видимую область.
    // Геометрию задаём CSS-переменными на КОНТЕЙНЕРЕ (.table__body), а не
    // inline-стилями на самой строке: у строк строковый :style-биндинг, и
    // любой ре-рендер Vue (например, переключение в режим драга на старте)
    // перезаписывает весь style-атрибут, стирая наши значения. Контейнер
    // :style-биндинга не имеет — переменные переживают любые перерисовки.
    // Правило в VirtualTable.scss применяет их к .draggable-ghost внутри.
    const positionGhostInView = (containerEl) => {
        const scrollEl = containerEl?.closest?.('.table')
        if (!containerEl || !scrollEl) return
        containerEl.setAttribute('data-ghost-fit', '')
        containerEl.style.setProperty('--ghost-width', `${scrollEl.clientWidth}px`)
        containerEl.style.setProperty('--ghost-left', `${scrollEl.scrollLeft}px`)
    }
    const clearGhostFit = () => {
        if (typeof document === 'undefined') return
        document.querySelectorAll('[data-ghost-fit]').forEach(el => {
            el.removeAttribute('data-ghost-fit')
            el.style.removeProperty('--ghost-width')
            el.style.removeProperty('--ghost-left')
        })
    }

    // Исходный DOM-слот перетаскиваемой строки: при возврате в таблицу-источник
    // плейсхолдер возвращается на это место (откуда строку взяли).
    let dragOriginParent = null
    let dragOriginNextEl = null

    const handleDragStart = (event) => {
        draggableRow.value = event.item
        dragOriginBody = Array.isArray(table.value.body) ? [...table.value.body] : null
        dragWasGeneral = !draggedFromHandle
        dragOriginParent = event.from ?? null
        dragOriginNextEl = event.item?.nextElementSibling ?? null
        table.value.dragStart(event)
        lockTableScroll()
        positionGhostInView(event.from)
        adjustDragGhostScroll()
    }

    // Слушатель вешаем нативно на сам скролл-контейнер таблицы: vuedraggable
    // объявляет inheritAttrs:false, поэтому @pointerdown на компоненте не
    // долетает до DOM. Capture-фаза — чтобы сработать до старта Sortable.
    watch(() => tableRef?.value, (el, prev) => {
        if (prev) prev.removeEventListener('pointerdown', onTablePointerDown, true)
        if (el) el.addEventListener('pointerdown', onTablePointerDown, true)
    }, { immediate: true })

    onBeforeUnmount(() => {
        if (tableRef?.value) tableRef.value.removeEventListener('pointerdown', onTablePointerDown, true)
        unlockTableScroll()
    })

    // Ctrl+C / Cmd+C копирует значение выделенной кликом ячейки (isCellCopy).
    // Выделение текста в этих таблицах отключено ради drag&drop со всей строки,
    // поэтому копирование работает через выделение ячейки.
    const onCopyKeydown = (event) => {
        if (!table.value.options?.isCellCopy) return
        if (!(event.ctrlKey || event.metaKey)) return
        // 'с'/'С' — той же клавишей в русской раскладке
        if (!['c', 'C', 'с', 'С'].includes(event.key)) return

        const selected = typeof document !== 'undefined' ? document.querySelector('.table__cell_copy-select') : null
        // Обрабатывает только таблица-владелец выделенной ячейки
        if (!selected || !tableRef?.value || !tableRef.value.contains(selected)) return

        const target = event.target
        if (target && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA' || target.isContentEditable)) return
        // Если пользователь выделил текст где-то ещё — не перехватываем
        if (window.getSelection && window.getSelection().toString()) return

        const content = selected.querySelector('.table__cell-content') ?? selected
        const text = (content.innerText ?? '').trim()
        if (!text) return

        common.copyText(text)
        selected.classList.add('table__cell_copied')
        setTimeout(() => selected.classList.remove('table__cell_copied'), 600)
    }

    onMounted(() => {
        if (typeof document !== 'undefined' && table.value.options?.isCellCopy) {
            document.addEventListener('keydown', onCopyKeydown)
        }
    })
    onBeforeUnmount(() => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', onCopyKeydown)
        }
    })

    // Блокировка скролла таблицы на время перетаскивания БЕЗ сброса позиции:
    // запоминаем текущие scrollTop/scrollLeft и возвращаем их на каждый scroll
    // (Safari иначе «уезжает»). overflow:hidden для этого не годится — он сбрасывает
    // позицию в 0 и призрак строки рисуется «от верха таблицы».
    let scrollLockHandler = null
    let lockedScroll = { top: 0, left: 0 }
    const lockTableScroll = () => {
        const el = tableRef?.value
        if (!el || scrollLockHandler) return
        lockedScroll = { top: el.scrollTop, left: el.scrollLeft }
        scrollLockHandler = () => {
            if (el.scrollTop !== lockedScroll.top) el.scrollTop = lockedScroll.top
            if (el.scrollLeft !== lockedScroll.left) el.scrollLeft = lockedScroll.left
        }
        el.addEventListener('scroll', scrollLockHandler, { passive: true })
    }
    const unlockTableScroll = () => {
        const el = tableRef?.value
        if (el && scrollLockHandler) el.removeEventListener('scroll', scrollLockHandler)
        scrollLockHandler = null
    }

    // Помечаем таблицу-приёмник при межтабличном перетаскивании — её плейсхолдер
    // уходит в конец (см. CSS .table__body_cross-drop). Только для таблиц
    // append-on-drop (куда строка падает в конец).
    const clearCrossDrop = () => {
        if (typeof document === 'undefined') return
        document.querySelectorAll('.table__body_cross-drop').forEach(b => b.classList.remove('table__body_cross-drop'))
    }
    const markCrossDrop = (toEl) => {
        clearCrossDrop()
        if (toEl && toEl.closest && toEl.closest('.table_append-on-drop')) {
            toEl.classList.add('table__body_cross-drop')
        }
    }

    // ── Возврат строки в таблицу-источник ──
    // Sortable вставляет вернувшуюся строку под курсор; следующим кадром
    // физически возвращаем плейсхолдер на исходный DOM-слот (откуда строку
    // взяли). Sortable отслеживает dragEl по ссылке, а не по позиции, поэтому
    // ручное перемещение безопасно — финальный порядок при дропе и так
    // восстанавливает rows-setter/dragEnd по снимку dragOriginBody.
    const restoreGhostToOrigin = (draggedEl) => {
        requestAnimationFrame(() => {
            if (!dragOriginParent || !draggedEl) return
            if (draggedEl.parentNode !== dragOriginParent) return
            if (dragOriginNextEl && dragOriginNextEl.parentNode === dragOriginParent) {
                if (draggedEl.nextElementSibling !== dragOriginNextEl) {
                    dragOriginParent.insertBefore(draggedEl, dragOriginNextEl)
                }
            } else if (dragOriginParent.lastElementChild !== draggedEl) {
                dragOriginParent.appendChild(draggedEl)
            }
        })
    }

    const onMoveCheck = (evt) => {
        if (typeof props.options?.onMove === 'function') {
            const result = props.options.onMove(evt)
            if (result === false) return false
        }

        // Прижимаем плейсхолдер к видимой области таблицы, над которой курсор
        // (источник или приёмник могут быть горизонтально проскролены).
        positionGhostInView(evt.to)

        // ВАЖНО: evt.from у Sortable — всегда таблица, где драг НАЧАЛСЯ
        // (rootEl), даже когда строка сейчас в другой таблице. Поэтому
        // «возврат в источник» — это within-ветка с alreadyInThisTable=false.
        const isWithinSameTable = evt.from === evt.to
        if (isWithinSameTable) {
            clearCrossDrop()
            // Внутри таблицы порядок меняется ТОЛЬКО при хвате за ручку
            // .table__icon-drag. Различаем два случая «within»:
            //  - элемент УЖЕ в этой таблице (dragged.parentNode === to) → это
            //    реордер → обычным драгом запрещаем;
            //  - элемент сейчас в ДРУГОЙ таблице и заходит сюда (вернулся, т.к.
            //    передумал) → это возврат → разрешаем (один заход, дальше он
            //    окажется «в этой таблице» и переставлять им уже нельзя).
            const alreadyInThisTable = evt.dragged && evt.dragged.parentNode === evt.to
            if (!draggedFromHandle) {
                if (alreadyInThisTable) return false
                // Возврат в таблицу-источник: после вставки Sortable'ом
                // возвращаем плейсхолдер на исходное место строки.
                restoreGhostToOrigin(evt.dragged)
            }
        } else {
            // Перетаскивание в ДРУГУЮ таблицу → строка падает в конец, плейсхолдер
            // показывается под всеми строками (cross-drop).
            markCrossDrop(evt.to)
        }
        return true;
    };

    const dragEnd = (event) => {
        // Не нужно вручную пересчитывать позиции - виртуализатор сделает это автоматически
        // через changeDrag -> initVirtualizer() который уже вызывается при изменении порядка
        clearCrossDrop()
        clearGhostFit()
        dragOriginParent = null
        dragOriginNextEl = null
        unlockTableScroll()

        // Отмена через возврат: если тащили ОБЫЧНЫМ драгом (не за ручку) и в
        // итоге набор строк в исходной таблице не изменился (строка вернулась) —
        // восстанавливаем исходный порядок, чтобы строка встала на своё место,
        // а не туда, куда её занесли при возврате.
        if (dragWasGeneral && dragOriginBody && Array.isArray(table.value.body)) {
            const curIds = table.value.body.map(r => r?.id ?? r?.local_id)
            const origIds = dragOriginBody.map(r => r?.id ?? r?.local_id)
            const sameSet = curIds.length === origIds.length
                && [...curIds].sort().join('|') === [...origIds].sort().join('|')
            const changedOrder = sameSet && curIds.some((id, i) => id !== origIds[i])
            if (sameSet && changedOrder) {
                table.value.body = [...dragOriginBody]
                nextTick(() => { if (table.value.rowVirtualizer) table.value.initVirtualizer() })
            }
        }
        dragOriginBody = null
        dragWasGeneral = false

        draggedFromHandle = false
        draggableRow.value = null
        table.value.dragEnd(event)
        // После драга SortableJS мог оставить строку скрытой (display:none) —
        // раскрываем её обратно, иначе единственная задача маршрута пропадает.
        nextTick(unhideStuckRows)
        setTimeout(unhideStuckRows, 60)
    }

    // Корректировка клона-призрака (forceFallback) при горизонтальной прокрутке.
    // Sortable клонирует строку ЦЕЛИКОМ и ставит её по rect.left (= левый край
    // таблицы − scrollLeft). При движении курсора виден не нужный кусок строки:
    // призрак показывает колонки ОТ НАЧАЛА таблицы (column 0), а не видимую часть.
    //
    // Делаем клон горизонтальным «окном» шириной с видимую область и совмещаем
    // левый край с таблицей. Сдвиг содержимого на scrollLeft делаем НЕ через
    // fallback.scrollLeft (в Safari он у клона не применяется — это и был баг),
    // а через margin/translate: первой ячейке margin-left:-scrollLeft двигает
    // весь поток влево (видны прокрученные колонки), а зафиксированным колонкам
    // возвращаем их место слева через translateX(scrollLeft).
    // Высоту клона Sortable фиксирует inline (rect.height) — вертикаль не трогаем.
    const adjustDragGhostScroll = () => {
        requestAnimationFrame(() => {
            const scrollEl = tableRef?.value
            const fallback = typeof document !== 'undefined'
                ? document.querySelector('.draggable-fallback')
                : null
            if (!scrollEl || !fallback) return

            const scrollLeft = scrollEl.scrollLeft || 0
            const visible = scrollEl.clientWidth

            // Safari: clip-path на клоне не отрисовывается (контент клона был
            // полностью невидим). Делаем клон «окном» шириной с видимую область:
            // width + overflow:hidden, контент сдвигаем margin'ом первой ячейки
            // на -scrollLeft. Фикс-колонки в Safari несут inline
            // translate3d(scrollLeft) (см. Header.checkStickyCells) — после
            // сдвига потока они сами встают в начало окна, как в живой таблице.
            // Сам клон сдвигаем margin-left на +scrollLeft: Sortable ставит его
            // по rect.left строки (левый край КОНТЕНТА), а окно должно совпадать
            // с видимым краем таблицы.
            const isSafari = typeof navigator !== 'undefined'
                && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

            if (isSafari) {
                fallback.style.width = `${visible}px`
                fallback.style.minWidth = `${visible}px`
                fallback.style.maxWidth = `${visible}px`
                fallback.style.overflow = 'hidden'
                if (scrollLeft > 0) {
                    fallback.style.marginLeft = `${scrollLeft}px`
                    const firstCell = fallback.querySelector('.table__cell:not(.table__cell_hide)')
                    if (firstCell) firstCell.style.marginLeft = `-${scrollLeft}px`
                }
                return
            }

            // Chrome и остальные: клон — ВСЯ строка (ширина W), Sortable ставит её
            // левым краем по rect.left (= левый край таблицы − scrollLeft), поэтому
            // колонка 0 клона оказывается там же, где колонка 0 строки. Видимая
            // часть строки в координатах клона — [scrollLeft, scrollLeft + clientWidth].
            // Обрезаем клон по этому окну через clip-path: позицию и transform
            // (которым Sortable водит клон за курсором) НЕ трогаем, фикс-колонки
            // со своим sticky-transform'ом сами попадают в начало окна.
            // Режем ВСЕГДА (а не только при scrollLeft > 0): без прокрутки клон
            // оставался во всю ширину КОНТЕНТА строки — шире видимой области
            // таблицы-источника. Ghost должен быть на ширину видимой части
            // таблицы и показывать только видимые столбцы.
            const fullWidth = Math.max(fallback.scrollWidth, fallback.offsetWidth)
            const rightInset = Math.max(0, fullWidth - scrollLeft - visible)
            if (scrollLeft <= 0 && rightInset <= 0) return // строка уже не шире видимой области
            const clip = `inset(0px ${rightInset}px 0px ${scrollLeft}px)`
            fallback.style.webkitClipPath = clip
            fallback.style.clipPath = clip
        })
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
        nextTick(unhideStuckRows)
    }, { deep: true })

    // SortableJS во время перетаскивания прячет строки через inline display:none.
    // Если наша перезагрузка таблицы (updatingCount после привязки задачи к
    // маршруту) пересекается с завершением драга, строка может остаться со
    // style="display:none" и визуально пропасть (а measureElement замеряет её в
    // 0 → data-height="0"). Клон Sortable при этом удаляется (removeCloneOnHide),
    // значит застрявший display:none висит на НАСТОЯЩЕЙ строке. Vue сам inline
    // display не выставляет — поэтому любая .table__row с display:none вне драга
    // считается застрявшей и раскрывается обратно.
    const unhideStuckRows = () => {
        if (typeof document === 'undefined' || !tableRef?.value) return
        if (table.value?.isDragging) return
        tableRef.value.querySelectorAll('.table__row').forEach(el => {
            if (el.style && el.style.display === 'none') el.style.display = ''
        })
    }

    // MutationObserver надёжнее точечных вызовов: SortableJS может выставить
    // display:none асинхронно (после нашего nextTick). Наблюдаем за атрибутом
    // style у строк и снимаем скрытие, как только оно появилось вне драга.
    // Снятие display не зацикливает наблюдатель — повторно реагируем только на
    // значение 'none'.
    let stuckRowObserver = null
    onMounted(() => {
        if (typeof MutationObserver === 'undefined' || !tableRef?.value) return
        stuckRowObserver = new MutationObserver(() => {
            if (table.value?.isDragging) return
            unhideStuckRows()
        })
        stuckRowObserver.observe(tableRef.value, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        })
    })
    onBeforeUnmount(() => {
        if (stuckRowObserver) { stuckRowObserver.disconnect(); stuckRowObserver = null }
    })
</script>