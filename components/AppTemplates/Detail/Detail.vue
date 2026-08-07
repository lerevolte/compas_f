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
            <div class="detail-page__actions" v-if="!props.is_external && !detail.forbidden" v-show="!detail.header.editTitle && !props.isGlobalEdit">
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
        }
    })

    // Табы
    class Tabs {
        constructor() {
            this.active = {
                tab: "order"
            }
            this.is_module = false
            this.queryTab = {}
            this.list = []
        }

        // Установка активного таба
        set({tab, is_module}) {
            if (is_module) {
                this.active = tab  
                detail.value.updateComponent++
            } else if (['order', 'history', 'module'].includes(tab.tab)) {
                if (this.is_module && tab.tab == 'order') {
                    detail.value.updateComponent++
                }
                this.queryTab = {}
                this.active = tab
            } else {
                const findedField = common.findColumnField(detail.value.columns, tab.tab)
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
                // Деталка удалённого объекта: во вкладках связанных сущностей
                // показываем и удалённые записи (detail вернул их ID в value).
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

        // Получение данных
        get() {
            this.id = props.id ?? router.params.id ?? router.params.token
            this.isGlobalEdit = props.isGlobalEdit
            this.isCopy = props.isCopy
            this.slug = props.slug ?? router.params.slug
            this.updateComponent++
        }

        // Получение табов
        getTabs(list) {
            tabs.value.list = list

            if (props.tab_slug) {
                setTimeout(() => {
                    tabs.value.set({tab: tabs.value.list.find(p => p.slug == props.tab_slug), is_module: false})
                }, 100);
            } else if (!tabs.value.is_module) {
                const current = tabs.value.list.find(p => p.tab == tabs.value.active.tab && p.enabled)
                if (!current) {
                    const available = tabs.value.list.find(p => p.enabled && (!p.childs || p.childs.length == 0))
                    if (available && available.tab != tabs.value.active.tab) {
                        setTimeout(() => {
                            tabs.value.set({tab: available, is_module: false})
                        }, 100);
                    }
                }
            }
        }

        // Установка активного таба
        setTab(tab) {
            tabs.value.set(tab)
        }

        // Обновление заголовка
        getTitle(title) {
            this.header.name = title
        }

        // Получение колонок
        getColumns(columns) {
            this.columns = columns
        }

        checkIsTrash(isTrash) {
            this.isTrash = isTrash
        }

        // Открытие модального окна
        openModal(item) {
            emit('openModal', item)
        }

        closeDetail() {
            emit('close', true)
            emit('closeDetail', true)
        }

        savePage(response) {
            const item = response.data

            if (this.isGlobalEdit) {
                this.isGlobalEdit = false
                this.updateComponent++
                this.isCopy = false
                this.id = item.id
                emit('updateMetaHeader', {
                    title: item.header_title || '',
                    href: {
                        id: item.id,
                        slug: detail.value.slug
                    },
                })
            }

        }
        
        // Обновление метаданных страницы
        updateMetaHeader(meta) {
            emit('updateMetaHeader', meta)
        }
    }

    const detail = ref(new Detail())

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