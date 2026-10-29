<template>
    <IconLoader class="detail_loader" v-if="detail.loading"/>

    <div class="dynamic__forbidden" v-else-if="detail.forbidden">
        <div class="dynamic__forbidden-code">403</div>
        <p class="dynamic__forbidden-title">Доступ запрещён</p>
        <p class="dynamic__forbidden-text">У вас нет прав для просмотра этого объекта. Обратитесь к администратору портала, чтобы получить доступ.</p>
    </div>

    <template v-else>
        <div class="dynamin__group" v-if="!props.options.isModule && props.tabs.active?.tab == 'products'">
            <AppVirtualTable
                ref="productsTableRef"
                :pageId="props.id"
                :options="{
                    draggableTarget: '.table__icon-drag',
                    isDraggable: canEditProducts,
                    isHaveOrder: canEditProducts,
                    group: 'order_products',
                    isLocalTable: true,
                    isHaveQuery: false,
                    query: {},
                    isHaveFilter: false,
                    isPermanentEdit: canEditProducts,
                    isTrash: false,
                    isHaveTopHeader: true,
                    isHaveFooter: false,
                    isDisableSockets: true,
                    isDisableMassAction: true,
                    updatingCount: 0,
                    parentSlug: props.slug ?? 'logistic_tasks',
                    priceSlug: props.options.isGlobalEdit && props.options.source?.slug === 'supplier_orders'
                        ? 'supplier_orders' : detail.products.priceSlug,
                    parentId: props.options.isGlobalEdit ? 0 : props.id,
                    parentSource: props.options.isGlobalEdit ? props.options.source : null
                }"
                :table="detail.products"
                :slug="'products'"
                @saveTable="detail.productsSaved()"
                @getData="detail.productsLoaded()"
                @openModal="item => emit('action', {
                    action: 'openModal',
                    value: item
                })"
            />
            <AppProductsCheck
                v-if="!props.options.isExternal && CHECKED_SLUGS.includes(props.slug) && (!props.options.isGlobalEdit || props.options.source)"
                :slug="props.slug"
                :id="props.options.isGlobalEdit ? 0 : props.id"
                :rows="productsRows"
                :source="props.options.isGlobalEdit ? props.options.source : null"
            />
        </div>

        <div class="dynamin__group" v-else-if="!props.options.isModule && isMaterialsTab">
            <p class="dynamic__materials-hint" v-if="!Number(props.id)">
                Материалы можно указать после сохранения
            </p>
            <AppVirtualTable
                v-else
                ref="materialsTableRef"
                :key="`materials-${detail.materialsVersion}`"
                :pageId="props.id"
                :options="{
                    draggableTarget: '.table__icon-drag',
                    isDraggable: canEditMaterials,
                    isHaveOrder: canEditMaterials,
                    group: 'order_products',
                    isLocalTable: true,
                    isHaveQuery: false,
                    query: {},
                    isHaveFilter: false,
                    isPermanentEdit: canEditMaterials,
                    isTrash: false,
                    isHaveTopHeader: true,
                    isHaveFooter: false,
                    isDisableSockets: true,
                    isDisableMassAction: true,
                    updatingCount: 0,
                    parentSlug: `${props.slug}_materials`,
                    rowActions: canEditMaterials && !props.options.isExternal ? [{
                        key: 'fill_materials',
                        title: 'Заполнить по спецификации',
                        handler: () => detail.fillMaterials()
                    }] : []
                }"
                :table="detail.materials"
                :slug="'products'"
                @saveTable="detail.loadMaterials()"
                @openModal="item => emit('action', {
                    action: 'openModal',
                    value: item
                })"
            />
        </div>

        <AppHistory
            v-else-if="!props.options.isModule && props.tabs.active?.tab == 'history'"
            :title="'История изменений'"
            :history="detail.history.fields"
            :loading="detail.history.loading"
            @showMoreHistory="page => detail.history.update(page, tabs.active.tab, {id: props.id, slug: props.slug})"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />

        <AppRelatedObjects
            v-else-if="!props.options.isModule && props.tabs.active?.tab == 'relations'"
            :id="props.id"
            :slug="props.slug"
            @openModal="item => emit('action', { action: 'openModal', value: { ...item, type: 'detail' } })"
        />

        <AppPrintDocuments
            v-else-if="!props.options.isModule && props.tabs.active?.tab == 'print_docs'"
            :id="props.id"
            :slug="props.slug"
            @openModal="item => emit('action', { action: 'openModal', value: { ...item, type: 'detail' } })"
        />

        <RouteTasksView
            v-else-if="isRouteTasksTab"
            :routeId="props.id"
            :isExternal="props.options.isExternal"
            @openModal="item => emit('action', { action: 'openModal', value: item })"
        />

        <AppVirtualTable
            v-else-if="!isOrderTab && !props.options.isModule"
            :pageId="props.id"
            :key="props.tabs.active?.tab"
            :options="{
                isHaveQuery: true,
                query: tabQuery,
                isHaveFilter: false,
                title: null,
                isCheckClicked: false,
                isLocalTable: false,
                isShort: false,
                isDisableSockets: !isTasksTab,
                isDisableSort: true,
                isDisablePull: true,
                isPermanentEdit: false,
                isTrash: false,
                isHaveTopHeader: false,
                isHaveFooter: true,
                isHaveLocalFilter: false,
                isExternal: props.options.isExternal,
                localFilter: []
            }"
            :slug="props.tabs.active?.slug"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />
        <ColumnFields
            v-if="isOrderTab || props.options.isModule || keepOrderMounted"
            :columns="detail.columns.list"
            :slug="props.slug"
            :hidden="detail.columns.hidden"
            :tabs="props.tabs"
            :options="{
                isHidden: !isOrderTab && !props.options.isModule,
                isModule: props.options.isModule || props.options.isExternal,
                module: props.options.isModule && !props.options.isExternal ? props.tabs.active?.tab : null,
                canEditLayout: routes.isSeeds && props.options.isModule && !props.options.isExternal,
                isDisableFooter: props.options.isGlobalEdit || props.options.isExternal,
                isHaveHistory: true,
                isGlobalEdit: props.options.isGlobalEdit,
                isCopy: props.options.isCopy,
                isExternal: props.options.isExternal,
                beforeSave: props.options.beforeSave,
                isProductsDirty: productsDirty,
                saveProducts: () => detail.saveProducts(),
                draftProducts: () => detail.draftProducts(),
                hasProducts: () => detail.hasProducts(),
                hiddenDefaults: () => detail.hiddenDefaults(),
                afterSave: () => detail.afterSave(),
                onCancel: () => detail.cancelProducts(),
            }"
            :history="{
                fields: detail.history.events,
                loading: detail.history.loading
            }"
            :eventsVisibility="detail.eventsVisibility"
            :pageId="props.id"
            :headerName="props.headerName"
            @action="action => action.action == 'get' ? detail.get() : emit('action', action)"
            @showMoreHistory="page => detail.history.update(page, props.tabs.active?.tab)"
            @closeDetail="() => emit('action', {
                action: 'closeDetail',
                value: item
            })"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />
    </template>
