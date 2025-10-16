<template>
    <div class="filter" ref="filterRef" :class="{ 'filter_open': filter.state.isOpen }">
        <div class="filter__header" :class="{'filter__header_fill': filter.state.activeTabs.length > 0}">
            <AppInput @click="event => filter.toggleOptions(event)" @keyup.enter="filter.updateInfo()" v-model="filter.state.search" :options="{ id: 0, title: '', type: 'text', name: 'search', placeholder: 'Поиск', autocomplete: 'off' }">
                <IconSearch />
            </AppInput>

            <div class="filter__tabs" v-if="filter.state.activeTabs.length > 0" @click="event => filter.toggleOptions(event)">
                <div class="filter__tab" v-for="tab in filter.state.activeTabs" :data-key="tab.key" :key="tab.key" >
                    {{ tab.label }}: {{ filter.setTabValue(tab) }}
                    <IconClose @click="filter.deleteTab(tab)" />
                </div>
            </div>
        </div>

        <IconSearch class="filter__mobile-search" @click="event => filter.toggleOptions(event)"/>

        <div class="filter__content" v-if="filter.state.fields.length > 0 || filter.state.activeTabs.length > 0">
            <div class="filter__info" @click="filter.closeContent(null, true)">
                <IconSelectArrow />
                Фильтр
            </div>

            <div class="filter__fields">
                <AppInput 
                    v-show="filter.state.activeTabs.length > 0" 
                    class="filter__field_search"
                    @keyup.enter="filter.updateInfo()" 
                    v-model="filter.state.search" 
                    :options="{ id: 0, title: 'Поиск', type: 'text', name: 'search', placeholder: '', autocomplete: 'off' }" 
                />


                <template v-for="field in filter.state.fields">
                    <AppSelect 
                        v-if="field.type == 'select' || field.type == 'relation'"
                        :options="field"
                        v-model="filter.state.tabsValues[field.key]"
                        @update:list="options => field.options = options"
                    />
                    <AppDate 
                        v-else-if="field.type == 'date'"
                        :options="field"
                        v-model="filter.state.tabsValues[field.key]"
                    />
                    <AppSelect 
                        v-else-if="field.type == 'boolean'"
                        :options="field"
                        v-model="filter.state.tabsValues[field.key]"
                    />
                    <AppInput 
                        v-else
                        :options="field"
                        v-model="filter.state.tabsValues[field.key]"
                        @keyup.enter="filter.updateInfo()" 
                    />

                </template>
            </div>

            <div class="filter__actions">
                <AppButton @click="(event) => filter.dropUnsavedFields()">
                    Отмена
                </AppButton>
                <AppButton class="button_fill" @click="filter.updateInfo()">
                    Поиск
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Filter.scss';
    
    import IconClose from '@AppIcons/Close.vue';
    import IconSearch from '@AppIcons/Input/Search.vue';
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import { format  } from 'date-fns'
    import isEqual from 'lodash/isEqual'

    const filterRef = ref(null)

    const props = defineProps({
        fields: {
            default: [],
            type: Array
        }
    })

    const emit = defineEmits([
        'update'
    ])

    class Filter {
        constructor() {
            this.filterRef = filterRef

            this.state = reactive({
                activeTabs: [],
                search: '',
                isOpen: false,
                fields: [],
                tabsValues: {}
            });

            // Закрытие опций
            this.closeContent = (event, state = false) => {
                if (state ||(this.filterRef.value && !this.filterRef.value.contains(event.target))) {
                    this.state.isOpen = false;
                    document.removeEventListener('click', this.closeContent);
                }
            };
        }

        // Удаление несохранённых полей
        dropUnsavedFields() {
            for (let key in this.state.tabsValues) {
                if (key == 'search') {
                    this.state.search = this.state.tabsValues.search ?? null
                } else {
                    let findedField = this.state.activeTabs.find(tab => tab.key == key)
                    this.state.tabsValues[key] = findedField ? findedField.value : null
                }
            }

            this.closeContent(null, true)
        }

        // Обновление информации
        updateInfo() {
            const setValue = (key) => {
                // Трансформация дат
                const transformDate = (item) => {
                    if (Array.isArray(item)) {
                        return `${format(item[0], 'dd.MM.yyyy')} - ${format(item[1], 'dd.MM.yyyy')}`
                    } else {
                        return format(item, 'dd.MM.yyyy')
                    }
                }

                // Трансформация селекта
                const transformSelect = (item, type = 'select') => {
                    if (Array.isArray(item)) {
                        return item.join(', ')
                    } else {
                        return item
                    }
                }

                const findedField = this.state.fields.find(field => field.key == key)
                

                switch (findedField.type) {
                    case 'date':
                        return transformDate(this.state.tabsValues[key])
                    case 'select':
                        return transformSelect(this.state.tabsValues[key])
                    case 'relation':
                        return transformSelect(this.state.tabsValues[key], 'searchable')
                    default:
                        return this.state.tabsValues[key]
                }
            }

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
            emit('update', this.state.activeTabs)
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (this.state.isOpen && this.filterRef.value.contains(event.target)) return
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeContent);
            } else {
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

        setTabValue(tab) {
            const findedField = this.state.fields.find(field => field.key == tab.key)
            
            if (typeof tab.value == 'boolean') {
                return tab.value ? 'Да' : 'Нет'
            } else if (findedField && findedField.type == 'relation') {
                return findedField.options?.find(option => option.value == tab.value)?.label
            } else {
                return tab.value
            }
        }

        // Получение полей
        getFields() {
            this.state.fields = JSON.parse(JSON.stringify(props.fields))

            this.state.fields.forEach(element => {
                if (element.type == 'boolean') {
                    element.list = [
                        {
                            label: 'Да',
                            value: true
                        },
                        {
                            label: 'Нет',
                            value: false
                        }
                    ]
                }
                this.state.tabsValues[element.key] = null
            });
        }
    }

    onMounted(() => {
        filter.getFields()
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', filter.closeContent);
    });

    watch(() => props.fields, (next, prev) => {
        if (!isEqual(next.map(p => p.key), prev.map(p => p.key))) {
            filter.getFields()
        }
    })

    const filter = new Filter(filterRef)

    defineExpose({
        filter: filter
    })
</script>
