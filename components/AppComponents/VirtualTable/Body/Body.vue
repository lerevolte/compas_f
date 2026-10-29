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
            :handle="table.options?.isDraggable && (table.state != 'edit' || (table.options?.isLocalTable && table.options?.isHaveOrder)) && !isMobile ? table.options?.draggableTarget ?? '.table__row' : 'null'"
            :forceFallback="true"
            :fallbackOnBody="true"
            :delay="props.options?.dragDelay ?? 120"
            :delayOnTouchOnly="props.options?.dragDelayOnTouchOnly ?? true"
            :touchStartThreshold="props.options?.touchStartThreshold ?? 3"
            :filter="props.options?.dragFilter ?? '.table__cell-content, .blank__text, .blank__link, input, textarea, select, [contenteditable]'"
            :preventOnFilter="false"
            :scroll="false"
            :bubbleScroll="false"
            :item-key="getItemKey"
            class="table__body" 
            :style="bodyStyle"
            drag-class="draggable-drag"
            ghost-class="draggable-ghost"
            fallback-class="draggable-fallback"
            :class="{
                'table__body_edit': table.state == 'edit',
                'table__body_local': table.options?.isLocalTable,
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
                    :style="(table.isDragging || props.options?.isShort) ? `position: relative; top: 0; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : '#FFF'};` : `--row-start: ${row.start}px; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : '#FFF'};`"
                    :class="{
                        'table__row_short': props.options?.isShort,
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
                            'table__cell_readonly': !!column.read_only && !['isChoose', 'clicked', 'actions', 'iconDrag', 'iconDelete'].includes(column.key),
                            'table__cell_hide-empty': isMobile && !SERVICE_KEYS.includes(column.key) && !table.body[row.index]?.edit && isCellValueEmpty(table.body[row.index], column),
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
                            :options="cell.rowActions(row.index)"
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
                                id: `${uid}_${row.index}_${column.key}`,
                                title: null,
                                edit: table.body[row.index] && !column.read_only && (table.body[row.index]?.edit || table.options.isPermanentEdit),
                                type: column.type,
                                relation_type: table.slug == 'products' && table.options?.isLocalTable ? (column.key == 'product_id' ? 'products' : column.related_table) : null,
                                list: column.options,
                                slug: column.related_table,
                                name: column.key,
                                relation: column.id,
                                searchable: true,
                                required: false,
                                isHaveNull: true,
                                multiple: column.is_plural,
                                visibleCount: 5,
                                isCompact: true,
                                isCanAdd: table.body[row.index] && !column.read_only && (table.body[row.index]?.edit || table.options.isPermanentEdit) && (column.can_edit ?? true),
                                placeholder: ''
                            }"
                            v-model="cell.useCellModel(row.index, column).value"
                            @clickLink="id => table.open({id, related_table: column.related_table})"
                            @create="item => table.create(column.related_table)"
                            @showAll="() => table.open({id: table.body[row.index].id, related_table: table.slug, tab_slug: column.related_table})"
                            @update:model-value="val => table.slug == 'products' && (column.key == 'product_id' ? getRow(val, table.body[row.index]) : markRowEdited(table.body[row.index]))"
                            @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
                        />

                        <div class="table__cell-content" v-else-if="column.type == 'file' && table.body[row.index]">
                            <AppFansyBox class='table__text-group_file table__file'>
                                <template v-if="Array.isArray(table.body[row.index][column.key]) && table.body[row.index][column.key].length">
                                    <AppFansyBoxItem 
                                        v-for="file in table.body[row.index][column.key]"
                                        :style="`--count-files: '${table.body[row.index][column.key].length}'`"
                                        :id="`${uid}_${row.index}_${column.key}`"
                                        :image="{
                                            path: file.file,
                                            thumbnail_path: file.url,
                                        }"
                                    />
                                </template>
                            </AppFansyBox>
                        </div>


                        <AppCheckbox
                            v-else-if="column.type == 'checkbox' && table.body[row.index]"
                            :modelValue="checkboxValue(row.index, column) === '1'"
                            :options="{
                                title: '',
                                disabled: !!column.read_only || !(table.body[row.index].edit || table.options?.isPermanentEdit)
                            }"
                            @update:modelValue="val => {
                                cell.checkEditting(table.body[row.index], {value: checkboxValue(row.index, column), key: column.key})
                                toggleCheckbox(row.index, column, val)
                            }"
                        />

                        <template v-else-if="table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit)" >
                            <AppTextarea
                                v-if="column.type == 'text' && column.is_plural"
                                :model-value="cell.useCellModel(row.index, column).value"
                                @update:model-value="val => cell.useCellModel(row.index, column).value = val"
                                @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
                                    title: null,
                                    name: column.key,
                                    autosize: true,
                                    placeholder: ''
                                }"
                            />
                            <AppInput
                                v-else-if="['text', 'number'].includes(column.type)"
                                :model-value="cell.useCellModel(row.index, column).value"
                                @update:model-value="val => cell.useCellModel(row.index, column).value = val"
                                @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
                                    title: null,
                                    type: column.type,
                                    name: column.key,
                                    placeholder: null,
                                    mask: column.mask ?? null,
                                    prefix: nameOrdinal(row.index, column)
                                }"
                            />
                            <template v-else-if="column.type == 'select_dropdown' && isHiddenPermissionCell(row.index, column.key)"></template>
                            <AppSelect
                                v-else-if="column.type == 'select_dropdown'"
                                :parentContainer="sectionRef"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
                                    title: null,
                                    type: column.type,
                                    list: permissionOptions(row.index, column),
                                    name: column.key,
                                    relation: null,
                                    edit: table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit),
                                    searchable: false,
                                    required: false,
                                    isHaveNull: !(typeof table.path === 'string' && table.path.startsWith('/roles')),
                                    multiple: column.is_plural,
                                    placeholder: ''
                                }"
                                v-model="cell.useCellModel(row.index, column).value"
                                @update:prevValue="val => cell.checkEditting(table.body[row.index], {value: val, key: column.key})"
                            />

                            <AppDate
                                v-else-if="column.type == 'date'"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
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
                                    id: `${uid}_${row.index}_${column.key}`,
                                    field_id: column.id,
                                    title: null,
                                    type: column.type,
                                    list: column.options,
                                    name: column.key,
                                    relation: null,
                                    edit: table.body[row.index] && !column.read_only && (table.body[row.index].edit || table.options?.isPermanentEdit),
                                    required: false,
                                    isHaveNull: false,
                                    isCanCreate: column.can_create ?? false,
                                    placeholder: ''
                                }"
                                v-model="cell.useCellModel(row.index, column).value"
                            />

                            <AppSelect 
                                v-else-if="column.type == 'address'" 
                                :parentContainer="sectionRef"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
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
                            <span
                                class="table__text text table__text_link"
                                v-if="column.is_entity_link && table.body[row.index].link?.slug && table.body[row.index].link?.id"
                                :title="cell.useCellModel(row.index, column).value"
                                @click.stop="table.open({ id: table.body[row.index].link.id, related_table: table.body[row.index].link.slug })"
                            >
                                <span class="table__ordinal" v-if="nameOrdinal(row.index, column)">{{ nameOrdinal(row.index, column) }}</span>{{ cell.useCellModel(row.index, column).value }}
                            </span>

                            <span class="table__text text" :style="cellTextStyle(row.index, column)" :title="cell.useCellModel(row.index, column).value != null ? `${common.formatByMask(cell.useCellModel(row.index, column).value, column.mask)}${column.unit ? ' ' + column.unit : ''}` : null" v-else-if="['text', 'number'].includes(column.type) && (!column.is_external_link || !table.body[row.index][column.key]?.external_link)">
                                <span class="table__ordinal" v-if="nameOrdinal(row.index, column)">{{ nameOrdinal(row.index, column) }}</span>{{ common.formatByMask(cell.useCellModel(row.index, column).value, column.mask) }}<span class="table__unit" v-if="column.unit && cell.useCellModel(row.index, column).value"> {{ column.unit }}</span>
                            </span>

                            <a :href="cell.useCellModel(row.index, column, 'external_link').value" target="_blank" class="table__text text" :title="cell.useCellModel(row.index, column, 'value').value" v-else-if="column.type == 'text' && column.is_external_link">
                                <span class="table__ordinal" v-if="nameOrdinal(row.index, column)">{{ nameOrdinal(row.index, column) }}</span>{{ cell.useCellModel(row.index, column, 'value').value }}
                            </a>

                            <div class="table__text-group"  v-else-if="column.type == 'address'">
                                <span class="table__text text" :title="cell.useCellModel(row.index, column).value?.text">
                                    {{ cell.useCellModel(row.index, column).value?.text }}
                                </span>
                                <AppButton 
                                    v-show="cell.useCellModel(row.index, column).value != null" 
                                    class="button_text button_copy" 
                                    @click="event => cell.copyText(cell.useCellModel(row.index, column).value?.text, event.target)"
                                />
                            </div>

                            <span class="table__text text" :title="cell.useCellModel(row.index, column).value ? format(cell.useCellModel(row.index, column).value, 'dd.MM.yyyy') : null" v-else-if="column.type == 'date'">
                                {{ cell.useCellModel(row.index, column).value ? format(cell.useCellModel(row.index, column).value, 'dd.MM.yyyy') : null }}
                            </span>

                            <span class="table__text text" :title="cell.useCellSelectModel(row.index, column).value" v-else-if="column.type == 'select_dropdown'">
                                {{ cell.useCellSelectModel(row.index, column).value }}
                            </span>

                            <span class="table__text text" :title="multiTextValue(row.index, column)" v-else-if="column.type == 'multi_text'">
                                {{ multiTextValue(row.index, column) }}
                            </span>

                            <AppStatus
                                v-else-if="column.type == 'deal_stages' && stageKnown(row.index, column)"
                                :parentContainer="sectionRef"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
                                    title: null,
                                    type: 'status',
                                    edit: false,
                                    list: stageList(column),
                                    name: column.key,
                                    required: false,
                                    isHaveNull: false,
                                    isCanCreate: false,
                                    placeholder: ''
                                }"
                                :model-value="stageValue(row.index, column)"
                            />

                            <span class="table__text text" v-else-if="column.type == 'deal_stages'" :title="stageValue(row.index, column)">
                                {{ stageValue(row.index, column) ?? '' }}
                            </span>

                            <span class="table__text text" v-else-if="column.type == 'geoposition'" :title="geopositionValue(row.index, column)">
                                {{ geopositionValue(row.index, column) }}
                            </span>

                            <span class="table__text text table__saby" v-else-if="column.type == 'waybills'">
                                <span class="table__saby-item" v-for="item in sabyItems(row.index, column)" :key="item.type + '-' + item.id">
                                    <span class="table__saby-line">
                                        <span class="table__saby-name">{{ item.type == 'waybill' ? 'ЭТрН' : 'Заказ' }}</span>
                                        <a v-if="item.url" :href="item.url" target="_blank" class="table__saby-open" title="Открыть в Saby" @click.stop>Saby</a>
                                        <span class="table__saby-state" v-if="item.state">{{ item.state }}</span>
                                    </span>
                                    <span class="table__saby-line table__saby-line_waybill" v-if="item.waybill">
                                        <span class="table__saby-name">ЭТрН</span>
                                        <a v-if="item.waybill.url" :href="item.waybill.url" target="_blank" class="table__saby-open" title="Открыть в Saby" @click.stop>Saby</a>
                                        <span class="table__saby-state" v-if="item.waybill.state">{{ item.waybill.state }}</span>
                                    </span>
                                </span>
                            </span>

                            <span class="table__text text" v-else-if="column.type == 'json'" :title="jsonTitle(cell.useCellModel(row.index, column).value)" v-html="jsonInline(cell.useCellModel(row.index, column).value)"></span>

                            <AppRouteStatuses
                                v-else-if="column.type == 'route_statuses' && table.body[row.index].id"
                                :options="{ title: null }"
                                :routeId="table.body[row.index].id"
                            />

                            <AppStatus
                                v-else-if="column.type == 'status'"
                                :parentContainer="sectionRef"
                                :options="{
                                    id: `${uid}_${row.index}_${column.key}`,
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
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppFansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppRouteStatuses from '@AppComponents/RouteStatuses/RouteStatuses.vue'
    import AppFansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import IconClose from '@AppIcons/Close.vue'
    import { Common, stageStatusOptions } from '@/helpers/classes.js'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { format } from 'date-fns'
    import isEqual from 'lodash/isEqual'
    import { useMediaQuery } from '@vueuse/core'

    const table = inject('table')
    const sectionRef = inject('sectionRef')
    const common = new Common()
    const uid = useId()

    const SERVICE_KEYS = ['isChoose', 'clicked', 'actions', 'iconDrag', 'iconDelete']

    const nameOrdinal = (index, column) => {
        if (column?.key !== 'name') return null
        const ordinal = table.value.body[index]?.name_ordinal
        return ordinal ? `${ordinal}-` : null
    }

    const cellTextStyle = (index, column) => {
        const colorBy = column?.color_by
        if (colorBy?.field && colorBy?.colors) {
            let value = table.value.body[index]?.[colorBy.field]
            if (typeof value === 'string' && value.trim().startsWith('[')) {
                try {
                    value = JSON.parse(value)
                } catch (e) {
                    value = null
                }
            }
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                value = value.value
            }
            if (Array.isArray(value)) {
                value = value[0]
            }
            if (value && typeof value === 'object') {
                value = value.value
            }
            const color = value != null ? colorBy.colors[String(value)] : null
            if (color) {
                return { color }
            }
        }
        return column?.set_color && column?.color ? { color: column.color } : null
    }
    const NDS_INCLUDED_KEYS = ['product_nds_included', 'nds_included']

    const checkboxValue = (rowIndex, column) => {
        let value = cell.useCellModel(rowIndex, column).value
        if (Array.isArray(value)) value = value[0]
        if (value == null || value === '') return NDS_INCLUDED_KEYS.includes(column.key) ? '1' : '0'
        return value === true || String(value) === '1' ? '1' : '0'
    }

    const toggleCheckbox = (rowIndex, column, val) => {
        cell.useCellModel(rowIndex, column).value = val ? '1' : '0'
    }

    const isCellValueEmpty = (row, column) => {
        if (!row) return true
        let value = row[column.key]
        if (column.type == 'address' && value && typeof value === 'object' && !Array.isArray(value)) {
            const text = value.text ?? value.value ?? null
            return text === null || text === undefined || String(text).trim() === ''
        }
        if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
            value = value.value
        }
        if (Array.isArray(value)) {
            return value.filter(v => v !== null && v !== undefined && String(v).trim() !== '').length === 0
        }
        if (column.type == 'json' && typeof value === 'string') {
            return value.replace(/<[^>]*>/g, '').trim() === ''
        }
        return value === null || value === undefined || String(value).trim() === ''
    }

    const jsonTitle = (html) => {
        if (!html || typeof html !== 'string') return null
        const text = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/\n+$/g, '')
            .trim()
        return text || null
    }

    const jsonInline = (html) => {
        if (typeof html !== 'string') return html
        return html
            .replace(/(\s*<br\s*\/?>\s*)+$/gi, '')
            .replace(/\s*<br\s*\/?>\s*/gi, ', ')
    }

    const isHiddenPermissionCell = (rowIndex, key) => {
        const row = table.value.body[rowIndex]
        if (!row) return false
        const isLogistic = row.slug === 'logistic' || row.name === 'Логистика'
        return isLogistic && ['create_p', 'update_p', 'delete_p', 'export_p'].includes(key)
    }
    const permissionOptions = (rowIndex, column) => {
        const row = table.value.body[rowIndex]
        const isRolesTable = typeof table.value.path === 'string' && table.value.path.startsWith('/roles')
        if (!isRolesTable) return column.options
        const isLogistic = row && (row.slug === 'logistic' || row.name === 'Логистика')
        if (isLogistic && column.key === 'read_p') {
            return (column.options || []).filter(o => o.value !== 'Y' && o.value !== 'E')
        }
        if (!row || !['routes', 'logistic_tasks', 'pickups', 'supplier_orders'].includes(row.slug) || !['read_p', 'update_p'].includes(column.key)) {
            return (column.options || []).filter(o => o.value !== 'E')
        }
        return column.options
    }
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

        if (table.value.options?.isExternal) return
        if (table.value.options?.isAnalytic) return
        if (table.value.state == 'edit' || table.value.options?.isPermanentEdit || (cell && ['isChoose', 'active', 'clicked'].includes(cell.getAttribute('data-column-key')))) return
        if (event.target.closest('.show-more')) return
        const el = elem?.getAttribute ? elem : (elem?.currentTarget || elem?.target)
        const rowIndex = el?.getAttribute ? el.getAttribute('data-index') : null
        if (rowIndex != null) {
            table.value.open(table.value.body[rowIndex], table.value.slug)
        }
    }, (elem, event) => {
        let cell = event.target.closest('.table__cell')
        if (table.value.state == 'edit' || table.value.options?.isPermanentEdit || (cell && ['isChoose', 'actions', 'active', 'clicked'].includes(cell.getAttribute('data-column-key')))) return
        const el = elem?.getAttribute ? elem : (elem?.currentTarget || elem?.target)
        const rowIndex = el?.getAttribute ? el.getAttribute('data-index') : null
        if (table.value.body[rowIndex]?.clicked) return

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
        rowActions(rowIndex) {
            const row = table.value.body[rowIndex]
            if (table.value.options?.isTrash) return this.actions.trash
            if (table.value.slug == 'products' && table.value.options?.isLocalTable) return table.value.permissions?.delete_p == 'N' ? [] : this.actions.products
            const base = row.edit ? this.actions.edit : this.actions.default
            let result = base.filter(a => {
                if (a.action === 'edit') return table.value.canEditRow(row)
                if (a.action === 'initDelete') {
                    if (table.value.slug == 'users' && String(row.id) === '1') return false
                    return table.value.canDeleteRow(row)
                }
                if (a.action === 'copy') return table.value.canCreate()
                if (a.action === 'copyExternalLink') return table.value.permissions?.external_link_read_p !== 'N'
                return true
            })
            if (['addresses', 'deals'].includes(table.value.slug) && !row.edit && table.value.permissions?.create_task_p !== 'N') {
                result = [{ name: 'Создать задачу', action: 'createTaskFromAddress', enabled: true }, ...result]
            }
            if (!row.edit && !table.value.options?.isLocalTable && table.value.hasEmployeesField()) {
                result = [{ name: 'QR-код', action: 'showQr', enabled: true }, ...result]
            }
            return result
        }

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

        clearCache() {
            this._modelCache.clear()
            this._selectCache.clear()
        }

        useCellModel(rowIndex, column, slug = 'value') {
            const cacheKey = `${rowIndex}__${column.key}__${slug}`
            if (this._modelCache.has(cacheKey)) return this._modelCache.get(cacheKey)

            const c = computed({
                get() {
                    if (!table.value.body[rowIndex]) {
                        return null
                    }
                    const cell = table.value.body[rowIndex][column.key]

                    if (table.value.slug == 'products' && ['product_sum', 'product_nds_sum', 'product_total'].includes(column.key)) {
                        const row = table.value.body[rowIndex]
                        const parentSlug = table.value.options?.parentSlug
                        const parts = common.productLineParts(row, parentSlug)
                        if (column.key == 'product_sum') {
                            const editing = !column.read_only && (row.edit || table.value.options?.isPermanentEdit)
                            if (editing) {
                                const draft = row.__sumEdit
                                if (draft && draft.price === row[common.productPriceKey(parentSlug)] && draft.count === row.product_count) return draft.value
                                return common.roundMoney(parts.sum)
                            }
                            return common.transformPrice(parts.sum, 2)
                        }
                        return common.transformPrice(column.key == 'product_total' ? parts.gross : parts.vat, 2)
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
                    if (!table.value.body[rowIndex]) {
                        return
                    }
                    
                    const cell = table.value.body[rowIndex][column.key]

                    if (table.value.slug == 'products' && column.key == 'product_additional_count') {
                        const row = table.value.body[rowIndex]
                        const oldExtra = Number(row.product_additional_count || 0)
                        const extra = Number(String(val ?? '').replace(',', '.'))
                        if (Number.isFinite(extra) && extra >= 0) {
                            row.product_count = Number(row.product_count || 0) - oldExtra + extra
                            row.product_additional_count = extra
                        }
                        return
                    }

                    if (table.value.slug == 'products' && column.key == 'product_sum') {
                        const row = table.value.body[rowIndex]
                        const parentSlug = table.value.options?.parentSlug
                        const priceKey = common.productPriceKey(parentSlug)
                        const sum = Number(String(val ?? '').replace(/\s/g, '').replace(',', '.'))
                        const count = Number(row.product_count || 0)
                        if (Number.isFinite(sum) && count > 0) {
                            row[priceKey] = common.roundMoney(sum / count)
                        }
                        row.__sumEdit = { value: val, price: row[priceKey], count: row.product_count }
                        row.product_sum = Number.isFinite(sum) ? sum : null
                        return
                    }

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

        useCellSelectModel(rowIndex, column) {
            const cacheKey = `${rowIndex}__${column.key}__select`
            if (this._selectCache.has(cacheKey)) return this._selectCache.get(cacheKey)

            const c = computed({
                get() {
                    if (!table.value.body[rowIndex]) {
                        return null
                    }
                    
                    const cell = table.value.body[rowIndex][column.key]
                    let response = null
                    
                    if (cell == null) return null
                    const options = column.options || []
                    if (Array.isArray(cell)) response = options.filter(option => cell.includes(option.value)).map(option => option.label)
                    else if (typeof cell == 'object' && cell !== null) response = options.filter(option => option.value == cell.value).map(option => option.label)
                    else response = options.filter(option => option.value == cell).map(option => option.label)
                
                    if (column.type == 'select_dropdown') {
                        return response.join(', ')
                    } 
                    return response
                }
            })
            this._selectCache.set(cacheKey, c)
            return c
        }

        copyText(value, buttonRef) {
            buttonRef.classList.add('button_copy_active')
            common.copyText(value)

            setTimeout(() => {
                buttonRef.classList.remove('button_copy_active')
            }, 3000);
        }

        setActiveCell(event, rowIndex) {
            if (!table.value.body[rowIndex]) return

            const isCopySelect = table.value.options?.isCellCopy && !table.value.body[rowIndex].edit

            if (!table.value.body[rowIndex].edit && !event.target.closest('.show-more') && !isCopySelect) return

            if (this.activeCell) {
                if (this.activeCell.closest('.table__row')) {
                    this.activeCell.closest('.table__row').classList.remove('table__row_active')
                }
                this.activeCell.classList.remove('table__cell_active')
            }

            if (typeof document !== 'undefined') {
                document.querySelectorAll('.table__cell_copy-select').forEach(el => el.classList.remove('table__cell_copy-select'))
            }

            const cellEl = event.currentTarget
            cellEl.classList.add('table__cell_active')
            if (isCopySelect && this.isCopyableColumn(cellEl)) {
                cellEl.classList.add('table__cell_copy-select')
            }
            cellEl.closest('.table__row').classList.add('table__row_active')
            this.activeCell = cellEl
        }

        isCopyableColumn(cellEl) {
            const key = cellEl?.getAttribute?.('data-column-key')
            const column = table.value.header.find(c => c.key == key)
            return !!column && ['text', 'number', 'date', 'address', 'select_dropdown', 'status', 'json', 'relation'].includes(column.type)
        }

        checkEditting(row, prevValue) {
            if (row.edit) return
            if (table.value.permissions?.update_p === 'N') return

            if (table.value.slug == 'products' && table.value.options?.isLocalTable) {
                table.value.backupLocalBody()
            } else {
                table.value.backup.body = JSON.parse(JSON.stringify([...table.value.backup.body, row]))
            }
            row.edit = true
            table.value.state = 'edit'
        }
    }

    const cell = new Cell()

    const sabyItems = (rowIndex, column) => {
        let value = table.value.body[rowIndex]?.[column.key]
        if (typeof value === 'string') {
            if (!value.trim()) return []
            try {
                value = JSON.parse(value)
            } catch (e) {
                return []
            }
        }
        return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
    }

    const geopositionValue = (rowIndex, column) => {
        let value = table.value.body[rowIndex]?.[column.key]
        if (typeof value === 'string' && value.length) {
            try {
                value = JSON.parse(value)
            } catch (e) {
                value = null
            }
        }
        const time = Number(value?.time)
        if (!Number.isFinite(time) || time <= 0) return ''
        const date = new Date(time)
        const pad = n => String(n).padStart(2, '0')
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    const multiTextValue = (rowIndex, column) => {
        let value = table.value.body[rowIndex]?.[column.key]
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value)
                if (Array.isArray(parsed)) value = parsed
            } catch (e) {}
        }
        if (Array.isArray(value)) {
            return value
                .filter(v => v != null && v !== '')
                .map(v => column.mask ? common.formatByMask(v, column.mask) : v)
                .join(', ')
        }
        if (value != null && value !== '' && column.mask) {
            return common.formatByMask(value, column.mask)
        }
        return value ?? ''
    }

    const stageValue = (rowIndex, column) => {
        let value = table.value.body[rowIndex]?.[column.key]
        if (value && typeof value === 'object' && 'value' in value) value = value.value
        return value == null || value === '' ? null : value
    }

    const stageKnown = (rowIndex, column) => {
        const value = stageValue(rowIndex, column)
        return value != null && (Array.isArray(column.options) ? column.options : []).some(option => option.value == value)
    }

    const stageLists = new WeakMap()
    const stageList = (column) => {
        const options = column.options
        if (!Array.isArray(options)) return []
        if (!stageLists.has(options)) stageLists.set(options, stageStatusOptions(options))
        return stageLists.get(options)
    }

    const getItemKey = (item) => {
        const rowData = item.original || item
        if (table.value?.options?.isLocalTable) {
            return rowData.local_id ?? rowData.id ?? `${table.value.slug}_${item.index ?? item.key}`
        }
        return rowData.id ?? rowData.local_id ?? `${table.value.slug}_${item.index ?? item.key}`
    }

    const bodyStyle = computed(() => {
        if ((!isMobile.value && !table.value.options?.isLocalTable) || table.value.isDragging || props.options?.isShort) return null
        const measured = typeof table.value.rowVirtualizer?.getTotalSize === 'function' ? Number(table.value.rowVirtualizer.getTotalSize()) : 0
        const total = measured > 0 ? measured : (table.value.body?.length ?? 0) * 50
        return total > 0 ? { height: `${total}px` } : null
    })

    const rows = computed({
        get() {
            if (table.value.isDragging) {
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
            if (!table.value.body) {
                table.value.body = []
            }
            
            if (!newValue || (newValue.length === 0 && table.value.body.length === 0)) return
            
            const reorderedBody = []
            
            for (const virtualItem of newValue) {
                let rowData = null
                
                if (virtualItem && virtualItem.original !== undefined && virtualItem.original !== null) {
                    rowData = virtualItem.original
                }
                else if (typeof virtualItem === 'object' && virtualItem !== null) {
                    const hasRealData = virtualItem.id !== undefined || 
                                       virtualItem.local_id !== undefined ||
                                       (Object.keys(virtualItem).length > 0 && 
                                        Object.keys(virtualItem).some(key => {
                                            if (['index', 'start', 'size', 'key', 'original'].includes(key)) {
                                                return false
                                            }
                                            return virtualItem[key] !== undefined
                                        }))
                    
                    if (hasRealData && (virtualItem.original === undefined || virtualItem.original === null)) {
                        const { index, start, size, key, original, ...cleanData } = virtualItem
                        rowData = cleanData
                    }
                    else if (virtualItem.index !== undefined && virtualItem.index >= 0 && virtualItem.index < table.value.body.length) {
                        rowData = table.value.body[virtualItem.index]
                    }
                }
                
                if (rowData) {
                    reorderedBody.push(rowData)
                }
            }

            if (reorderedBody.length > 0) {
                if (reorderedBody.length === table.value.body.length && table.value.body.length > 0) {
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
                    let finalBody = reorderedBody

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

    let draggedFromHandle = false
    const onTablePointerDown = (ev) => {
        draggedFromHandle = !!ev.target?.closest?.('.table__icon-drag, .table__cell[data-column-key="iconDrag"]')

        if (!table.value.options?.isCellCopy) return
        if (ev.target?.closest?.('.table__icon-drag, .table__cell[data-column-key="iconDrag"], .show-more, input, textarea, select, [contenteditable], button, a')) return
        const cellEl = ev.target?.closest?.('.table__cell')
        const rowEl = cellEl?.closest?.('.table__row')
        if (!cellEl || !rowEl) return
        const rowIndex = Number(rowEl.getAttribute('data-index'))
        if (Number.isNaN(rowIndex) || !table.value.body[rowIndex] || table.value.body[rowIndex].edit) return
        cell.setActiveCell({ currentTarget: cellEl, target: ev.target }, rowIndex)
    }

    let dragOriginBody = null
    let dragWasGeneral = false
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

    watch(() => tableRef?.value, (el, prev) => {
        if (prev) prev.removeEventListener('pointerdown', onTablePointerDown, true)
        if (el) el.addEventListener('pointerdown', onTablePointerDown, true)
    }, { immediate: true })

    onBeforeUnmount(() => {
        if (tableRef?.value) tableRef.value.removeEventListener('pointerdown', onTablePointerDown, true)
        unlockTableScroll()
    })

    const onCopyKeydown = (event) => {
        if (!table.value.options?.isCellCopy) return
        if (!(event.ctrlKey || event.metaKey)) return
        if (!['c', 'C', 'с', 'С'].includes(event.key)) return

        const selected = typeof document !== 'undefined' ? document.querySelector('.table__cell_copy-select') : null
        if (!selected || !tableRef?.value || !tableRef.value.contains(selected)) return

        const target = event.target
        if (target && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA' || target.isContentEditable)) return
        if (window.getSelection && window.getSelection().toString()) return

        const content = selected.querySelector('.table__cell-content') ?? selected
        let text = (content.innerText ?? '').trim()
        if (!text) text = (selected.innerText ?? '').trim()
        if (!text) return

        event.preventDefault()
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

        positionGhostInView(evt.to)

        const isWithinSameTable = evt.from === evt.to
        if (isWithinSameTable) {
            clearCrossDrop()
            const alreadyInThisTable = evt.dragged && evt.dragged.parentNode === evt.to
            if (!draggedFromHandle) {
                if (alreadyInThisTable) return false
                restoreGhostToOrigin(evt.dragged)
            }
        } else {
            markCrossDrop(evt.to)
        }
        return true;
    };

    const dragEnd = (event) => {
        clearCrossDrop()
        clearGhostFit()
        dragOriginParent = null
        dragOriginNextEl = null
        unlockTableScroll()

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
        nextTick(unhideStuckRows)
        setTimeout(unhideStuckRows, 60)
        const refreshFixedCells = () => tableRef?.value?.dispatchEvent(new CustomEvent('vt-fixed-update'))
        nextTick(refreshFixedCells)
        setTimeout(refreshFixedCells, 100)
    }

    const adjustDragGhostScroll = () => {
        requestAnimationFrame(() => {
            const scrollEl = tableRef?.value
            const fallback = typeof document !== 'undefined'
                ? document.querySelector('.draggable-fallback')
                : null
            if (!scrollEl || !fallback) return

            const scrollLeft = scrollEl.scrollLeft || 0
            const visible = scrollEl.clientWidth

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

            const boxWidth = fallback.offsetWidth
            const contentWidth = Math.max(fallback.scrollWidth, boxWidth)
            const rightInset = Math.max(boxWidth - contentWidth, boxWidth - scrollLeft - visible)
            if (scrollLeft <= 0 && rightInset >= 0 && contentWidth <= boxWidth) return
            const clip = `inset(0px ${rightInset}px 0px ${scrollLeft}px)`
            fallback.style.webkitClipPath = clip
            fallback.style.clipPath = clip
        })
    }

    const getRow = (val, row) => {
        const activeOption = val.localOptions.find(option => option.value == val.value[0])?.label
        if (!activeOption) return

        for (let key in row) {
            if (key in activeOption) {
                if (["count", "weight", "volume", "price"].includes(key)) {
                    row[`product_${key}`] = activeOption[key];
                } else {
                    row[key] = activeOption[key];
                }
            }
        }
        if (activeOption.price !== undefined) row.product_price = activeOption.price
        if (activeOption.purchase_price !== undefined) row.product_purchase_price = activeOption.purchase_price
        if (activeOption.count !== undefined) row.product_count = activeOption.count
        if (!(Number(row.product_count) > 0)) row.product_count = 1
        if (activeOption.weight !== undefined) row.product_weight = activeOption.weight
        if (activeOption.volume !== undefined) row.product_volume = activeOption.volume
        if (activeOption.nds !== undefined) row.product_nds = activeOption.nds
        if (activeOption.nds_included !== undefined) row.product_nds_included = activeOption.nds_included == null || activeOption.nds_included === '' ? '1' : String(activeOption.nds_included)

        row.name = activeOption.text
        row.product_name = activeOption.text

        row.edit = true
        if (table.value.state !== 'edit') {
            table.value.state = 'edit'
        }
        applyParentPrice(row, val.value[0])
    }

    const applyParentPrice = async (row, productId) => {
        const options = table.value.options ?? {}
        const parentSlug = options.parentSlug
        const parentId = Number(options.parentId) || 0
        const source = options.parentSource
        if (!parentSlug || !productId || (!parentId && !(source?.slug && source?.id))) return
        let url = routes.table.parent_prices.replace('${parent_slug}', parentSlug).replace('${page_id}', parentId)
        if (!parentId) url += `?source_slug=${encodeURIComponent(source.slug)}&source_id=${encodeURIComponent(source.id)}`
        let response = null
        try {
            response = await api.callMethod('GET', url)
        } catch (e) {
            return
        }
        const entry = response?.status == 200 ? response.data?.prices?.[productId] : null
        if (!entry || row.product_id != productId && row.id != productId) return
        row[`product_${response.data.key}`] = entry.price
        if (entry.nds !== undefined) row.product_nds = entry.nds
        if (entry.nds_included !== undefined) row.product_nds_included = entry.nds_included == null || entry.nds_included === '' ? '1' : String(entry.nds_included)
    }
    
    const markRowEdited = (row) => {
        if (!row) return
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

    watch(() => table.value.body, () => {
        cell.clearCache()
        nextTick(unhideStuckRows)
    }, { deep: true })

    const unhideStuckRows = () => {
        if (typeof document === 'undefined' || !tableRef?.value) return
        if (table.value?.isDragging) return
        tableRef.value.querySelectorAll('.table__row').forEach(el => {
            if (el.style && el.style.display === 'none') el.style.display = ''
        })
    }

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
