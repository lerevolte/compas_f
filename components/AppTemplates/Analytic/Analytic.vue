<template>
    <div class="analytics__filter">
        <AppDateFilterRange 
            v-model="analytics.activeRange"
        />
    </div>
    <!-- <AppSelect 
        :options="{
            title: 'Тип графика',
            list: select.options,
        }"
        v-model="select.value"
    />
    <AppSelect 
        :options="{
            title: 'Период',
            list: selectPeriod.options,
        }"
        v-model="selectPeriod.value"
    /> -->


    <div class="analytics__grid">
        <AppChart 
            :options="{
                slug: 'income',
                date_range: {
                    start: Array.isArray(analytics.activeRange) ? analytics.activeRange[0] : analytics.activeRange,
                    end: Array.isArray(analytics.activeRange) ? analytics.activeRange[1] : analytics.activeRange
                },
                type: 'income',
                group: 'account_id',
                sort: {
                    field: 'sum',
                    order: 'desc'
                }
            }"
            :settings="{
                detail: selectPeriod.value,
                type: select.value,
                height: 220,
                isLabelEnable: false,
                isShowGrid: true,
                isEnableRows: true
            }"
        />
    </div>
</template>

<script setup>
    import './Analytic.scss';

    import api from '@/helpers/api.js'
    import { format } from 'date-fns'
    import routes from '@/helpers/routes.js'
    import AppChart from '@AppComponents/Chart/Chart.vue'
    import AppDateFilterRange from '@AppComponents/DateFilter/Range.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'

    class Analytics {
        constructor() {
            this.sections = []
            this.activeRange = [format(new Date(), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        }

        // Получение всех секций
        async get() {
            const response = await api.callMethod('GET', routes.chart.get)
            console.log(response.data);
            
        }
    }

    const select = ref({
        value: 'line',
        options: [
            {
                label: 'Линия',
                value: 'line'
            },
            {
                label: 'Столбцы',
                value: 'column'
            },
            {
                label: 'Горизонтальные столбцы',
                value: 'bar'
            },
            {
                label: 'Заливка',
                value: 'area'
            },
            {
                label: 'Круговая диаграмма',
                value: 'pie'
            }
        ]
    })

    const selectPeriod = ref({
        value: 'day',
        options: [
            {
                label: 'День',
                value: 'day'
            },
            {
                label: 'Неделя',
                value: 'week'
            },
            {
                label: 'Месяц',
                value: 'month'
            }
        ]
    })

    const analytics = ref(new Analytics())

    onMounted(() => {
        analytics.value.get()
    })
</script>
