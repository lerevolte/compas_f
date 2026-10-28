<template>
    <main>
        <div class="page__header logistic-header">
            <div class="logistic-header__group">
                <AppH1 id="mobile-menu-target">
                    Складская логистика
                </AppH1>
                <AppDateFilter
                    v-model="activeDate"
                    @update:modelValue="setDate"
                />
            </div>
        </div>

        <WarehouseLogisticTemplate
            :activeDate="activeDate"
            @openModal="item => emit('openModal', item)"
        />
    </main>
</template>

<script setup>
    import { format } from 'date-fns'
    import { Common } from '@/helpers/classes.js'
    import AppH1 from '@AppComponents/Headers/H1/H1.vue'
    import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue'
    import WarehouseLogisticTemplate from '@AppTemplates/WarehouseLogistic/WarehouseLogistic.vue'

    const DATE_KEY = 'warehouse-logistic-active-date'
    const common = new Common()
    const route = useRoute()

    const emit = defineEmits(['openModal'])

    const activeDate = ref(format(new Date(), 'yyyy-MM-dd'))

    const normalize = (value) => {
        const date = value instanceof Date ? value : new Date(value)
        return Number.isNaN(date.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(date, 'yyyy-MM-dd')
    }

    const readDate = () => {
        const query = common.getQueryUrl()
        if (query && query['active-date']) {
            activeDate.value = normalize(query['active-date'])
            return
        }
        try {
            const saved = localStorage.getItem(DATE_KEY)
            if (saved) activeDate.value = normalize(saved)
        } catch (e) {}
    }

    const setDate = (value) => {
        const date = normalize(value ?? activeDate.value)
        activeDate.value = date
        common.setQueryUrl(`?active-date=${date}`)
        try { localStorage.setItem(DATE_KEY, date) } catch (e) {}
    }

    onMounted(() => {
        readDate()
        useHead({
            title: 'Складская логистика | Compas.pro'
        })
    })

    watch(() => route.fullPath, () => readDate())
</script>
