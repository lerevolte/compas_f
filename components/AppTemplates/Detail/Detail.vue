<template>
    <IconLoader v-if="detail.loading || module.loading"/>
    
    <div class="detail" v-else>
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
                <IconEdit  @click="detail.header.initEditTitle()"/>
                <AppShowMore 
                    :isPreventBottom="true"
                    :options="showMore"
                    @initClick="action => detail.header[action]()"
                />
            </div>
        </header>
        <AppTabs 
            :tabs="tabs.list"
            :activeTab="tabs.active"
            :isModule="tabs.is_module"
            :disableAll="props.isGlobalEdit"
            :options="{
                modal: tabs.modal
            }"
            @action="item => tabs[item.action](item.value)"
        />

        <template v-if="tabs.is_module">
            <ColumnFields 
                :key="tabs.active"
                :role="tabs.active"
                :columns="module.columns.list"
                :edit="module.columns.edit"
                :hiddenFields="module.columns.hiddenFields"
                :options="{
                    isDisableFooter: true,
                    isHaveHistory: true,
                    isGlobalEdit: props.isGlobalEdit,
                    modal: module.columns.modal
                }"
                :history="{
                    fields: module.history.events,
                    loading: module.history.loading
                }"
                :pageId="module.id"
                @action="item => module.columns[item.action](item.value)"
                @openModal="item => module.openModal(item)"
                @showMoreHistory="page => module.history.update(page, module.tabs.active)"
            />
            <div class="detail__actions" :key="module.actionChange">
                <MassAction 
                    :isChoosed="module.columns.edit.state"
                    :actions="{
                        save: module.columns.edit.state,
                        edit: false,
                        cancel: true,
                        delete: false
                    }"
                    :loading="module.columns.edit.loading"
                    @action="action => module.columns[action.action](action.value)"
                />
            </div>
        </template>

        <template v-else>
            <AppHistory 
                v-if="tabs.active == 'history'"
                :title="'История изменений'"
                :history="detail.history.fields"
                :loading="detail.history.loading"
                @openModal="item => detail.openModal(item)"
                @showMoreHistory="page => detail.history.update(page, tabs.active)"
            />
            
            <ColumnFields 
                v-else-if="tabs.active == 'order'"
                :key="`column-fields_${detail.keyChange}`"
                :role="`column-fields_${detail.keyChange}`"
                :columns="detail.columns.list"
                :edit="detail.columns.edit"
                :hiddenFields="detail.columns.hiddenFields"
                :options="{
                    isDisableFooter: props.isGlobalEdit,
                    isHaveHistory: true,
                    isGlobalEdit: props.isGlobalEdit,
                    modal: detail.columns.modal
                }"
                :history="{
                    fields: detail.history.events,
                    loading: detail.history.loading
                }"
                :pageId="detail.id"
                @action="item => detail.columns[item.action](item.value)"
                @openModal="item => detail.openModal(item)"
                @showMoreHistory="page => detail.history.update(page, tabs.active)"
            />
    
            <AppVirtualTable 
                v-else
                :key="tabs.active"
                :options="{
                    isHaveQuery: true,
                    query: tabs.queryTab,
                    isHaveFilter: false
                }"
                :slug="tabs.list.find(item => item.tab == tabs.active).slug"
                @openModal="item => emit('openModal', item)"
            />
            <div class="detail__actions" :key="detail.actionChange">
                <MassAction 
                    :isChoosed="detail.columns.edit.state"
                    :actions="{
                        save: detail.columns.edit.state,
                        edit: false,
                        cancel: true,
                        delete: false
                    }"
                    :loading="detail.columns.edit.loading"
                    @action="action => detail.columns[action.action](action.value)"
                />
            </div>
        </template>
    </div>
</template>

