<template>
    <AppModalWarning
        class="logistic__modal logistic-modal shift-modal"
        :options="{
            title: 'Создание рабочей смены',
            action: 'create',
            actionTitle: 'Создать смену',
            template: 'slot'
        }"
        :loading="props.loading"
        @create="create"
        @close="emit('close', true)"
    >
        <AppCategories
            class="logistic-modal__categories"
            :list="companies"
            :active="activeCompany"
            :modalActions="null"
            @action="action => action.action === 'set' && setCompany(action.value)"
        >
            <template #name>
                Категории
            </template>
        </AppCategories>

        <div class="logistic-modal__right">
            <div class="shift-modal__row">
                <div class="logistic-modal__step logistic-modal__step_active shift-modal__step">
                    <div class="modal-step__value">
                        <ModalItemValue v-if="selected" :item="selected" />
                        <div class="modal-step__title" v-else>Выберите сотрудника</div>
                    </div>
                </div>
                <input
                    class="shift-modal__search"
                    type="text"
                    placeholder="Поиск сотрудника"
                    v-model="query"
                    @input="onSearch"
                >
            </div>

            <div class="shift-modal__times">
                <label class="shift-modal__time">
                    <span>Смена с</span>
                    <input type="time" step="900" v-model="times.start_time">
                </label>
                <label class="shift-modal__time">
                    <span>до</span>
                    <input type="time" step="900" v-model="times.end_time">
                </label>
                <label class="shift-modal__time">
                    <span>Обед с</span>
                    <input type="time" step="900" v-model="times.break_start">
                </label>
                <label class="shift-modal__time">
                    <span>до</span>
                    <input type="time" step="900" v-model="times.break_end">
                </label>
            </div>

            <div class="logistic-modal__section">
                <div class="logistic-modal__section-header">
                    Сотрудники
                </div>
                <div class="logistic-modal__section-body">
                    <div v-if="!employees.length" class="shift-modal__empty">
                        {{ loadingList ? 'Загрузка...' : 'Сотрудники не найдены' }}
                    </div>
                    <div
                        v-for="item in employees"
                        :key="item.value"
                        class="logistic-modal__section-item"
                        :class="{ 'logistic-modal__section-item_active': item.value == selected?.value }"
                        @click="selected = item"
                    >
                        <ModalItemValue :item="item" />
                    </div>
                </div>
            </div>
        </div>
    </AppModalWarning>
</template>

<script setup>
    import '@AppTemplates/Logistic/Modal/Modal.scss';
    import './ShiftModal.scss';
    import routes from '@/helpers/routes.js'
    import api from '@/helpers/api.js'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppCategories from '@AppComponents/Categories/Categories.vue'
    import ModalItemValue from '@AppTemplates/Logistic/Modal/Value.vue'

    const props = defineProps({
        config: { default: null, type: Object },
        loading: { default: false, type: Boolean }
    })

    const emit = defineEmits(['create', 'close'])

    const companies = ref([])
    const activeCompany = ref(null)
    const employees = ref([])
    const selected = ref(null)
    const query = ref('')
    const loadingList = ref(false)
    const times = reactive({ ...(props.config?.shift_defaults || {
        start_time: '09:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00'
    }) })

    const searchUrl = (fieldId) => routes.warehouseLogistic.search.replace('${field_id}', fieldId)

    const loadCompanies = async () => {
        if (!props.config?.company_field_id) return
        const response = await api.callMethod('GET', searchUrl(props.config.company_field_id))
        const list = Array.isArray(response?.data) ? response.data : []
        companies.value = [{ label: 'Все компании', value: null }, ...list.map(item => ({
            label: item.label?.text ?? 'Без названия',
            value: item.value
        }))]
    }

    let requestSeq = 0
    const loadEmployees = async () => {
        if (!props.config?.employee_field_id) return
        const seq = ++requestSeq
        loadingList.value = true
        const params = ['entity=employees']
        if (activeCompany.value) params.push(`filter[company_id]=${activeCompany.value}`)
        const q = encodeURIComponent((query.value || '').trim())
        const response = await api.callMethod('GET', `${searchUrl(props.config.employee_field_id)}${q}&${params.join('&')}`)
        if (seq !== requestSeq) return
        employees.value = Array.isArray(response?.data) ? response.data : []
        loadingList.value = false
    }

    let searchTimer = null
    const onSearch = () => {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(loadEmployees, 300)
    }

    const setCompany = (category) => {
        activeCompany.value = category?.value ?? null
        loadEmployees()
    }

    const create = () => {
        emit('create', {
            employee_id: selected.value?.value ?? null,
            start_time: times.start_time || null,
            end_time: times.end_time || null,
            break_start: times.break_start || null,
            break_end: times.break_end || null
        })
    }

    onMounted(() => {
        loadCompanies()
        loadEmployees()
    })

    onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