</template>

<script setup>
    import './Dynamic.scss';

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue'
    import { History, Columns, Common } from '@/helpers/classes.js'
    import AppHistory from '@AppComponents/History/History.vue';
    import ColumnFields from '@AppComponents/ColumnFields/ColumnFields.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import RouteTasksView from '@AppTemplates/Detail/RouteTasksView/RouteTasksView.vue';
    import AppRelatedObjects from '@AppComponents/RelatedObjects/RelatedObjects.vue';
    import AppPrintDocuments from '@AppComponents/PrintDocuments/PrintDocuments.vue'
    import AppProductsCheck from '@AppComponents/ProductsCheck/ProductsCheck.vue'

    const PRODUCTION_SLUGS = ['production_orders', 'productions']
    const isMaterialsTab = computed(() => props.tabs.active?.tab == 'materials' && PRODUCTION_SLUGS.includes(props.slug))

    const CHECKED_SLUGS = ['logistic_tasks', 'pickups', 'expense_invoices', 'product_returns', 'receipt_invoices', 'transfers']

    const isOrderTab = computed(() => props.tabs.active?.tab == 'order')
    const orderWasMounted = ref(false)
    const keepOrderMounted = computed(() => !props.options.isModule)
    const productsTableRef = ref(null)
    const materialsTableRef = ref(null)
    const common = new Common()
    const productsDirty = computed(() => {
        if (props.options.isModule || props.options.isGlobalEdit) return false
        return productsTableRef.value?.table?.state === 'edit' || Array.isArray(detail.value?.productsDraft) || materialsTableRef.value?.table?.state === 'edit'
    })
    const productsRows = computed(() => {
        const body = productsTableRef.value?.table?.body
        return Array.isArray(body) ? body : (detail.value?.products?.list?.data ?? [])
    })

    const isRouteTasksTab = computed(() => {
        if (props.slug !== 'routes' && !(props.options?.isExternal && props.slug == null)) return false
        const active = props.tabs?.active
        if (!active) return false
        if (['order', 'history', 'products'].includes(active.tab)) return false
        const title = (typeof active.title === 'string' ? active.title : '').trim()
        if (!title) return false
        if (title === 'Маршруты' || /Задач/i.test(title)) return false
        return title === 'Маршрут' || title.startsWith('Маршрут ')
    })

    const tabQuery = computed(() => {
        const base = props.tabs?.queryTab || {}
        if (props.slug === 'routes' && props.tabs?.active?.slug === 'logistic_tasks') {
            return {
                ...base,
                route_id: props.id
            }
        }
        if (props.slug === 'cars' && props.tabs?.active?.slug === 'routes') {
            return {
                ...base,
                id: null,
                car_id: props.id
            }
        }
        return base
    })

    const isTasksTab = computed(() => props.tabs?.active?.slug === 'logistic_tasks')

    const emit = defineEmits([
        'action',
        'closeDetail',
        'openModal'
    ])

    const props = defineProps({
        id: {
            default: null,
            type: [String, Number, Object]
        },
        slug: {
            default: null,
            type: [String, Number, Object]
        },
        route_id: {
            default: null,
            type: [String, Number]
        },
        defaults: {
            default: null,
            type: Object
        },
        tabs: {
            default: {
                active: {
                    tab: "order"
                },
                is_module: false,
                queryTab: {},
                list: []
            },
            type: Object
        },
        options: {
            default: {
                isModule: false,
                isCopy: false,
                isGlobalEdit: false
            }
        },
        updateComponent: {
            default: 0,
            type: Number
        },
        headerName: {
            default: '',
            type: String
        }
    })

    class Detail {
        constructor() {
            this.loading = false
            this.forbidden = false
            this.products = {
                table: [],
                list: []
            }
            this.materials = {
                table: [],
                list: []
            }
            this.materialsVersion = 0
            this.materialsLoading = false
            this.productsDraft = null
            this.productsBackup = null
            this.productsPending = false
            this.socket = null
            this.history = new History()
            this.columns = new Columns()
            this.eventsVisibility = {
                visible: true,
                has_roles_read: false,
                roles_read: []
            }
        }

        async get() {
            try {
                let response = null
                this.loading = true
                this.forbidden = false
                emit('action', { action: 'setForbidden', value: false })

                if (props.options.isExternal && props.options.isModule) {
                    const route = routes.external_link.module.replace('${token}', props.id).replace('${tab}', props.tabs.active.tab)
                    response = await api.callMethod('GET', route)
                } else if (props.options.isExternal) {
                    const route = routes.detail.external.replace('${token}', props.id)
                    response = await api.callMethod('GET', route)
                } else if (props.options.isModule) {
                    const route = routes.detail.module.replace('${slug}', props.slug).replace('${id}', props.id).replace('${tab}', props.tabs.active.tab)
                    response = await api.callMethod('GET', route)
                } else {
                    const route = routes.detail.get.replace('${slug}', props.slug).replace('${id}', props.id)
                    const query = []
                    if (props.options.isCopy) query.push('is_copy=1')
                    if (props.route_id) query.push(`route_id=${props.route_id}`)
                    const queryString = query.length ? `?${query.join('&')}` : ''
                    response = await api.callMethod('GET', `${route}${queryString}`)
                    socket.value.set({slug: props.slug, id: props.id})
                    this.socket = socket.value.entities[props.slug]?.details[props.id]
                }

                if (response?.status == 403) {
                    this.forbidden = true
                    emit('action', { action: 'setForbidden', value: true })
                    return
                }

                if (!props.options.isModule) {
                    emit('action', { action: 'getTabs', value: response.data.tabs })
                    emit('action', { action: 'getTitle', value: response.data.detail.title?.name })
                    emit('action', { action: 'getOrdinal', value: response.data.detail.title?.ordinal ?? null })
                    emit('action', {action: 'checkIsTrash', value: Boolean(response.data.detail.deleted_at)})
                    emit('action', {
                        action: 'updateMetaHeader', value: {
                            title: response.data.detail.header_title || '',
                            href: {
                                slug: props.slug,
                                id: props.id
                            }
                        }
                    })
                }

                if (props.options.isCopy && response.data.detail?.title?.name && response.data.detail?.columns) {
                    const sourceName = response.data.detail.title.name
                    for (const colKey in response.data.detail.columns) {
                        for (const section of response.data.detail.columns[colKey]) {
                            for (const field of section.fields) {
                                if (field.key === 'name') {
                                    if (field.value && typeof field.value === 'object') {
                                        if (field.value.value == null || field.value.value === '') {
                                            field.value.value = sourceName
                                        }
                                    } else if (field.value == null || field.value === '') {
                                        field.value = sourceName
                                    }
                                }
                            }
                        }
                    }
                }

                if (props.defaults && props.options.isGlobalEdit && response.data.detail?.columns) {
                    const optionText = (option) => {
                        const label = option?.label
                        return String((label && typeof label === 'object' ? label.text : label) ?? option?.text ?? '').trim().toLowerCase()
                    }
                    const applyDefault = (field) => {
                        if (!(field.key in props.defaults)) return
                        let def = props.defaults[field.key]
                        const sourceLabel = props.defaults.__labels?.[field.key]
                        if (['status', 'select_dropdown'].includes(field.type) && sourceLabel && Array.isArray(field.options)) {
                            const scalar = def && typeof def === 'object' && !Array.isArray(def) && 'value' in def ? def.value : def
                            const known = field.options.some(option => String(option?.value) === String(scalar))
                            if (!known) {
                                const match = field.options.find(option => optionText(option) === String(sourceLabel).trim().toLowerCase())
                                if (match) def = match.value
                            }
                        }
                        if (field.value && typeof field.value === 'object' && !Array.isArray(field.value) && 'value' in field.value) {
                            const defIsObject = def && typeof def === 'object' && !Array.isArray(def) && 'value' in def
                            let value = defIsObject ? def.value : def
                            if (Array.isArray(field.value.value) && !Array.isArray(value)) {
                                value = value === null || value === undefined || value === '' ? [] : [value]
                            } else if (!Array.isArray(field.value.value) && Array.isArray(value)) {
                                value = value.length ? value[0] : null
                            }
                            field.value.value = value
                            if (defIsObject && Array.isArray(def.localOptions)) {
                                field.value.localOptions = def.localOptions
                            }
                        } else {
                            field.value = def
                        }
                    }
                    for (const colKey in response.data.detail.columns) {
                        for (const section of response.data.detail.columns[colKey]) {
                            for (const field of section.fields) {
                                if (field.type === 'text_group' && Array.isArray(field.fields)) {
                                    field.fields.forEach(applyDefault)
                                } else {
                                    applyDefault(field)
                                }
                            }
                        }
                    }
                }

                this.products.table = response.data.table.tableKeys
                this.products.priceSlug = response.data.table.priceSlug
                if (props.options.isGlobalEdit && props.options.source?.slug === 'supplier_orders' && ['logistic_tasks', 'pickups'].includes(props.slug)) {
                    this.products.table = this.products.table.map(column => {
                        if (column.key === 'product_price') return { ...column, enabled: 0, read_only: 1 }
                        if (column.key === 'product_purchase_price') return { ...column, enabled: 1, read_only: 0, title: 'Цена закупки' }
                        return column
                    })
                }
                this.products.list = Array.isArray(response.data.table.tableBody?.data)
                    ? response.data.table.tableBody
                    : this.localProductsList(Array.isArray(response.data.table.tableBody) ? response.data.table.tableBody : [])
                emit('action', { action: 'getProducts', value: this.products.list.data ?? [] })
                if (response.data.materials_table) {
                    this.setMaterials(response.data.materials_table)
                }
                if (props.options.isGlobalEdit) {
                    if (!this.productsDraft && Array.isArray(props.defaults?.__products)) {
                        this.productsDraft = JSON.parse(JSON.stringify(props.defaults.__products))
                        emit('action', { action: 'setProductsDraft', value: this.productsDraft })
                    }
                    if (this.productsDraft) {
                        this.products.list = this.localProductsList(this.productsDraft)
                    }
                } else if (this.productsDraft) {
                    this.productsBackup = JSON.parse(JSON.stringify(response.data.table.tableBody?.data ?? []))
                    this.products.list = this.localProductsList(this.productsDraft)
                }
                this.history.get(response.data)
                this.eventsVisibility = response.data.events_visibility ?? {
                    visible: true,
                    has_roles_read: false,
                    roles_read: []
                }
                this.columns.get(response.data.detail)
                emit('action', { action: 'getColumns', value: response.data.detail.columns })
                this.hiddenFields = Array.isArray(response.data.detail.hidden_fields) ? response.data.detail.hidden_fields : []
                emit('action', { action: 'getHiddenFields', value: this.hiddenFields })
                emit('action', { action: 'setPermissions', value: { permissions: response.data.permissions || {}, readonly: !!response.data.detail?.readonly } })
            } catch (error) {
                console.log(error);
            } finally {
                this.loading = false
            }
        }
        openModal(item) {
            emit('openModal', item)
        }

        setMaterials(payload) {
            this.materials.table = payload?.tableKeys ?? []
            const body = payload?.tableBody
            this.materials.list = Array.isArray(body?.data) ? body : this.localProductsList(Array.isArray(body) ? body : [])
            this.materialsVersion++
        }

        async loadMaterials() {
            if (!Number(props.id)) return
            const url = routes.production.materials.replace('${slug}', props.slug).replace('${id}', props.id)
            const response = await api.callMethod('GET', url)
            if (response?.status == 200) {
                this.setMaterials(response.data)
            }
        }

        async fillMaterials() {
            if (!Number(props.id) || this.materialsLoading) return
            this.materialsLoading = true
            try {
                const url = routes.production.fill_materials.replace('${slug}', props.slug).replace('${id}', props.id)
                const response = await api.callMethod('POST', url)
                if (response?.status != 200) {
                    common.showNotification({
                        title: response?.data?.message ?? 'Не удалось заполнить материалы',
                        description: ''
                    }, 'error')
                    return
                }
                if (!response.data?.count) {
                    common.showNotification({
                        title: 'Нечего заполнить',
                        description: 'Укажите на вкладке «Продукция» спецификации и количество'
                    }, 'default')
                    return
                }
                materialsTableRef.value?.table?.setLocalRows(response.data.rows ?? [])
            } finally {
                this.materialsLoading = false
            }
        }

        localProductsList(rows) {
            const data = JSON.parse(JSON.stringify(rows))
            return {
                data,
                total: data.length,
                per_page: data.length,
                current_page: 1,
                last_page: 1
            }
        }

        snapshotProducts() {
            const body = productsTableRef.value?.table?.body
            if (!Array.isArray(body)) return
            this.productsDraft = JSON.parse(JSON.stringify(body)).map(({ isChoose, edit, ...row }) => row)
            this.products.list = this.localProductsList(this.productsDraft)
            emit('action', { action: 'setProductsDraft', value: this.productsDraft })
        }

        leaveProductsTab() {
            const table = productsTableRef.value?.table
            if (props.options.isGlobalEdit || !Number(props.id)) {
                this.snapshotProducts()
                return
            }
            if (table?.state == 'edit') {
                const backup = Array.isArray(table.backup?.body) && table.backup.body.length ? table.backup.body : table.body
                this.productsBackup = JSON.parse(JSON.stringify(backup)).map(({ isChoose, edit, ...row }) => row)
                this.snapshotProducts()
            } else {
                this.clearProductsDraft()
            }
        }

        productsLoaded() {
            nextTick(() => this.restoreProductsEdit())
        }

        restoreProductsEdit() {
            const table = productsTableRef.value?.table
            if (props.options.isGlobalEdit || !this.productsDraft || !table) return
            table.backup.body = JSON.parse(JSON.stringify(this.productsBackup ?? []))
            table.body = table.body.map(row => ({ ...row, edit: true }))
            table.state = 'edit'
        }

        clearProductsDraft() {
            this.productsDraft = null
            this.productsBackup = null
            emit('action', { action: 'setProductsDraft', value: null })
        }

        hiddenDefaults() {
            if (!props.options.isGlobalEdit || !props.defaults) return {}
            const visible = new Set()
            for (const colKey in this.columns?.list ?? {}) {
                for (const section of this.columns.list[colKey] ?? []) {
                    for (const field of section.fields ?? []) {
                        if (field.type === 'text_group' && Array.isArray(field.fields)) {
                            field.fields.forEach(sub => visible.add(sub.key))
                        } else {
                            visible.add(field.key)
                        }
                    }
                }
            }
            const result = {}
            for (const field of this.hiddenFields ?? []) {
                const key = field?.key
                if (!key || visible.has(key) || !(key in props.defaults) || key.startsWith('__')) continue
                if (['json', 'file', 'history'].includes(field.type) || key === 'products') continue
                if (field.only_read || field.read_only || field.is_program || field.can_edit === 0 || field.can_edit === false) continue
                let value = props.defaults[key]
                if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) value = value.value
                if (field.type === 'relation') {
                    value = (Array.isArray(value) ? value : (value === null || value === undefined || value === '' ? [] : [value])).filter(v => v !== null && v !== undefined && v !== '')
                    if (!value.length) continue
                } else if (value === null || value === undefined || value === '') {
                    continue
                }
                result[key] = JSON.parse(JSON.stringify(value))
            }
            return result
        }

        hasProducts() {
            const draft = this.draftProducts()
            if (draft) return draft.length > 0
            return (this.products?.list?.data ?? []).some(row => Number(row.product_count) > 0)
        }

        draftProducts() {
            const body = productsTableRef.value?.table?.body
            const rows = Array.isArray(body) ? body : (Array.isArray(this.productsDraft) ? this.productsDraft : null)
            if (!rows) return null
            return JSON.parse(JSON.stringify(rows))
                .filter(row => row.id || (row.product_name && String(row.product_name).trim() !== ''))
                .filter(row => Number(row.product_count) > 0)
                .map(row => ({
                    id: row.id,
                    name: row.product_name,
                    price: row.product_price,
                    count: row.product_count
                }))
        }

        compositionPayload(rows) {
            return JSON.parse(JSON.stringify(rows))
                .filter(row => row.id || (row.product_name && String(row.product_name).trim() !== ''))
                .map(row => ({
                    id: row.id,
                    name: row.name,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    product_price: row.product_price,
                    product_purchase_price: row.product_purchase_price,
                    product_count: row.product_count,
                    product_additional_count: row.product_additional_count,
                    product_output_count: row.product_output_count,
                    product_specification_id: row.product_specification_id,
                    product_weight: row.product_weight,
                    product_volume: row.product_volume,
                    product_sum: row.product_sum,
                    product_nds: row.product_nds,
                    product_nds_included: row.product_nds_included
                }))
        }

        async putComposition(parentSlug, products, errorTitle) {
            let response = null
            try {
                response = await api.callMethod('PUT', routes.table.set_products.replace('${parent_slug}', parentSlug).replace('${page_id}', props.id), { products })
            } catch (e) {
                return false
            }
            if (!response?.status || response.status != 200) {
                const data = response?.data ?? {}
                common.showNotification({
                    title: data.message ?? errorTitle,
                    description: Array.isArray(data.errors) ? data.errors.join('; ') : ''
                }, 'error', { toastId: 'products-mismatch' })
                return false
            }
            return true
        }

        async saveMaterials() {
            const table = materialsTableRef.value?.table
            if (table?.state !== 'edit') return true
            const saved = await this.putComposition(`${props.slug}_materials`, this.compositionPayload(table.body), 'Не удалось сохранить материалы')
            if (!saved) return false
            table.clear()
            this.productsPending = true
            await this.loadMaterials()
            return true
        }

        async saveProducts() {
            if (props.options.isGlobalEdit || !Number(props.id)) return true
            const table = productsTableRef.value?.table
            let rows = null
            if (table?.state === 'edit') {
                rows = table.body
            } else if (Array.isArray(this.productsDraft)) {
                rows = this.productsDraft
            }
            if (Array.isArray(rows)) {
                const saved = await this.putComposition(props.slug ?? 'logistic_tasks', this.compositionPayload(rows), 'Не удалось сохранить состав')
                if (!saved) return false
                if (table) table.clear()
                this.clearProductsDraft()
                this.productsPending = true
            }
            return await this.saveMaterials()
        }

        afterSave() {
            if (!this.productsPending) return
            this.productsPending = false
            this.get()
        }

        cancelProducts() {
            const table = productsTableRef.value?.table
            if (table?.state === 'edit') table.cancel()
            const materialsTable = materialsTableRef.value?.table
            if (materialsTable?.state === 'edit') materialsTable.cancel()
            if (Array.isArray(this.productsBackup)) {
                this.products.list = this.localProductsList(this.productsBackup)
            }
            this.clearProductsDraft()
        }

        productsSaved() {
            if (props.options.isGlobalEdit || !Number(props.id)) {
                this.snapshotProducts()
                return
            }
            this.clearProductsDraft()
            this.get()
        }
    }

    const detail = ref(new Detail())

    defineExpose({
        snapshotProducts: () => detail.value.snapshotProducts()
    })

    watch(() => [isOrderTab.value, props.options.isModule], ([isOrder, isModule]) => {
        if (isModule) {
            orderWasMounted.value = false
        } else if (isOrder) {
            orderWasMounted.value = true
        }
    }, { immediate: true })

    watch(() => props.tabs.active?.tab, (next, prev) => {
        if (prev == 'products') {
            detail.value.leaveProductsTab()
        }
    })

    watch(() => props.options.isGlobalEdit, (next, prev) => {
        if (prev && !next) {
            detail.value.clearProductsDraft()
        }
    })

    watch(() => productsTableRef.value?.table?.state, (state, prevState) => {
        const table = productsTableRef.value?.table
        if (prevState === 'edit' && state === null && table && !table.saving && !props.options.isGlobalEdit && Number(props.id) && detail.value.productsDraft) {
            detail.value.clearProductsDraft()
        }
    })
    const canEditMaterials = computed(() => {
        const keys = detail.value?.materials?.table || []
        if (!keys.length) return false
        return keys.some(c => !c.read_only)
    })
    const canEditProducts = computed(() => {
        const keys = detail.value?.products?.table || []
        if (!keys.length) return true
        return keys.some(c => !c.read_only)
    })
    const socket = inject('socket')

    watch(() => props.updateComponent, () => {
        detail.value.get()
    })

    watch(() => detail.value.socket, () => {
        if (detail.value.socket?.history?.fields && detail.value.socket?.history?.fields?.length > 0) {
            detail.value.history.fields.data.unshift(detail.value.socket.history.fields.pop())
        }
        if (detail.value.socket?.history?.events && detail.value.socket?.history?.events?.length > 0) {
            detail.value.history.events.data.unshift(detail.value.socket.history.fields.pop())
        }
    }, {deep: true})

    onUnmounted(() => {
        socket.value.remove({slug: props.slug, id: props.id})
    })
</script>
