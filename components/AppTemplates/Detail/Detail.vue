<template>
    <div class="detail">
        <header id="mobile-menu-target" class="detail-page__header">
            <IconArrowBack @click="detail.closeDetail"/>
            <AppH1 ref="H1Ref" class="textarea_title">
                <p 
                    class="ghost_text" 
                    v-html="detail.header.name"
                    :class="{'ghost_text_show': !detail.header.editTitle}" 
                ></p>
                <AppTextarea 
                    ref="textareaRef"
                    :options="{
                        disabled: !detail.header.editTitle,
                        preventEnter: true
                    }"
                    @keyup.enter="e => detail.header.setTitle(e)"
                    v-model="detail.header.name"
                />
            </AppH1>
            <div class="detail-page__actions" v-if="!props.is_external && !detail.forbidden" v-show="!detail.header.editTitle && !detail.isGlobalEdit">
                <IconEdit v-if="!detail.readonly && canEditTitle" @click="() => detail.header.initEditTitle({
                    textarea: textareaRef.textareaRef.querySelector('textarea'),
                    columns: detail.columns,
                    slug: detail.slug,
                    id: detail.id
                })"/>
                <AppShowMore
                    :isPreventBottom="true"
                    :options="detail.headerActions()"
                    @initClick="action => detail.header[action]({
                        columns: detail.columns,
                        is_modal: props.is_modal,
                        isGlobalEdit: detail.isGlobalEdit,
                        slug: detail.slug,
                        id: detail.id
                    })"
                />
            </div>
            <AppPopup
                class="create-based"
                :isPreventBottom="true"
                v-if="basedEntities.length && detail.id && !props.is_external && !detail.forbidden"
                v-show="!detail.header.editTitle && !detail.isGlobalEdit"
            >
                <template #header>
                    <IconTriangle />
                    <span class="create-based__text">Создать на основании</span>
                </template>
                <template #content>
                    <div
                        class="popup__option"
                        v-for="entity in basedEntities"
                        :key="entity.slug"
                        @click="e => {
                            e.target?.closest('.popup')?.classList.remove('popup_open')
                            detail.createBased(entity)
                        }"
                    >
                        {{ entity.title }}
                    </div>
                </template>
            </AppPopup>
        </header>
        <AppDealStages
            v-if="stageField && detail.id && !detail.isGlobalEdit && !detail.forbidden && !props.is_external"
            :options="{ ...stageField, title: null, mode: 'bar', edit: stageField.can_edit !== false }"
            :pageId="detail.id"
            @changed="detail.updateComponent++"
        />
        <AppTabs
            :tabs="tabs.list"
            :activeTab="tabs.active?.tab"
            :isModule="tabs.is_module"
            :disableAll="detail.isGlobalEdit"
            :slug="detail.slug"
            :options="{
                isExternal: props.is_external,
                modal: tabs.modal
            }"
            @action="item => tabs[item.action](item.value)"
        />
        <DetailDynamic
            :tabs="tabs"
            :id="detail.id"
            :slug="props.slug ?? router.params.slug"
            :route_id="props.route_id"
            :defaults="props.defaults"
            :options="{
                isExternal: props.is_external,
                isModule: tabs.is_module,
                isCopy: detail.isCopy,
                isGlobalEdit: detail.isGlobalEdit
            }"
            :updateComponent="detail.updateComponent"
            :headerName="detail.header.name"
            @action="item => detail[item.action](item.value)"
        />

        <teleport to="#menu__overlay" v-if="detail.header.modal.state">
            <AppModalWarning 
                :options="{
                    title: detail.header.modal.title,
                    action: detail.header.modal.action,
                    actionTitle: detail.header.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="detail.header.modal.loading"
                @delete="detail.header.delete()"
                @restore="detail.header.restore()"
                @close="detail.header.modal.state = false"
            >
            <template v-if="detail.header.modal.action == 'delete'">
                <p class="warning__text">
                    {{ detail.header.modal.text }}
                </p>
            </template>
            </AppModalWarning>
        </teleport>
    </div>
</template>