<script setup>
    import './Detail.scss'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common } from '@/helpers/classes.js'
    import IconLoader from '@AppIcons/Loader.vue'
    import IconEdit from '@AppIcons/Actions/Edit.vue';
    import AppTabs from '@AppComponents/Tabs/Tabs.vue';
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppHistory from '@AppComponents/History/History.vue'; 
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue';
    import MassAction from '@AppComponents/MassAction/MassAction.vue'
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import ColumnFields from '@AppComponents/ColumnFields/ColumnFields.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import debounce from 'lodash/debounce'

    const textareaRef = ref(null)
    const detailHeaderRef = ref(null)
    const router = useRoute()

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

    const showMore = [
        {
            name: 'Скопировать ссылку',
            action: 'copyLink'
        },
        {
            name: 'Скопировать внешнюю ссылку',
            action: 'copyExternalLink'
        }
    ]

    class Detail {
        constructor(is_module = false) {
            this.is_module = is_module
            this.keyChange = 1
            this.actionChange = 1
            this.slug = ''
            this.id = ''
            this.loading = !is_module
            this.header = new Header()
            this.history = new History()
            this.columns = new Columns()
        }

        // Получение данных
        async get() {
            try {
                this.loading = true
                if (props.slug && props.id) {
                    this.id = props.id
                    this.slug = props.slug
                } else {
                    this.id = router.params.id
                    this.slug = router.params.slug
                }

                let response = null
                if (this.is_module) {
                    const route = routes.detail.module.replace('${slug}', detail.value.slug).replace('${id}', detail.value.id).replace('${tab}', tabs.value.active)
                    response = await api.callMethod('GET', route)
                } else {
                    response = await api.callMethod('GET', `${routes.detail.get.replace('${slug}', this.slug).replace('${id}', this.id)}${props.isCopy ? '?is_copy=1' : ''}`)
                    this.header.name = response.data.detail.title?.name
                    tabs.value.list = response.data.tabs
                    this.columns.hiddenFields = response.data.detail.hidden_fields
                    emit('updateMetaHeader', response.data.detail.header_title)
                }

                this.columns.list = response.data.detail.columns


                this.columns.edit.errorSections = {
                    state: false,
                    sections: {}
                }

                for (let column in this.columns.list) {
                    this.columns.list[column].forEach(section => {
                        this.columns.edit.errorSections.sections[section.id] = false
                    });
                } 
                this.history.get(response.data)
            } catch (error) {
                console.log(error);
            } finally {
                this.loading = false
            }
        }

        openModal(item) {
            emit('openModal', item)
        }
    }

    // Шапка
    class Header {
        constructor () {
            this.editTitle = false
            this.name = ''
        }

        // Копирование ссылки
        copyLink() {
            common.copyText(window.location.href)
        }

        // Копирование внешней ссылки
        copyExternalLink() {
            common.copyText(window.location.href)
        }

        // Редактирование заголовка
        initEditTitle() {
            this.editTitle = true
            nextTick(() => {
                textareaRef.value.textareaRef.querySelector('textarea').focus()
                document.addEventListener('click', checkClick);
            })
        }

        // Установка заголовка
        setTitle(e) {
            e.preventDefault()
            this.editTitle = false
            document.removeEventListener('click', checkClick);

            nextTick(() => {
                this.name = this.name.replaceAll('\n', '')
                const findedField = detail.value.columns.findField('name')
                
                if (findedField) {
                    typeof findedField.value == 'object' && findedField.value != null ? findedField.value.value = this.name : findedField.value = this.name
                    detail.value.keyChange++
                    detail.value.columns.edit.fields = [findedField]
                    detail.value.columns.saveFields(false)
                }
            })
        }
    }

    // Табы
    class Tabs {
        constructor() {
            this.active = "order"
            this.is_module = false
            this.module_state = false
            this.queryTab = {}
            this.list = []
            this.modal = {
                state: false,
                loading: false
            }
        }

        // Установка активного таба
        setTab(tab) {
            if (tab.is_module) {
                this.active = tab.tab  
                module.value.get()
            } else if (['order', 'history', 'module'].includes(tab.tab)) {
                if (this.is_module && tab.tab == 'order') {
                    detail.value.get()
                }
                this.queryTab = {}
                this.active = tab.tab
            } else {
                const section = [...detail.value.columns.list['column_1'], ...detail.value.columns.list['column_2']]
                const fields = section.map(section => section.fields).flat()
                const findedField = fields.find(field => field.key == tab.tab)
                if (findedField && findedField.value && findedField.value.value) {
                    if (findedField.value.value.length > 0) {
                        this.queryTab = {
                            id: findedField.value.value
                        }
                    } else {
                        this.queryTab = {
                            id: 'null'
                        }
                    }
                } else {
                    this.queryTab = {
                        id: 'null'
                    }
                }
                this.active = tab.tab
            }
            this.is_module = tab.is_module
        }

        // Сброс табов
        async resetTabs() {
            const response = await api.callMethod('GET', routes.detail.reset_tabs.replace('${slug}', detail.value.slug))
            this.list = response.data
        }

        // Обновление табов
        async updateTabs(value) {
            const route = routes.detail.update_tabs.replace('${slug}', detail.value.slug)
            await api.callMethod('PUT', value.role ? `${route}/role/${value.role}` : route, {menu: value.list})
        }

        // Обновление настроек табов
        async updateSettings(tab) {
            try {
                this.modal = {
                    state: true,
                    loading: true
                }
                const route = routes.detail.settings_tabs.replace('${slug}', detail.value.slug)
                await api.callMethod('PUT', route, {menu: this.list.map(item => item.tab == tab.tab ? {...item, ...tab} : item)})
            } catch (error) {
                console.log(error);
            } finally {
                this.modal = {
                state: false,
                loading: false
            }
            }
        }
    }

    // История
    class History {
        constructor() {
            this.events = {
                data: [],
                count: 1, 
                current_page: 1, 
                last_page: 1, 
                per_page: 1
            }

            this.fields = {
                data: [],
                count: 1, 
                current_page: 1, 
                last_page: 1, 
                per_page: 1
            }

            this.loading = false
        }

        // Получение истории
        get(response) {
            this.events = {...this.events, ...response.history_events}
            this.fields = {...this.events, ...response.history_fields}
        }

        // Обновление истории
        async update(page, tab) {
            try {
                this.loading = true
                const key = tab == 'order' ? 'events' : 'fields'
                const response = await api.callMethod('GET', routes.detail.history.replace('${slug}', detail.value.slug).replace('${id}', detail.value.id) + `?page=${page}&filter=${key}`)
                this[key].data = [...this[key].data, ...response.data.data]
                this[key].count = response.data.count
                this[key].current_page = response.data.current_page
                this[key].last_page = response.data.last_page
                this[key].per_page = response.data.per_page
            } catch (error) {
                console.log(error);
            } finally {
                this.loading = false
            }
        }
    }

    // Колонки
    class Columns {
        constructor() {
            this.list = {}
            this.modal = {
                field: {
                    state: false,
                    loading: false
                },
                section: {
                    state: false,
                    loading: false
                }
            }
            this.hiddenFields = []
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

        // Создание секции
        async createSection(section) {
            try {
                this.modal.section = {
                    state: true,
                    loading: true
                }

                const response = await api.callMethod('POST', routes.detail.create_section, {
                    name: section.name, 
                    column_id: section.key.replace('column_', ''),
                    slug: tabs.value.is_module ? module.value.slug : detail.value.slug
                })

                const createdSection = {
                    children: response.data.children,
                    fields: [],
                    id: response.data.id,
                    is_short: false,
                    name: response.data.name
                }

                this.list[section.key] = [...this.list[section.key], createdSection]
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.section = {
                    state: false,
                    loading: false
                }
            }
        }

        // Удаление секции
        async deleteSection(section) {
            try {
                this.modal.section = {
                    state: true,
                    loading: true
                }

                this.hiddenFields = section.fields
                await this.setHiddenFields(this.hiddenFields)
                await api.callMethod('DELETE', routes.detail.delete_section.replace('${id}', section.id))
                this.list[section.key] = this.list[section.key].filter(item => item.id != section.id)
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.section = {
                    state: false,
                    loading: false
                }
            }
        }

        // Обновление настроек секции
        async updateSection(section) {
            await api.callMethod('PUT', routes.detail.update_section.replace('${id}', section.id), {
                ...section, 
                slug: tabs.value.is_module ? module.value.slug : detail.value.slug
            })
        }

        // Установка скрытых полей
        async setHiddenFields(fields = []) {
            this.hiddenFields = fields
            await api.callMethod('POST', routes.detail.hidden_fields, {ids: this.hiddenFields.map(p => p.id)})
        }

        // Изменение порядка секций
        async changeOrderSection(request) {
            await api.callMethod('POST', routes.detail.change_order_section, request)
        }

        // Показать поле
        async showField(field) {
            try {
                await api.callMethod('PUT', routes.detail.show_field.replace('${id}', field.id), field)
            } catch (error) {
                console.log(error);
            }
        }

        // Создание поля
        async createField(field) {
            try {
                this.modal.field = {
                    state: true,
                    section: field.section_id
                }
                field.entity = tabs.value.is_module ? module.value.slug : detail.value.slug
                const response = await api.callMethod('POST', routes.detail.create_field, field)

                for (let column in this.list) {
                    this.list[column] = this.list[column].map(section => {
                        if (section.id == field.section_id) {
                            section.fields.push(response.data)
                        }
                        return section
                    })
                }
                tabs.value.is_module ? module.value.keyChange++ : detail.value.keyChange++
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.field = {
                    state: false,
                    section: field.section_id
                }
            }
        }

        // Обновление поля
        async updateField({field, update_columns = true}) {
            try {
                const findSection = (field) => {
                    for (let column in this.list) {
                        for (let section of this.list[column]) {
                            for (let localField of section.fields) {
                                if (field.id == localField.id) {
                                    return section
                                    
                                }                            
                            }
                        }
                    }
                }

                this.modal.field = {
                    state: true,
                    section: field.section_id
                }

                field.entity = tabs.value.is_module ? module.value.slug : detail.value.slug
                const response = await api.callMethod('PUT', routes.detail.update_field.replace('${id}', field.id), field)
                
                if (update_columns) {
                    let findedFieldIndex = null 
                    let findedSection = findSection(field)
                    response.data = Object.assign(response.data, field)
                    if (findedSection.id == field.section_id) {
                        findedFieldIndex = findedSection.fields.findIndex(item => item.id == field.id)
                        findedSection.fields[findedFieldIndex] = response.data
                    } else {
                        findedSection.fields = findedSection.fields.filter(item => item.id != field.id)
                        for (let column in this.list) {
                            for (let section of this.list[column]) {
                                if (section.id == field.section_id) {
                                    section.fields.push(response.data)
                                }
                            }
                        }
                    }

                    tabs.value.is_module ? module.value.keyChange++ : detail.value.keyChange++
                }
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.field = {
                    state: false,
                    section: field.section_id
                }
            }
        }

        // Инициализация редактирования полей
        initEditFields(fields = []) {
            this.edit.state = true
            this.edit.backups = [...this.edit.backups, ...JSON.parse(JSON.stringify(fields))]
            this.edit.fields = [...this.edit.fields, ...fields]
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
                tabs.value.is_module ? module.value.actionChange++ : detail.value.actionChange++

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
            tabs.value.is_module ? module.value.keyChange++ : detail.value.keyChange++
            tabs.value.is_module ? module.value.actionChange++ : detail.value.actionChange++
        }

        // Нахождение поля
        findField(key) {
            for (let column in this.list) {
                for (let section of this.list[column]) {
                    for (let field of section.fields) {
                        if (field.key == key) {
                            return field
                        }
                    }
                }
            }
            return null
        }

        // Удаление поля
        async deleteField({id, index}) {
            try {
                this.modal.field = {
                    state: true,
                    section: null
                }
                await api.callMethod('DELETE', routes.detail.delete_field.replace('${id}', id))
                this.list[index] = this.list[index].map(section => {
                    section.fields = section.fields.filter(f => f.id != id)
                    return section
                }) 
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.field = {
                    state: false,
                    section: null
                }
            }
        }

        // Изменение порядка полей
        async changeSortField(value) {
            await api.callMethod('POST', routes.detail.change_order_field, value)
        }
    }

    // Проверка клика вне заголовка при его редактировании
    const checkClick = (e) => {
        if (!detailHeaderRef.value.contains(e.target)) {
            detail.value.header.setTitle(e)
            document.removeEventListener('click', checkClick);
        } 
    }

    const detail = ref(new Detail(false))
    const module = ref(new Detail(true))
    const common = new Common()
    const tabs = ref(new Tabs())

    onMounted(() => {
        detail.value.get()
    })

    onUnmounted(() => {
        emit('closeDetail', true)
    })
</script>