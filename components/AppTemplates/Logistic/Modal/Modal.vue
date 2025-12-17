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

        <div class="logistic-modal__steps">
            <div 
                class="logistic-modal__step modal-step" 
                v-for="step in route.steps.list" 
                :class="{'logistic-modal__step_active': step.slug == route.steps.active?.slug}"
                @click="route.steps.active = step"
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
                title: 'Создание раздела',
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
            this.filter = reactive({
                cars: null,
                company: null,
                employees: null
            })
            this.savedOptions = reactive([
                {
                    slug: 'q',
                    label: 'Поиск',
                    value: null
                },
                {
                    slug: 'company',
                    label: 'Компания',
                    value: null
                },
                {
                    slug: 'cars',
                    label: 'Машина',
                    value: null
                },
                {
                    slug: 'employees',
                    label: 'Сотрудник',
                    value: null
                }
            ])
        }

        // Инициализация вычисляемых свойств
        initComputed() {
            this.computedFilter = computed({
                get: () => {
                    return Object.values(this.filter).filter(p => p)
                },
                set: (val) => {
                    this.setFilterValue(this.steps.active.slug, {val: val.value, label: val.label.text, origin: val})
                }
            })
            this.computedSavedOptions = computed({
                get: () => {
                    setTimeout(() => {
                        selectPadding.value = selectValuesRef.value?.offsetWidth 
                    }, 10);
                    return this.savedOptions.filter(p => p.value)
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
            this.filter[slug] = val.value
            let findedOption = this.savedOptions[this.savedOptions.findIndex(p => p.slug == slug)]
            findedOption.value = val.label

            if (val.origin) {
                findedOption.origin = val.origin
                this.steps.list[this.steps.list.findIndex(p => p.slug == slug)].value = val.origin
            } 

            route.value.entities.cars.filterMachine()
            route.value.entities.employees.filterEmployee()
        }

        // Удаление опций
        deleteOption(option) {
            if (option.slug) {
                if (option.slug == 'company') {
                    this.entities.company.active = null
                } else {
                    let findedStep = this.steps.list[this.steps.list.findIndex(p => p.slug == option.slug)]
                    if (findedStep) findedStep.value = null
                }
            }
            this.setFilterValue(option.slug, {value: null, label: null})
        }

        create() {
            emit('create', {
                id: 0,
                date: format(new Date(), 'yyyy-MM-dd'),
                car_id: this.filter.cars ? [this.filter.cars] : null,
                employee_id: this.filter.employees ? [this.filter.employees] : null
            })
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

        // Фильтрация машин
        async filterMachine() {
            const request = ['entity=cars']
            if (route.value.filter.company) request.push(`filter[company_id]=${route.value.filter.company}`)
            if (route.value.filter.employees) request.push(`filter[employee_id]=${route.value.filter.employees}`)
            const response = await api.callMethod('GET', `${routes.logistic.getModalCars}&${request.join('&')}`)
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

        // Фильтрация машин
        async filterEmployee() {
            const request = ['entity=employees']
            if (route.value.filter.company) request.push(`filter[company_id]=${route.value.filter.company}`)
            if (route.value.filter.cars) request.push(`filter[car_id]=${route.value.filter.cars}`)
            const response = await api.callMethod('GET', `${routes.logistic.getModalEmployees}&${request.join('&')}`)
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