<script setup>
    import './Detail.scss'
    import { Common, HeaderEditable } from '@/helpers/classes.js'
    import IconEdit from '@AppIcons/Actions/Edit.vue';
    import AppTabs from '@AppComponents/Tabs/Tabs.vue';
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue';
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import DetailDynamic from './Dynamic/Dynamic.vue';
    import IconArrowBack from '@AppIcons/ArrowBack.vue';
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppDealStages from '@AppComponents/DealStages/DealStages.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'

    const textareaRef = ref(null)
    const router = useRoute()
    const common = new Common()

    const emit = defineEmits([
        'closeDetail',
        'updateMetaHeader',
        'openModal'
    ])

    const props = defineProps({
        is_modal: {
            default: false,
            type: Boolean
        },
        is_external: {
            default: false,
            type: Boolean
        },
        slug: {
            default: '',
            type: String
        },
        route_id: {
            default: null,
            type: [String, Number]
        },
        tab_slug: {
            default: null,
            type: String
        },
        id: {
            default: 0,
            type: [String, Number]
        },
        isGlobalEdit: {
            default: false,
            type: Boolean
        },
        isCopy: {
            default: false,
            type: Boolean
        },
        defaults: {
            default: null,
            type: Object
        },
        source: {
            default: null,
            type: Object
        }
    })

    const SKIP_BASED_KEYS = ['id', 'created_at', 'updated_at', 'deleted_at', 'user_id', 'route_id', 'sort', 'point_status']

    const SHIPMENT_SOURCES = ['logistic_tasks', 'pickups']

    const BASED_ENTITIES = {
        deals: [
            { slug: 'logistic_tasks', title: 'Задача логистики' },
            { slug: 'pickups', title: 'Самовывоз' },
            { slug: 'payment_invoices', title: 'Счет на оплату' }
        ],
        logistic_tasks: [
            { slug: 'expense_invoices', title: 'Расходная накладная' },
            { slug: 'product_returns', title: 'Возврат' }
        ],
        pickups: [
            { slug: 'expense_invoices', title: 'Расходная накладная' },
            { slug: 'product_returns', title: 'Возврат' }
        ],
        addresses: [{ slug: 'logistic_tasks', title: 'Задача логистики' }]
    }

    class Tabs {
        constructor() {
            this.active = {
                tab: "order"
            }
            this.is_module = false
            this.moduleLoaded = false
            this.initialized = false
            this.queryTab = {}
            this.list = []
        }

        set({tab, is_module}) {
            if (!is_module && this.moduleLoaded) {
                this.moduleLoaded = false
                detail.value.updateComponent++
            }

            if (is_module) {
                this.active = tab
                this.moduleLoaded = true
                detail.value.updateComponent++
            } else if (['order', 'history', 'module'].includes(tab.tab)) {
                this.queryTab = {}
                this.active = tab
            } else {
                let findedField = common.findColumnField(detail.value.columns, tab.tab)
                if (!findedField) {
                    findedField = (detail.value.hiddenFields || []).find(f => f.key == tab.tab) ?? null
                }
                let request = null

                if (findedField && findedField.value) {
                    if (findedField.value.value && findedField.value.value.length > 0) {
                        request = findedField.value.value
                    } else {
                        request = null
                    }
                }
                
                this.queryTab = {
                    is_slug: true,
                    id: request
                }
                if (detail.value.isTrash) {
                    this.queryTab.with_trashed = 1
                }
                this.active = tab
            }
            this.is_module = is_module
        }
    }
   
    class Detail {
        constructor() {
            this.id = null
            this.slug = null
            this.header = new HeaderEditable({columns: this.columns, emit: emit, reload: () => detail.value.updateComponent++})
            this.updateComponent = 0
            this.columns = {}
            this.hiddenFields = []
            this.productsList = []
            this.productsDraft = null
            this.isGlobalEdit = false
            this.isCopy = false
            this.isTrash = false
            this.forbidden = false
            this.permissions = {}
            this.readonly = false
            this.actions = {
                default: [
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
                trash: [
                    {
                        name: 'Скопировать ссылку',
                        action: 'copyLink',
                        enabled: true
                    },
                    {
                        name: 'Восстановить',
                        action: 'initRestore',
                        enabled: true
                    }
                ]
            }
        }

        setPermissions({permissions, readonly}) {
            this.permissions = permissions || {}
            this.readonly = !!readonly
        }

        setForbidden(value) {
            this.forbidden = !!value
        }

        headerActions() {
            if (this.isTrash) return this.actions.trash
            const actions = this.actions.default.filter(a => {
                if (a.action === 'copy') return this.permissions?.create_p !== 'N'
                if (a.action === 'initDelete') {
                    if (this.slug == 'users' && String(this.id) === '1') return false
                    return this.permissions?.delete_p !== 'N' && this.permissions?.can_delete !== false
                }
                if (a.action === 'copyExternalLink') return this.permissions?.external_link_read_p !== 'N'
                return true
            })
            if (this.slug === 'addresses' && this.permissions?.create_task_p !== 'N') {
                actions.unshift({
                    name: 'Создать задачу',
                    action: 'createTaskFromAddress',
                    enabled: true
                })
            }
            return actions
        }

        get() {
            this.id = props.id ?? router.params.id ?? router.params.token
            this.isGlobalEdit = props.isGlobalEdit
            this.isCopy = props.isCopy
            this.slug = props.slug ?? router.params.slug
            this.updateComponent++
        }

        getTabs(list) {
            tabs.value.list = list

            if (props.tab_slug) {
                setTimeout(() => {
                    tabs.value.set({tab: tabs.value.list.find(p => p.slug == props.tab_slug), is_module: false})
                }, 100);
            } else if (!tabs.value.is_module) {
                const available = tabs.value.list.find(p => p.enabled && (!p.childs || p.childs.length == 0))
                if (!tabs.value.initialized) {
                    tabs.value.initialized = true
                    if (available && available.tab != tabs.value.active.tab) {
                        setTimeout(() => {
                            tabs.value.set({tab: available, is_module: false})
                        }, 100);
                    }
                    return
                }
                const current = tabs.value.list.find(p => p.tab == tabs.value.active.tab && p.enabled)
                if (!current) {
                    if (available && available.tab != tabs.value.active.tab) {
                        setTimeout(() => {
                            tabs.value.set({tab: available, is_module: false})
                        }, 100);
                    }
                }
            }
        }

        setTab(tab) {
            tabs.value.set(tab)
        }

        getTitle(title) {
            this.header.name = title
        }

        getColumns(columns) {
            this.columns = columns
        }

        getHiddenFields(fields) {
            this.hiddenFields = Array.isArray(fields) ? fields : []
        }

        getProducts(list) {
            this.productsList = Array.isArray(list) ? list : []
        }

        setProductsDraft(rows) {
            this.productsDraft = Array.isArray(rows) ? rows : null
        }

        async basedProducts(entity) {
            let products = JSON.parse(JSON.stringify(this.productsList || [])).map(({ isChoose, edit, local_id, ...row }) => row)
            const withRemaining = (row, remaining) => ({
                ...row,
                product_count: remaining,
                product_sum: remaining * Number(row.product_price || 0),
                product_shipped: 0
            })

            if (entity.slug === 'expense_invoices' && SHIPMENT_SOURCES.includes(this.slug)) {
                return products
                    .map(row => withRemaining(row, Math.max(0, Number(row.product_count || 0) - Number(row.product_shipped || 0))))
                    .filter(row => Number(row.product_count) > 0)
            }

            if (this.slug === 'deals' && SHIPMENT_SOURCES.includes(entity.slug)) {
                let usage = []
                try {
                    const url = routes.relations.productsCheck.replace('${slug}', this.slug).replace('${id}', this.id)
                    const response = await api.callMethod('GET', url)
                    usage = response?.status == 200 ? (response.data?.usage ?? []) : []
                } catch (e) {
                    usage = []
                }
                const find = (row) => {
                    const id = Number(row.id || row.product_id?.value?.[0] || 0)
                    const name = String(row.product_name ?? '').trim().toLowerCase()
                    return usage.find(u => (id && u.id === id) || (!id && name && String(u.name).trim().toLowerCase() === name))
                }
                return products
                    .map(row => {
                        const used = find(row)
                        if (!used || used.is_service) return { ...row, product_shipped: 0 }
                        return withRemaining(row, Math.max(0, Number(row.product_count || 0) - Number(used.used || 0)))
                    })
                    .filter(row => Number(row.product_count) > 0)
            }

            return products.map(row => ({ ...row, product_shipped: 0 }))
        }

        checkIsTrash(isTrash) {
            this.isTrash = isTrash
        }

        openModal(item) {
            emit('openModal', item)
        }

        async createBased(entity) {
            const defaults = {}
            const collect = (field) => {
                const fields = field.type === 'text_group' && Array.isArray(field.fields) ? field.fields : [field]
                for (const item of fields) {
                    if (!item.key || SKIP_BASED_KEYS.includes(item.key)) continue
                    if (item.value === undefined || item.value === null) continue
                    defaults[item.key] = JSON.parse(JSON.stringify(item.value))
                }
            }
            for (const columnKey in this.columns) {
                for (const section of this.columns[columnKey] ?? []) {
                    for (const field of section.fields ?? []) collect(field)
                }
            }
            for (const field of this.hiddenFields ?? []) collect(field)

            if ((this.productsList || []).length) {
                defaults.__products = await this.basedProducts(entity)
            }

            emit('openModal', {
                type: 'create',
                slug: entity.slug,
                id: 0,
                defaults,
                source: {
                    slug: this.slug,
                    id: this.id
                }
            })
        }

        closeDetail() {
            emit('close', true)
            emit('closeDetail', true)
        }

        async saveDraftProducts(slug, id) {
            if (!Array.isArray(this.productsDraft)) return false
            const products = this.productsDraft
                .filter(row => row.id || (row.product_name && String(row.product_name).trim() !== ''))
                .map(row => ({
                    id: row.id,
                    name: row.name,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    product_price: row.product_price,
                    product_count: row.product_count,
                    product_weight: row.product_weight,
                    product_volume: row.product_volume,
                    product_sum: row.product_sum
                }))
            this.productsDraft = null
            try {
                const response = await api.callMethod('PUT', routes.table.set_products.replace('${parent_slug}', slug).replace('${page_id}', id), { products })
                return response?.status == 200
            } catch (e) {
                return false
            }
        }

        async savePage(response) {
            const item = response.data

            if (this.isGlobalEdit) {
                const wasCreate = !this.id
                const slug = props.slug ?? router.params.slug
                this.isGlobalEdit = false
                this.isCopy = false
                this.id = item.id

                let productsSaved = false
                if (wasCreate && item.id) {
                    productsSaved = await this.saveDraftProducts(slug, item.id)
                }
                this.updateComponent++

                if (wasCreate && props.source?.slug && props.source?.id && item.id) {
                    api.callMethod('POST', routes.relations.create, {
                        source_slug: props.source.slug,
                        source_id: props.source.id,
                        target_slug: slug,
                        target_id: item.id,
                        copy_products: !productsSaved
                    }).then(response => {
                        relationsVersion.value++
                        if (response?.data?.products_copied || response?.data?.b24_copied) {
                            this.updateComponent++
                        }
                    }).catch(() => {})
                }
                emit('updateMetaHeader', {
                    title: item.header_title || '',
                    href: {
                        id: item.id,
                        slug: detail.value.slug
                    },
                })
            }

        }
        
        updateMetaHeader(meta) {
            emit('updateMetaHeader', meta)
        }
    }

    const detail = ref(new Detail())

    const relationsVersion = useState('object-relations-version', () => 0)

    const basedEntities = computed(() => BASED_ENTITIES[props.slug ?? router.params.slug] ?? [])

    const canEditTitle = computed(() => {
        const field = common.findColumnField(detail.value.columns, 'name')
        return field ? !!field.can_edit : true
    })

    const stageField = computed(() => {
        for (const column in detail.value.columns) {
            for (const section of detail.value.columns[column] ?? []) {
                for (const field of section.fields ?? []) {
                    if (field.type == 'deal_stages') return field
                }
            }
        }
        return null
    })
    const tabs = ref(new Tabs())

    onMounted(() => {
        detail.value.get()
    })

    onUnmounted(() => {
        emit('closeDetail', true)
    })
</script>