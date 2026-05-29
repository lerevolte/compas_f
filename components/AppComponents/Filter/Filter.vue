<template>
    <div class="filter" ref="filterRef" :class="{ 'filter_open': filter.state.isOpen }">
        <div class="filter__header" :class="{'filter__header_fill': filter.state.activeTabs.length > 0}">
            <AppInput 
                @click="event => filter.toggleOptions(event)" 
                @keyup.enter="filter.updateInfo()" 
                v-model="filter.state.search" 
                :options="{ 
                    id: 0, 
                    title: '', 
                    type: 'text', 
                    name: 'search', 
                    placeholder: ' Фильтр + поиск', 
                    autocomplete: 'off' 
                }"
            />

            <div class="filter__tabs" ref="filterTabsRef" v-if="filter.state.activeTabs.length > 0 || filter.state.hiddenTabs.length > 0" @click="event => filter.toggleOptions(event)">
                <div class="filter__tab" v-for="tab in filter.state.activeTabs" :data-key="tab.key" :key="tab.key" >
                    {{ tab.label }}: {{ filter.setTabValue(tab) }}
                    <IconClose @click="filter.deleteTab(tab)" />
                </div>
                <div class="filter__tab filter-tab filter__tab_other" v-if="filter.state.hiddenTabs.length > 0">
                    <div class="filter-tab__title">
                        и еще {{ filter.state.hiddenTabs.length }}
                    </div>
                    <IconClose @click="filter.clearHiddenTabs()" />
                </div>
            </div>
        </div>

        <IconSearch class="filter__mobile-search" @click="event => filter.toggleOptions(event)"/>

        <div class="filter__content" v-if="filter.state.fields.length > 0 || filter.state.activeTabs.length > 0">
            <div class="mobile-filter__header">
                <div class="filter__info" @click="filter.closeContent(null, true)">
                    <IconArrowBack />
                    Фильтр + поиск
                </div>

                <div class="filter__header" :class="{'filter__header_fill': filter.state.activeTabs.length > 0}">
                    <AppInput 
                        @keyup.enter="filter.updateInfo()" 
                        v-model="filter.state.search" 
                        :options="{ 
                            id: 0, 
                            title: '',
                            type: 'text',
                            name: 'search', 
                            placeholder: ' Фильтр + поиск', 
                            autocomplete: 'off' 
                        }"
                    />

                    <div class="filter__tabs" v-if="filter.state.activeTabs.length > 0">
                        <div class="filter__tab" v-for="tab in filter.state.activeTabs" :data-key="tab.key" :key="tab.key" >
                            {{ tab.label }}: {{ filter.setTabValue(tab) }}
                            <IconClose @click="filter.deleteTab(tab)" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="filter__group">
                <div class="filter__fields" v-if="filter.state.search || filter.state.searchEnabled">
                    <div class="filter__field" :class="{'filter__field_disabled': filter.state.activeTabs.length == 0}">
                        <AppInput
                            class="filter__field_search"
                            @keyup.enter="filter.updateInfo()"
                            v-model="filter.state.search"
                            :options="{ id: 0, title: 'Поиск', type: 'text', name: 'search', placeholder: '', autocomplete: 'off' }"
                        />
                    </div>
                </div>

                <draggable
                    tag="div"
                    group="filter-fields"
                    v-model="filter.state.fields" 
                    :forceFallback="true"
                    :fallbackOnBody="true"
                    item-key="id" 
                    handle=".icon_drag-field"
                    class="filter__fields"
                    drag-class="draggable-drag"
                    ghost-class="draggable-ghost"
                    fallback-class="draggable-fallback"
                    @start="filter.dragStart()"
                    @end="filter.dragEnd()"
                >
                    <template #item="{ element: field }">
                        <div class="filter__field" :class="{'filter__field_disabled': !field.enabled}">
                            <IconDrag 
                                class="icon_drag-field"
                            />
                            <AppSelect 
                                v-if="field.type == 'select_dropdown' || field.type == 'relation'"
                                :isPreventBottom="true"
                                :options="{
                                    ...field,
                                    list: field.options ?? [],
                                    isHaveNull: true,
                                    searchable: field.type == 'relation',
                                    relation: field.type == 'relation' ? field.id : null
                                }"
                                v-model="filter.state.tabsValues[field.key]"
                                @update:list="options => field.options = options"
                                @update:modelList="options => field.options = options"
                            />
                            <AppDate 
                                v-else-if="field.type == 'date'"
                                :options="{
                                    id: field.id,
                                    title: field.title,
                                    type: field.type,
                                    name: field.name,
                                    multiple: true,
                                    placeholder: field.placeholder
                                }"
                                v-model="filter.state.tabsValues[field.key]"
                            />
                            <AppSelect 
                                v-else-if="field.type == 'boolean'"
                                :isPreventBottom="true"
                                :options="{
                                    ...field,
                                    multiple: false
                                }"
                                v-model="filter.state.tabsValues[field.key]"
                            />
                            <AppStatus 
                                v-else-if="field.type == 'status'"
                                :isPreventBottom="true"
                                :options="{
                                    ...field,
                                    edit: true,
                                    list: field.options,
                                    isHaveNull: false,
                                }"
                                v-model="filter.state.tabsValues[field.key]"
                            />
                            <AppInput 
                                v-else
                                :options="field"
                                v-model="filter.state.tabsValues[field.key]"
                                @keyup.enter="filter.updateInfo()" 
                            />
                            <AppPopup class="field__settings" :isPreventBottom="true">
                                <template #header>
                                    <IconSettings />
                                </template>
                                <template #content>
                                    <div class="popup__option" @click="e => {
                                        field.enabled = false
                                        filter.savedFilter.updateSavedFilter()
                                        e.target?.closest('.popup')?.classList.remove('popup_open')
                                    }">
                                        Скрыть
                                    </div>
                                </template>
                            </AppPopup>
                        </div>
                    </template>
                </draggable> 

                <AppPopup class="filter__popup" :isPreventBottom="true">
                    <template #header>
                        <AppButton class="button_text">
                            Выбрать поле
                        </AppButton>
                    </template>
                    <template #content>
                        <AppCheckbox
                            class="popup__option popup__option_checkbox"
                            v-model="filter.state.searchEnabled"
                            :options="{title: 'Поиск'}"
                        />
                        <AppCheckbox
                            class="popup__option popup__option_checkbox"
                            v-for="field in filter.state.fields"
                            v-model="field.enabled"
                            :options="field"
                            @update:modelValue="filter.savedFilter.updateSavedFilter()"
                        />
                    </template>
                </AppPopup>

                <div class="filter__actions" v-show="filter.savedFilter.active.state">
                    <AppButton class="button_fill" @click="filter.savedFilter.save()">
                        Сохранить
                    </AppButton>
                    <AppButton @click="(event) => filter.savedFilter.cancel()">
                        Отмена
                    </AppButton>
                </div>
                <div class="filter__actions" v-show="!filter.savedFilter.active.state">
                    <AppButton class="button_fill" @click="filter.updateInfo()">
                        Найти
                    </AppButton>
                    <AppButton @click="(event) => filter.dropUnsavedFields()">
                        Сбросить
                    </AppButton>
                </div>
            </div>

            <div class="filter__group">
                <strong class="filter__subtitle">
                    Сохраненные
                </strong>
                <div class="filter__saves">
                    <div 
                        v-for="(save, index) in savedFilters" 
                        class="filter__save filter-save" 
                        :class="{'filter__save_active': save.id == filter.savedFilter.active.id}"
                        @click="!filter.savedFilter.active.state && filter.savedFilter.get(save, index)"
                    >
                        <div class="filter-save__title">
                            <AppInput 
                                v-if="filter.savedFilter.active.state && filter.savedFilter.active.id == save.id"
                                :options="{ 
                                    id: 0, 
                                    title: null, 
                                    type: 'text', 
                                    name: 'saved-filter-title', 
                                }"
                                v-model="filter.savedFilter.active.title"
                            />
                            <span class="text" v-else>
                                {{ save.title }}
                            </span>
                        </div>

                        <AppShowMore 
                            @click.prevent.stop
                            :options="filter.savedFilter.actions"
                            :isPreventBottom="true"
                            @initClick="action => filter.savedFilter[action](save, index)"
                        />
                    </div>
                    <AppInput 
                        v-if="filter.savedFilter.active.state && filter.savedFilter.active.id == 'new'"
                        :options="{ 
                            id: 0, 
                            title: null, 
                            type: 'text', 
                            name: 'saved-filter-title', 
                        }"
                        v-model="filter.savedFilter.active.title"
                    />
                </div>
                <AppButton class="button_text filter__add" @click="filter.savedFilter.initCreate()">
                    + Добавить фильтр
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Filter.scss';
    
    import draggable from 'vuedraggable'; 
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import IconClose from '@AppIcons/Close.vue';
    import IconSearch from '@AppIcons/Input/Search.vue';
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import isEqual from 'lodash/isEqual'
    import { Common } from '~/helpers/classes';
    import IconArrowBack from '@AppIcons/ArrowBack.vue';
    import IconSettings from '@AppIcons/Actions/Settings.vue'
    import IconDrag from '@AppIcons/Actions/Drag.vue'

    const filterRef = ref(null)
    const injectedFilter = inject('filter')
    const filterTabsRef = ref(null)
    const common = new Common()
    const classObserver = ref(null)
    const resizeObserver = ref(null)
    const tabsWidthObserver = ref(null)
    let checkTabsWidthTimeout = null
    let isCheckingTabs = false

    // Сдвигаем каретку инпута за чипсами фильтров: ставим на .filter__header
    // CSS-переменную --filter-tabs-width, равную фактической ширине .filter__tabs.
    // Иначе пользователь не может ввести поисковый запрос, когда фильтры применены.
    const updateTabsWidthVar = () => {
        if (typeof document === 'undefined') return
        const headers = document?.querySelectorAll?.('.filter > .filter__header') || []
        const tabsEls = filterTabsRef.value
        const w = tabsEls ? Math.round(tabsEls.getBoundingClientRect().width) : 0
        headers.forEach(h => h.style.setProperty('--filter-tabs-width', `${w}px`))
    }

    const props = defineProps({
        filter: {
            default: {
                fields: [],
                saves: []
            },
            type: Object
        }
    })

    class Filter {
        constructor() {
            this.filterRef = filterRef
            this.savedFilter = new SavedFilter(this)

            this.state = reactive({
                activeTabs: [],
                hiddenTabs: [],
                search: '',
                searchEnabled: false,
                isOpen: false,
                fields: [],
                tabsValues: {}
            });

            // Закрытие опций
            this.closeContent = (event, state = false) => {
                if (state || (this.filterRef.value && !this.filterRef.value.contains(event.target))) {
                    this.state.isOpen = false;
                    document.removeEventListener('click', this.closeContent);
                }
            };
        }

        // Удаление несохранённых полей
        dropUnsavedFields() {
            console.log('dropUnsavedFields called');
            for (let key in this.state.tabsValues) {
                this.state.tabsValues[key] = null
            }
            this.state.search = null
            this.state.activeTabs = []
            
            this.updateInfo()
            this.closeContent(null, true)
        }

        // Обновление информации
        updateInfo() {
            const setValue = (key, type = null) => {
                // Трансформация селекта
                const transformSelect = (item, key, type = null) => {
                    const field = this.state.fields.find(p => p.key == key)
                    if (field) {
                        const findedOption = field.options.find(option => option.value == item)
                        if (type == 'request') {
                            return findedOption?.value
                        } else {
                            return field.type == 'status' || field.type == 'relation' ? findedOption.label?.text : findedOption.label
                        }
                    }
                }

                const findedField = this.state.fields.find(field => field.key == key)
                let response = null
                switch (findedField.type) {
                    case 'date':
                        response = common.transformDate(this.state.tabsValues[key], type == 'request' ? 'yyyy-MM-dd' : 'dd.MM.yyyy')
                        if (type == 'request') {
                            response = response.replace(' - ', '%2C')
                        }
                        return response
                    case 'select_dropdown':
                        return transformSelect(this.state.tabsValues[key], key, type)
                    case 'status':
                        return transformSelect(this.state.tabsValues[key], key, type)
                    case 'relation':
                        return transformSelect(this.state.tabsValues[key], key, type)
                    default:
                        return this.state.tabsValues[key]
                }
            }
            this.state.hiddenTabs = []
            this.state.activeTabs = Object.keys(this.state.tabsValues).filter(key => (this.state.tabsValues[key] || typeof this.state.tabsValues[key] == 'boolean') && key != 'search').map(key => (
                {
                    label: this.state.fields.find(field => field.key == key)?.title,
                    key: key,
                    value: setValue(key) 
                }
            ))

            if (this.state.search && this.state.activeTabs.find(tab => tab.key == 'search')) {
                let findedTab = this.state.activeTabs.findIndex(tab => tab.key == 'search')
                this.state.activeTabs[findedTab] = { label: 'Поиск', key: 'search', value: this.state.search }
            } else if (this.state.search && this.state.activeTabs.find(tab => tab.key == 'search') == undefined) {
                this.state.activeTabs.push({ label: 'Поиск', key: 'search', value: this.state.search })
            }

            this.closeContent(null, true)

            const request = JSON.parse(JSON.stringify(Object.keys(this.state.tabsValues))).filter(key => (this.state.tabsValues[key] || typeof this.state.tabsValues[key] == 'boolean') && key != 'search').map(key => (
                {
                    label: this.state.fields.find(field => field.key == key)?.title,
                    key: key,
                    value: setValue(key, 'request')
                }
            ))
            if (this.state.search) {
                request.push({ label: 'Поиск', key: 'search', value: this.state.search })
            }
            console.log('updateInfo request:', request);
            injectedFilter.get(request)

            // После применения поиск дублировался: одно и то же значение лежало
            // и в инпуте, и в чипе. Сбрасываем value инпута — чип в filter__tabs
            // остаётся единственным источником, в нём пользователь видит активный
            // поиск и может его сбросить крестиком.
            this.state.search = ''
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (this.state.isOpen && this.filterRef.value.contains(event.target)) return
            this.state.isOpen = !this.state.isOpen;
            if (this.state.isOpen) {
                document.addEventListener('click', this.closeContent);
            } else {
                filter.value.dropUnsavedFields();
                filterRef.value.querySelector('input').blur();
                document.removeEventListener('click', this.closeContent);
            }
        }

        // Удаление вкладки
        deleteTab(tab) {
            this.state.activeTabs = this.state.activeTabs.filter(p => p.key != tab.key)
            this.state.tabsValues[tab.key] = null

            if (tab.key == 'search') {
                this.state.search = ''
            }

            this.updateInfo()
        }

        clearHiddenTabs() {
            for (let tab of this.state.hiddenTabs) {
                this.state.activeTabs = this.state.activeTabs.filter(p => p.key != tab.key)
                this.state.tabsValues[tab.key] = null
    
                if (tab.key == 'search') {
                    this.state.search = ''
                }
            }

            this.updateInfo()
        }

        setTabValue(tab) {
            if (typeof tab.value == 'boolean') {
                return tab.value ? 'Да' : 'Нет'
            } else {
                return tab.value
            }
        }

        // Получение полей
        getFields() {
            this.state.fields = JSON.parse(JSON.stringify(injectedFilter.fields))

            this.state.fields.forEach(element => {
                this.state.tabsValues[element.key] = null
            });

            this.savedFilter.setDefaultFields()
            this.savedFilter.updateSort()
        }

        updateFields(savedFilterFields) {
            let findedField = null

            for (let field of savedFilterFields) {
                findedField = this.state.fields.find(f => f.key == field.key)
                
                if (findedField) {
                    findedField.value = field.value
                    findedField.enabled = true
                }
            }
        }

        dragStart() {
            document.body.classList.add('body_unselected')
        }

        dragEnd() {
            this.savedFilter.updateSavedFilter()
            document.body.classList.remove('body_unselected')
        }
    }

    // Сохраненный фильтр
    class SavedFilter {
        constructor() {
            this.actions = [
                {
                    name: 'Вверх',
                    action: 'moveUp',
                    enabled: true
                },    
                {
                    name: 'Вниз',
                    action: 'moveDown',
                    enabled: true
                },
                {
                    name: 'Редактировать',
                    action: 'initEdit',
                    enabled: true
                },
                {
                    name: 'Удалить',
                    action: 'delete',
                    enabled: true
                }
            ]

            this.backupTemplate = null

            this.active = reactive({
                id: 0,
                is_hidden: false,
                title: '',
                fields: [],
                state: false
            })
        }

        // Обновление сортировки
        updateSort() {
            injectedFilter.saves = injectedFilter.saves.map((p, index) => {
                p.sort = p.is_hidden ? -1 : index
                return p
            })
        }
 
        // Получение полей и значений из сохраненного фильтра
        get(item, is_update = true) {
            let findedField = null
            let flag = false
            this.active.id = item.id

            for (let field of item.fields) {
                findedField = filter.state.fields.find(f => f.key == field.key)
                if (findedField) {
                    filter.state.tabsValues[field.key] = field.value

                    if (!findedField.enabled) {
                        flag = true
                        findedField.enabled = true
                    }
                }
            }

            if (is_update) {
                // filter.updateInfo()
            }

            if (flag) {
                this.updateSavedFilter()
            }
        }

        // Перемещение сохраненного фильтра вверх
        moveUp(item, index) {
            if (index <= 0) return
            const prev = savedFilters.value[index - 1]
            const curr = savedFilters.value[index];
            [prev.sort, curr.sort] = [curr.sort, prev.sort]
            savedFilters.value = savedFilters.value.map((p, index) => ({ ...p, sort: index }))
            injectedFilter.moveSavedFilters(savedFilters.value.map(p => p.id))
        }

        // Перемещение сохраненного фильтра вниз
        moveDown(item, index) {
            if (index >= savedFilters.value.length - 1) return
            const curr = savedFilters.value[index]
            const next = savedFilters.value[index + 1];
            [next.sort, curr.sort] = [curr.sort, next.sort]
            savedFilters.value = savedFilters.value.map((p, index) => ({ ...p, sort: index }))
            injectedFilter.moveSavedFilters(savedFilters.value.map(p => p.id))
        }

        initEdit(item) {
            this.backupTemplate = JSON.parse(JSON.stringify(item))
            this.get(item, false)
            Object.assign(this.active, {
                id: item.id,
                title: item.title,
                state: true
            })
        }

        // Редактирование сохраненного фильтра
        save() {
            const request = {
                title: this.active.title,
                fields: filter.state.fields.filter(f => f.enabled).map((p, index) => {
                    return {
                        key: p.key,
                        value: filter.state.tabsValues[p.key],
                        sort: index
                    }
                }),
                id: this.active.id
            }

            if (this.active.id == 'new') {
                injectedFilter.createSavedFilter(request)
            } else {
                injectedFilter.updateSavedFilter(request)
            }
            
            this.clear()
        }

        // Инициализация создания
        initCreate() {
            this.active.state = true
            this.active.id = 'new'
            this.active.is_hidden = false
        }

        // Отмена редактирования
        cancel() {
            injectedFilter.saves[injectedFilter.saves.findIndex(p => p.id == this.active.id)] = this.backupTemplate
            this.clear()
        }

        // Очистка создания
        clear() {
            Object.assign(this.active, {
                id: 0,
                title: '',
                state: false
            })
        }

        // Установка полей дефолтного фильтра
        setDefaultFields() {
            const hiddenFilter = injectedFilter.saves.find(f => f.is_hidden)
            
            Object.assign(this.active, {
                id: hiddenFilter ? hiddenFilter.id : 0,
                title: null,
                state: false,
                fields: hiddenFilter ? hiddenFilter.fields : []
            })


            filter.state.fields = [
                ...this.active.fields,
                ...filter.state.fields.filter(
                    item => !this.active.fields.some(el => el.id === item.id)
                )
            ]
            filter.updateFields(this.active.fields)
        }

        // Обновление дефолтного фильтра
        updateSavedFilter(item = null) {
            const hiddenFilter = injectedFilter.saves.find(f => f.is_hidden)

            injectedFilter.updateSavedFilter({
                title: hiddenFilter.title,
                fields: filter.state.fields.filter(f => f.enabled).map((p, index) => {
                    return {
                        key: p.key,
                        value: p.value,
                        sort: index
                    }
                }),
                id: hiddenFilter.id
            })
        }

        // Удаление сохраненного фильтра
        delete(item) {
            injectedFilter.deleteSavedFilter(item.id)
        }
    }

    watch(() => injectedFilter.fields, (next, prev) => {
        if (!isEqual(next.map(p => p.key), prev.map(p => p.key))) {
            filter.getFields()
        }
    })

    const savedFilters = computed(() => {
        return injectedFilter.saves?.filter(p => !p.is_hidden).sort((p1, p2) => p1.sort - p2.sort)
    })  

    const filter = new Filter(filterRef)

    // Инициализация обсерверов
    const initObservers = () => {
        if (!filterTabsRef.value || !filterRef.value) return;

        // Следим за реальной шириной чипсов и прокидываем её через CSS-переменную.
        if (tabsWidthObserver.value) tabsWidthObserver.value.disconnect()
        tabsWidthObserver.value = new ResizeObserver(() => updateTabsWidthVar())
        tabsWidthObserver.value.observe(filterTabsRef.value)
        updateTabsWidthVar()

        // Отслеживание изменения длины плашек
        const checkTabsWidth = () => {
            if (isCheckingTabs) return;
            if (!filterTabsRef.value || !filterRef.value) return;
            
            // Очищаем предыдущий таймаут
            if (checkTabsWidthTimeout) {
                clearTimeout(checkTabsWidthTimeout)
            }
            
            // Debounce для избежания слишком частых вызовов
            checkTabsWidthTimeout = setTimeout(() => {
                isCheckingTabs = true
                
                const containerWidth = filterRef.value.offsetWidth
                const availableWidth = containerWidth - 100 // Запас 100px
                
                // Получаем все видимые табы (без элемента "и еще N")
                const visibleTabs = filterTabsRef.value.querySelectorAll('.filter__tab:not(.filter__tab_other)')
                const otherTab = filterTabsRef.value.querySelector('.filter__tab_other')
                
                // Вычисляем общую ширину видимых табов
                let totalTabsWidth = 0
                visibleTabs.forEach(tab => {
                    totalTabsWidth += tab.offsetWidth
                })
                
                // Добавляем ширину элемента "и еще N", если он есть
                if (otherTab && filter.state.hiddenTabs.length > 0) {
                    totalTabsWidth += otherTab.offsetWidth
                }
                
                // Если не влезает - перемещаем самый длинный таб в hiddenTabs
                // Продолжаем пока все не влезет
                while (totalTabsWidth > availableWidth && filter.state.activeTabs.length > 0) {
                    // Найти самый длинный элемент среди активных табов
                    let maxField = null
                    let maxFieldLength = 0
                    let maxFieldElement = null
                    
                    visibleTabs.forEach(tab => {
                        const tabWidth = tab.offsetWidth
                        if (tabWidth > maxFieldLength) {
                            maxFieldElement = tab
                            maxFieldLength = tabWidth
                        }
                    })
                    
                    if (maxFieldElement) {
                        const fieldKey = maxFieldElement.getAttribute('data-key')
                        const field = filter.state.activeTabs.find(p => p.key == fieldKey)
                        
                        if (field) {
                            filter.state.hiddenTabs.push(field)
                            filter.state.activeTabs = filter.state.activeTabs.filter((tab) => tab.key != field.key)
                            totalTabsWidth -= maxFieldLength
                            
                            // Обновляем список видимых табов
                            const newVisibleTabs = filterTabsRef.value.querySelectorAll('.filter__tab:not(.filter__tab_other)')
                            if (newVisibleTabs.length === 0) break
                        } else {
                            break
                        }
                    } else {
                        break
                    }
                }
                
                // Если влезает и есть скрытые табы - пытаемся вернуть обратно
                // Продолжаем пока есть место и скрытые табы
                while (totalTabsWidth <= availableWidth && filter.state.hiddenTabs.length > 0) {
                    // Берем последний добавленный таб (он был первым скрыт)
                    const fieldToRestore = filter.state.hiddenTabs[filter.state.hiddenTabs.length - 1]
                    
                    if (fieldToRestore) {
                        // Временно добавляем таб для проверки ширины
                        const tempTab = document.createElement('div')
                        tempTab.className = 'filter__tab'
                        tempTab.setAttribute('data-key', fieldToRestore.key)
                        tempTab.textContent = `${fieldToRestore.label}: ${filter.setTabValue(fieldToRestore)}`
                        tempTab.style.visibility = 'hidden'
                        tempTab.style.position = 'absolute'
                        tempTab.style.whiteSpace = 'nowrap'
                        filterTabsRef.value.appendChild(tempTab)
                        
                        const tempTabWidth = tempTab.offsetWidth
                        filterTabsRef.value.removeChild(tempTab)
                        
                        // Проверяем, влезет ли таб обратно
                        const newTotalWidth = totalTabsWidth + tempTabWidth
                        if (newTotalWidth <= availableWidth) {
                            filter.state.hiddenTabs = filter.state.hiddenTabs.filter((tab) => tab.key != fieldToRestore.key)
                            filter.state.activeTabs.push(fieldToRestore)
                            totalTabsWidth = newTotalWidth
                        } else {
                            break
                        }
                    } else {
                        break
                    }
                }
                
                isCheckingTabs = false
            }, 50) // Debounce 50ms
        }

        // MutationObserver для отслеживания изменений DOM
        if (classObserver.value) {
            classObserver.value.disconnect()
        }
        classObserver.value = new MutationObserver(checkTabsWidth)
        classObserver.value.observe(filterTabsRef.value, { 
            childList: true, 
            subtree: true, 
            attributes: true,
            attributeFilter: ['class', 'style']
        })

        // ResizeObserver для отслеживания изменений размера
        if (resizeObserver.value) {
            resizeObserver.value.disconnect()
        }
        resizeObserver.value = new ResizeObserver(checkTabsWidth)
        resizeObserver.value.observe(filterRef.value)
    }

    onMounted(async () => {
        filter.getFields()
        await nextTick();
        initObservers()
    })

    // Отслеживание появления filterTabsRef
    watch(() => filterTabsRef.value, (newVal) => {
        if (newVal) {
            nextTick(() => {
                initObservers()
            })
        }
    })

    // Отслеживание изменений activeTabs для переинициализации обсервера
    watch(() => filter.state.activeTabs.length, () => {
        nextTick(() => {
            initObservers()
        })
    })

    onBeforeUnmount(() => {
        if (checkTabsWidthTimeout) {
            clearTimeout(checkTabsWidthTimeout)
        }
        if (classObserver.value) classObserver.value.disconnect();
        if (resizeObserver.value) resizeObserver.value.disconnect();
        if (tabsWidthObserver.value) tabsWidthObserver.value.disconnect();
        document.removeEventListener('click', filter.closeContent);
    });

    defineExpose({
        filter: filter
    })
</script>
