<template>
    <div class="detail">
        <header ref="detailHeaderRef" id="mobile-menu-target" class="detail-page__header">
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
            <div class="detail-page__actions" v-show="!detail.header.editTitle && !props.isGlobalEdit">
                <IconEdit  @click="() => detail.header.initEditTitle({
                    textarea: textareaRef.textareaRef.querySelector('textarea'),
                    columns: detail.columns,
                    slug: detail.slug,
                    id: detail.id
                })"/>
                <AppShowMore 
                    :isPreventBottom="true"
                    :options="[
                        {
                            name: 'Скопировать ссылку',
                            action: 'copyLink'
                        },
                        {
                            name: 'Скопировать внешнюю ссылку',
                            action: 'copyExternalLink'
                        }
                    ]"
                    @initClick="action => detail.header[action]()"
                />
            </div>
        </header>
        <AppTabs 
            :tabs="tabs.list"
            :activeTab="tabs.active?.tab"
            :isModule="tabs.is_module"
            :disableAll="detail.isGlobalEdit"
            :slug="detail.slug"
            :options="{
                modal: tabs.modal
            }"
            @action="item => tabs[item.action](item.value)"
        />
        <DetailDynamic 
            :tabs="tabs"
            :id="detail.id"
            :slug="detail.slug"
            :options="{
                isModule: tabs.is_module,
                isCopy: detail.isCopy,
                isGlobalEdit: detail.isGlobalEdit
            }"
            :updateComponent="detail.updateComponent"
            :headerName="detail.header.name"
            @action="item => detail[item.action](item.value)"
        />
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

    const textareaRef = ref(null)
    const detailHeaderRef = ref(null)
    const router = useRoute()
    const common = new Common()

    const emit = defineEmits([
        'closeDetail',
        'updateMetaHeader',
        'openModal'
    ])

    const props = defineProps({
        slug: {
            default: '',
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
                this.active = tab
            }
            this.is_module = is_module
        }
    }
   
    class Detail {
        constructor() {
            this.id = null
            this.slug = null
            this.header = new HeaderEditable()
            this.updateComponent = 0
            this.columns = {}
            this.isGlobalEdit = false
            this.isCopy = false
        }

        // Получение данных
        get() {
            this.id = props.id ?? router.params.id
            this.isGlobalEdit = props.isGlobalEdit
            this.isCopy = props.isCopy
            this.slug = props.slug ?? router.params.slug
            this.updateComponent++
        }

        // Получение табов
        getTabs(list) {
            tabs.value.list = list
        }

        // Обновление заголовка
        getTitle(title) {
            this.header.name = title
        }

        // Получение колонок
        getColumns(columns) {
            this.columns = columns
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
                    title: item.header_title,
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
    const tabs = ref(new Tabs())

    onMounted(() => {
        detail.value.get()
    })

    onUnmounted(() => {
        emit('closeDetail', true)
    })
</script>