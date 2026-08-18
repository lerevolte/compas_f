<template>
    <AppModalWarning 
        class="logistic__modal logistic-modal"
        :options="{
            title: props.modal.title,
            action: props.modal.action,
            actionTitle: props.modal.actionTitle,
            template: 'slot'
        }"
        :loading="props.modal.loading"
        @create="route.create()"
        @close="emit('close', true)"
    >
        <AppCategories 
            class="logistic-modal__categories"
			:list="route.entities.company.list" 
			:active="route.entities.company.active" 
			:modalActions="null"
			@action="action => route.entities.company[action.action](action.value)"
		>
			<template #name>
				Категории
			</template>
		</AppCategories>

        <div class="logistic-modal__right">
            <div class="logistic-modal__steps">
                <div
                    class="logistic-modal__step modal-step"
                    v-for="step in route.steps.list"
                    :class="{'logistic-modal__step_active': step.slug == route.steps.active?.slug}"
                    @click="route.switchTab(step)"
                >
                    <div class="modal-step__value">
                        <ModalItemValue
                            v-if="step.value"
                            :item="step.value"

                        />
                        <div class="modal-step__title" v-else>
                            {{step.title}}
                        </div>
                        <IconClose v-if="step.value" @click="route.deleteOption({slug: step.slug})"/>
                    </div>
                </div>
            </div>

            <AppSelect
                class="logistic-modal__filter"
                :style="`--selectPadding: ${selectPadding}px`"
                :options="{
                    title: null,
                    list: [],
                    isHaveQuery: true,
                    isSaveActiveOptions: true,
                    savedActiveOptions: route.computedSavedOptions,
                    query: {
                        entity: null,
                        'filter[company_id]': null
                    },
                    name: null,
                    edit: true,
                    isFullOption: true,
                    relation: route.steps.active?.field_id,
                    searchable: true,
                    required: false,
                    isHaveNull: false,
                    multiple: false,
                }"
                v-model="route.computedFilter"
                @searchEnter="text => route.applySearch(text)"
            >
                <div class="select__values" ref="selectValuesRef" v-if="route.computedSavedOptions">
                    <div class="select__value" v-for="option in route.computedSavedOptions" @click="route.deleteOption(option)">
                        {{ option?.label }}: {{ option?.value }}
                        <IconClose />
                    </div>
                </div>
            </AppSelect>

            <div class="logistic-modal__section">
                <div class="logistic-modal__section-header">
                    {{ route.steps.active?.sectionTitle }}
                </div>
                <div class="logistic-modal__section-body">
                    <div
                        class="logistic-modal__section-item"
                        v-for="item in route.entities[route.steps?.active?.slug]?.list"
                        :class="{'logistic-modal__section-item_active': item.value == route.filter[route.steps.active.slug]}"
                        @click="route.setFilterValue(route.steps.active.slug, {label: item.label.text, value: item.value, origin: item})"
                    >
                        <ModalItemValue
                            :item="item"
                        />
                    </div>
                </div>
            </div>
        </div>
    </AppModalWarning>
</template>

