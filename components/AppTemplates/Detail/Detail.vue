<template>
    <div class="detail">
        <header ref="detailHeaderRef" id="mobile-menu-target" class="detail-page__header">
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
            :disableAll="props.isGlobalEdit"
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
                isCopy: props.isCopy,
                isGlobalEdit: props.isGlobalEdit
            }"
            :updateComponent="detail.updateComponent"
            @action="item => detail[item.action](item.value)"
        />
    </div>
</template>

<script setup>
    import './Detail.scss'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common, HeaderEditable } from '@/helpers/classes.js'
    import IconEdit from '@AppIcons/Actions/Edit.vue';
    import AppTabs from '@AppComponents/Tabs/Tabs.vue';
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue';
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import DetailDynamic from './Dynamic/Dynamic.vue';
    import debounce from 'lodash/debounce'

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
                this.queryTab = {
                    is_slug: true,
                    id: findedField && findedField.value && findedField.value.value ? findedField.value.value : 'null'
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
        }

        // Получение данных
        get() {
            this.id = props.id ?? router.params.id
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

        // Обновление метаданных страницы
        updateMetaHeader(meta) {
            emit('updateMetaHeader', meta)
        }
    }

    // Колонки
    class Columns {
        constructor() {
            this.edit = {
                action: 'cancel',
                loading: false,
                state: false,
                backups: [],
                fields: [],
                errorSections: {
                    state: false,
                    sections: {}
                }
            }

            this.saveFields = debounce(this.saveFields.bind(this), 100)
        }

        // Отмена редактирования определенной секции
        cancelSection(fields) {
            this.edit.backups = this.edit.backups.filter(item => fields.findIndex(field => field.id == item.id) == -1)

            if (this.edit.backups.length == 0) {
                this.setSavedFields()
            }
        }

        // Отмена редактирования полей
        cancel() {
            this.setSavedFields()
        }

        // Инициализация сохранения полей
        save() {
            this.edit.action = null
            nextTick(() => {
                this.edit.action = 'save'
                this.edit.errorSections.state = false
            })
        }

        // Сохранение полей
        async saveFields(updateTitle = true) {
            try {
                console.log(tabs.value.is_module);
                if (this.edit.errorSections.state) return
                this.edit.loading = true

                let request = Object.assign({}, ...this.edit.fields.map(field => {
                    return {
                        [field.key]: field.type == 'relation' ? field.value?.value : field.value
                    }
                }))

                await api.callMethod('POST', routes.detail.edit_fields.replace('${slug}', detail.value.slug), {
                    rows: [{
                        ...request,
                        id: tabs.value.is_module ? module.value.id : detail.value.id
                    }]
                })

                if (updateTitle) {
                    const findedField = this.edit.fields.find(item => item.key == 'name')
                    
                    if (findedField) {
                        detail.value.header.name = typeof findedField.value == 'object' && findedField.value != null ? findedField.value.value : findedField.value
                    }
                }
            } catch (error) {
                console.log(error);
            } finally {
                this.setSavedFields(true)
                this.edit.loading = false
            }
        }

        // Проверка валидности секции
        getSectionValidate(response) {
            if (response.state) {
                this.edit.errorSections.state = true
            }
            this.saveFields()
        }

        // Обновление сохраняемых полей
        setSavedFields(isUpdate = false) {
            if (isUpdate) {
                let findedField = null
                
                for (let column in this.list) {
                    for (let section of this.list[column]) {
                        for (let field of section.fields) {
                            field.edit = false
                            findedField = this.edit.fields.find(item => item.id == field.id)
                            if (findedField) {
                                field.value = findedField.value
                            }
                        }
                    }
                }
            }

            this.edit = {
                action: 'cancel',
                loading: false,
                state: false,
                backups: [],
                fields: [],
                errorSections: {
                    state: false,
                    sections: {}
                }
            }
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