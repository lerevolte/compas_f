<template>
    <div class="analytics__filter">
        <AppDateFilterRange 
            v-model="analytics.activeRange"
        />
    </div>
    <!-- <AppSelect 
        :options="{
            title: 'Период',
            list: selectPeriod.options,
        }"
        v-model="selectPeriod.value"
    /> -->


    <draggable
        tag="div"
        group="analytics-grid"
        v-model="analytics.sections" 
        :forceFallback="true"
        :fallbackOnBody="true"
        item-key="id" 
        handle=".icon_drag-field"
        class="analytics__grid"
        drag-class="draggable-drag"
        ghost-class="draggable-ghost"
        fallback-class="draggable-fallback"
        @start="analytics.dragStart()"
        @end="analytics.dragEnd()"
    >
        <template #item="{ element: section }">
            <div class="analytics__chart">
                <IconDrag class="icon_drag-field" />
                <AppChart 
                    :key="section.id"
                    :options="{
                        slug: section.key,
                        date_range: {
                            start: Array.isArray(analytics.activeRange) ? analytics.activeRange[0] : analytics.activeRange,
                            end: Array.isArray(analytics.activeRange) ? analytics.activeRange[1] : analytics.activeRange
                        },
                        type: section.key
                    }"
                    :settings="{
                        detail: selectPeriod.value,
                        type: section.config?.type ?? 'line',
                        height: 220,
                        isLabelEnable: false,
                        isShowGrid: false,
                        isEnableRows: true
                    }"
                    @click="() => emit('openModal', {
                        slug: section.key,
                        dateRange: analytics.activeRange,
                        template: 'chart'
                    })"
                />
            </div>
        </template>
    </draggable>

    <!--
        Блок «Статистика товаров по дням» — без графика. Открывается по клику
        как остальные блоки аналитики, но в модалке рендерится таблица
        статистики (template: 'product-stats'), а не AppAnalyticDetail (8557).
    -->
    <div class="analytics__grid analytics__grid_extra">
        <div
            class="analytics__chart analytics__chart_link"
            @click="emit('openModal', { slug: 'product-stats', template: 'product-stats' })"
        >
            <div class="analytics__chart-title">Статистика товаров по дням</div>
            <div class="analytics__chart-hint">Открыть таблицу →</div>
        </div>
    </div>
</template>

<script setup>
    import './Analytic.scss';

    import api from '@/helpers/api.js'
    import { format } from 'date-fns'
    import routes from '@/helpers/routes.js'
    import { readAnalyticsRange, writeAnalyticsRange } from '@/helpers/analyticsRange.js'
    import AppChart from '@AppComponents/Chart/Chart.vue'
    import AppDateFilterRange from '@AppComponents/DateFilter/Range.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import IconDrag from '@AppIcons/Actions/DragDotted.vue'
    import draggable from 'vuedraggable'; 

    const emit = defineEmits([
        'openModal'
    ])

    class Analytics {
        constructor() {
            this.sections = []
            this.activeRange = readAnalyticsRange() ?? [format(new Date(), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        }

        // Получение всех секций
        async get() {
            const response = await api.callMethod('GET', routes.chart.get)
            this.sections = response.data.sort((a, b) => a.order - b.order)
        }

        dragStart() {
            document.body.classList.add('body_unselected')
        }
 
        async dragEnd() {
            document.body.classList.remove('body_unselected')
            await api.callMethod('PUT', routes.chart.update, {
                order: this.sections.map(section => section.key)
            }) 
        }
    }

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

    watch(() => analytics.value.activeRange, value => writeAnalyticsRange(value), { deep: true })

    onMounted(() => {
        analytics.value.get()
    })
</script>