<script setup>
    import './Modal.scss';
    import { format } from 'date-fns'
    import routes from '@/helpers/routes.js'
    import api from '@/helpers/api.js'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
	import AppCategories from '@AppComponents/Categories/Categories.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import IconClose from '@AppIcons/Close.vue';
    import ModalItemValue from './Value.vue'
    
    const props = defineProps({
        modal: {
            default: {
                state: false,
                title: 'Создание маршрута',
                actionTitle: 'Создать маршрут',
                action: 'create',
                text: null,
                content: {
                    entities: {
                        company: {
                            active: null,
                            list: []
                        },
                        cars: {
                            active: null,
                            list: []
                        },
                        employees: {
                            active: null,
                            list: []
                        }
                    },
                    filter: {
                        q: null,
                        car: null,
                        company: null,
                        employees: null
                    },
                },
                loading: false
            },
            type: Object
        }
    })

    const emit = defineEmits([
        'create',
        'close'
    ])

    class Route {
        constructor() {
            this.steps = {
                active: {
                    field_id: 2064,
                    title: 'Выберите машину',
                    sectionTitle: 'Машины',
                    slug: 'cars'
                },
                list: [
                    {
                        field_id: 2064,
                        title: 'Выберите машину',
                        sectionTitle: 'Машины',
                        value: null,
                        slug: 'cars'
                    },
                    {
                        field_id: 1887,
                        title: 'Выберите сотрудника',
                        sectionTitle: 'Сотрудники',
                        value: null,
                        slug: 'employees'
                    }
                ]
            }
            this.entities = {
                company: new Company(),
                cars: new Car(),
                employees: new Employee(),
            }

            // Separate filters per tab
            this.tabFilters = reactive({
                cars: {
                    company: null,
                    cars: null,
                    employees: null,
                    q: null
                },
                employees: {
                    company: null,
                    cars: null,
                    employees: null,
                    q: null
                }
            })

            this.tabSavedOptions = reactive({
                cars: [
                    { slug: 'q', label: 'Поиск', value: null },
                    { slug: 'company', label: 'Компания', value: null },
                    { slug: 'cars', label: 'Машина', value: null },
                    { slug: 'employees', label: 'Сотрудник', value: null }
                ],
                employees: [
                    { slug: 'q', label: 'Поиск', value: null },
                    { slug: 'company', label: 'Компания', value: null },
                    { slug: 'cars', label: 'Машина', value: null },
                    { slug: 'employees', label: 'Сотрудник', value: null }
                ]
            })
            this.filter = reactive({
                cars: null,
                company: null,
                employees: null,
                q: null
            })
        }

        // Применить поиск из общего фильтр-инпута: сохранить как чип «Поиск: ...»
        // и перезагрузить список активной вкладки. Срабатывает по Enter.
        applySearch(text) {
            const tab = this.steps.active?.slug
            if (!tab) return
            const q = (text || '').trim()
            // Маршрутизируем через стандартный setFilterValue, чтобы строка
            // попала в чипы наравне с прочими фильтрами, и крестик «×» на чипе
            // работал из коробки (deleteOption → setFilterValue с пустым value).
            this.setFilterValue('q', { value: q || null, label: q || null })
        }

        // Инициализация вычисляемых свойств
        initComputed() {
            this.computedFilter = computed({
                get: () => {
                    const tab = this.steps.active?.slug
                    if (!tab) return []
                    return Object.values(this.tabFilters[tab]).filter(p => p)
                },
                set: (val) => {
                    this.setFilterValue(this.steps.active.slug, {value: val.value, label: val.label?.text ?? val.label, origin: val})
                }
            })
            this.computedSavedOptions = computed({
                get: () => {
                    const tab = this.steps.active?.slug
                    if (!tab) return []
                    setTimeout(() => {
                        selectPadding.value = selectValuesRef.value?.offsetWidth 
                    }, 10);
                    return this.tabSavedOptions[tab].filter(p => p.value)
                }
            })
        }

        // Получение всей информации
        get() {
            this.entities.company.get()
            this.entities.cars.get()
            this.entities.employees.get()
        }

        // Установка значения для фильтра
        setFilterValue(slug, val) {
            const tab = this.steps.active?.slug
            
            // Update tab-specific filter
            this.tabFilters[tab][slug] = val.value
            let findedOption = this.tabSavedOptions[tab][this.tabSavedOptions[tab].findIndex(p => p.slug == slug)]
            if (findedOption) {
                findedOption.value = val.label
                if (val.origin) {
                    findedOption.origin = val.origin
                }
            }

            // Update global filter and step value
            this.filter[slug] = val.value
            if (val.origin) {
                this.steps.list[this.steps.list.findIndex(p => p.slug == slug)].value = val.origin
            }

            // Only filter active tab's list
            if (tab == 'cars') {
                route.value.entities.cars.filterMachine()
            } else if (tab == 'employees') {
                route.value.entities.employees.filterEmployee()
            }
        }

        // Удаление опций
        deleteOption(option) {
            const tab = this.steps.active?.slug
            
            if (option.slug == 'company') {
                this.entities.company.active = null
            } else if (tab == option.slug) {
                // Only clear step value if deleting from own tab
                let findedStep = this.steps.list[this.steps.list.findIndex(p => p.slug == option.slug)]
                if (findedStep) findedStep.value = null
            }
            
            this.setFilterValue(option.slug, {value: null, label: null})
        }

        create() {
            // Берём значения из ПРОФИЛЬНЫХ вкладок:
            // car_id из вкладки «Машины» (там реально выбирали машину),
            // employee_id из вкладки «Сотрудники».
            // company_id — то, что выбрано на любой из вкладок (если убрали
            // компанию на сотрудниках — может остаться на машинах, и наоборот).
            // Из this.filter не берём: он отражает только последнее изменение
            // и обнуляется при удалении чипа в любой из вкладок.
            const carsTab = this.tabFilters?.cars || {}
            const empTab = this.tabFilters?.employees || {}
            const car = carsTab.cars ?? empTab.cars ?? null
            const employee = empTab.employees ?? carsTab.employees ?? null
            const company = carsTab.company ?? empTab.company ?? null

            // Берём подписи (labels) для имени маршрута из чипов обеих вкладок.
            const allOptions = [
                ...((this.tabSavedOptions?.cars) || []),
                ...((this.tabSavedOptions?.employees) || [])
            ]
            const carLabel = allOptions.find(p => p.origin?.value == car)?.value
            const empLabel = allOptions.find(p => p.origin?.value == employee)?.value
            const name = [carLabel, empLabel].filter(Boolean)

            // car_id, employee_id, company_id у route — одиночные relation,
            // передаём скаляром.
            emit('create', {
                id: 0,
                date: format(new Date(), 'yyyy-MM-dd'),
                company_id: company,
                car_id: car,
                name: name.length ? name.join(', ') : null,
                employee_id: employee
            })
        }

        switchTab(step) {
            const prevTab = this.steps.active?.slug
            this.steps.active = step
            const newTab = step.slug
            
            // If switching to employees for the first time — copy filters from cars tab
            if (newTab == 'employees' && !this.tabSavedOptions.employees.some(p => p.value)) {
                this.tabFilters.employees = { ...this.tabFilters.cars }
                this.tabSavedOptions.employees = JSON.parse(JSON.stringify(this.tabSavedOptions.cars))
                route.value.entities.employees.filterEmployee()
            }
            
            // Refresh the list for active tab
            if (newTab == 'cars') {
                route.value.entities.cars.filterMachine()
            } else if (newTab == 'employees') {
                route.value.entities.employees.filterEmployee()
            }
        }
    }

    class Company {
        constructor() {
            this.list = []
            this.active = null
        }

        async get() {
            const response = await api.callMethod('GET', routes.logistic.getModalCompanies)
            this.list = [{label: 'Все компании', value: null}, ...response.data.map(item => {
                return {
                    label: item.label?.text ?? 'Без названия',
                    value: item.value
                }
            })]
        }

        // Выбор компании
        set(category) {
			this.active = category.value
            if (this.active == null) {
                route.value.setFilterValue('company', {value: null, label: null})
            } else {
                route.value.setFilterValue('company', {value: category.value, label: category.label})
            }
        }
    }

    class Car {
        constructor() {
            this.list = []
            this.active = null
        }

        // Получение машин
        async get() {
            const response = await api.callMethod('GET', routes.logistic.getModalCars)
            this.list = response.data
        }


        async filterMachine() {
            const request = ['entity=cars']
            const filters = route.value.tabFilters.cars
            if (filters.company) request.push(`filter[company_id]=${filters.company}`)
            if (filters.employees) request.push(`filter[employee_id]=${filters.employees}`)
            // q — поиск, добавленный пользователем через Enter в фильтр-инпуте.
            const q = (filters.q || '').trim()
            const baseUrl = q
                ? `${routes.logistic.getModalCars}${encodeURIComponent(q)}`
                : routes.logistic.getModalCars
            const response = await api.callMethod('GET', `${baseUrl}&${request.join('&')}`)
            this.list = response.data
        }

    }

    class Employee {
        constructor() {
            this.list = []
            this.active = null
        }

        // Получение машин
        async get() {
            const response = await api.callMethod('GET', routes.logistic.getModalEmployees)
            this.list = response.data
        }

        async filterEmployee() {
            const request = ['entity=employees']
            const filters = route.value.tabFilters.employees
            if (filters.company) request.push(`filter[company_id]=${filters.company}`)
            if (filters.cars) request.push(`filter[car_id]=${filters.cars}`)
            const q = (filters.q || '').trim()
            const baseUrl = q
                ? `${routes.logistic.getModalEmployees}${encodeURIComponent(q)}`
                : routes.logistic.getModalEmployees
            const response = await api.callMethod('GET', `${baseUrl}&${request.join('&')}`)
            this.list = response.data
        }
    }

    const route = ref(new Route())
    const selectValuesRef = ref(null)
    const selectPadding = ref(0)
    route.value.initComputed()

    onMounted(() => {
        route.value.get()
    })
</script>
