<template>
    <div class="chart" :class="{'chart_loading': chart.loading}">
        <div class="chart__header">
            <span class="chart__header-text">
                {{ chart.title || 'График' }}
            </span>
        </div>
        <div class="chart__content">
            <IconLoader v-show="chart.loading" />
            <div 
                v-show="!chart.loading"  
                class="chart-container"
                :class="{'chart-container_empty': chart?.data?.legend?.filter(p => p.data.length > 0).length == 0}"
                ref="chartRef"
            ></div>
        </div>
    </div>
</template>

<script setup>
    import './Chart.scss';

    import { ref, onMounted, watch } from 'vue'
    import api from '@/helpers/api.js'
    import { Common } from '@/helpers/classes.js'
    import routes from '@/helpers/routes.js'
    import Highcharts from 'highcharts'
    import IconLoader from '@AppIcons/Loader.vue'
    import { format } from 'date-fns'
    import uniq from 'lodash/uniq'
    import isEqual from 'lodash/isEqual'
    
    const chartRef = ref(null)

    const emit = defineEmits([
        'getData'
    ])

    const props = defineProps({
        options: {
            default: {
                slug: null,
                date_range: {
                    start: null,
                    end: null
                },
                type: null,
                group: null,
                sort: {
                    field: null,
                    order: null
                },
                isEnableRows: false
            },
            type: Object
        },
        settings: {
            default: {
                type: 'line',
                isLabelEnable: true,
                isShowGrid: true
            }
        },
        activeSeries: {
            default: [],
            type: Array
        }
    })

    class Chart {
        constructor() {
            this.title = null
            this.chart = null
            this.data = null
            this.loading = false
            this.error = null
        }

        // Получение данных
        async get() {
            this.error = null
            
            try {
                this.loading = true
                this.title = null
                let request = []
                if (props.options?.date_range?.start) request.push(`period[start]=${format(props.options?.date_range.start, 'yyyy-MM-dd')}`)
                if (props.options?.date_range?.end) request.push(`period[end]=${format(props.options?.date_range.end, 'yyyy-MM-dd')}T23:59:59.999Z`)
                if (props.options?.type) request.push(`type=${props.options?.type}`)
                if (props.options?.group) request.push(`group_by=${props.options?.group}`)
                if (props.options?.sort?.field) request.push(`sort_field=${props.options?.sort.field}`)
                if (props.options?.sort?.order) request.push(`sort_order=${props.options?.sort.order}`)
                if (props.settings.isEnableRows != undefined) request.push(`enable_rows=${props.settings.isEnableRows ? 1 : 0}`)

                const response = await api.callMethod('GET', `${routes.chart.getChart.replace('${slug}', props.options?.slug)}?${request.join('&')}`)
                this.data = response.data
                this.title = response.data.title
                this.set(response.data.legend)
                emit('getData', response.data)
            } catch (error) {
                console.error('Ошибка загрузки данных графика:', error)
                this.error = 'Не удалось загрузить данные графика'
            } finally {
                this.loading = false
            }
        }

        // Установка значений у графика
        set(legend) {
            if (legend && legend.length > 0) {
                let categories = []
                let series = []

                const type = props.settings?.type
                const isPie = type === 'pie'
                for (let row of legend) {
                    series.push({
                        // Явно задаём тип серии, иначе при переключении графика
                        // на круговую серия оставалась линией (8587).
                        type: type,
                        name: row.name,
                        color: row.color,
                        data: row.data.map((item) => {
                            const raw = item[0] ? String(item[0]).split(' ')[0] : null
                            const parsed = raw ? new Date(raw) : null
                            const cat = parsed && !isNaN(parsed) ? format(parsed, 'dd.MM.yy') : raw
                            categories.push(cat)
                            const value = Number(common.transformPrice(item[1], 2)) || item[1]
                            // Для круговой диаграммы точке нужно имя, иначе
                            // Highcharts подписывает сектора дефолтным «Slice» (8587).
                            return isPie ? { name: cat, y: value } : value
                        })
                    })
                }

                categories = uniq(categories)

                this.chart.update({
                    chart: { type: type },
                    xAxis: {
                        categories: categories,
                        tickInterval: Math.floor(categories.length / 10),
                    },
                    series: JSON.parse(JSON.stringify(series))
                }, true, true)
            }
        }

        // Инициализация графика
        init() {
            if (!chartRef.value) return
            
            this.chart = Highcharts.chart(chartRef.value, {
                chart: {
                    height: props.settings?.height || 400,
                    type: props.settings?.type,
                    spacingTop: 10, 
                    spacingRight: 0, 
                    spacingBottom: 0, 
                    spacingLeft: 0
                },
                title: null,
                xAxis: {
                    // Контент
                    categories: [],
                    // Подсвечивание промежутка при наведении
                    crosshair: {
                        enabled: true,
                        width: 1,
                        color: '#bcbcbc',
                        snap: false
                    },
                    // Количество вертикальных линий
                    tickAmount: 7,
                    // Цвет вертикальных линий
                    gridLineWidth: props.settings?.isShowGrid ? 1 : 0,
                    gridLineColor: '#E5E7EB',
                    gridLineDashStyle: 'Solid',
                    // убираем подписи категорий
                    labels: {
                        enabled: props.settings?.isLabelEnable ?? true 
                    },
                },
                yAxis: {
                    // Контент
                    title: {
                        text: null
                    },
                    // Количество вертикальных линий
                    tickAmount: 7,
                    // Цвет вертикальных линий
                    gridLineWidth: props.settings?.isShowGrid ? 1 : 0,
                    gridLineColor: '#E5E7EB',
                    gridLineDashStyle: 'Solid',
                    // убираем подписи категорий
                    labels: {
                        enabled: props.settings?.isLabelEnable ?? true 
                    },
                },
                series: [
                    {
                        name: 'Загрузка',
                        data: []
                    }
                ],
                tooltip: {
                    shared: true,
                    backgroundColor: '#1c2734',
                    borderColor: '#000000',  
                    borderRadius: 5, 
                    borderWidth: 1,
                    padding: 10,   
                    style: {
                        color: '#ffffff',  
                        fontSize: '12px',
                    },
                    valueSuffix: null
                },
                legend: {
                    enabled: false
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            // Показываем дату и значение сектора, а не дефолтное «Slice».
                            format: '{point.name}: {point.y}'
                        }
                    },
                    series: {
                        marker: {
                            enabled: false
                        },
                        events: {
                            // подсветка активной серии при клике
                            click: function () {
                                const chart = this.chart;

                                chart.series.forEach(s => {
                                if (s === this) {
                                    s.update({ opacity: 1 }, false);
                                } else {
                                    s.update({ opacity: 0.3 }, false);
                                }
                                });

                                chart.redraw();
                            }
                        },
                        states: {
                            hover: {
                                enabled: true, 
                                lineWidthPlus: 0,
                                halo: { size: 0 },
                                opacity: 1 
                            },
                            inactive: {
                                enabled: false
                            }
                        },
                    }
                }
            })
        }
    }

    const chart = ref(new Chart())
    const common = new Common()

    onMounted(() => {
        chart.value.init()
        chart.value.get()
    })

    watch(() => props.settings?.type, (newType, prev) => {
        if (isEqual(newType, prev)) return
        // Пере-собираем серии с новым типом и правильным форматом точек
        // (для pie — {name, y}, иначе число). set() уже проставляет type серии
        // и chart.type. Используем сохранённый legend, без повторного запроса.
        if (chart.value.chart && chart.value.data?.legend) {
            chart.value.set(chart.value.data.legend)
        } else {
            chart.value.get()
        }
    })

    watch(() => props.options, (newType, prev) => {
        if (isEqual(newType, prev)) return
        chart.value.get()
    })

    watch(() => props.activeSeries, (newType, prev) => {
        if (isEqual(newType, prev)) return
        
        chart.value.chart.series.forEach((series, index) => {
            chart.value.chart.series[index].setVisible(props.activeSeries[index].active, false)
        })
        chart.value.chart.redraw()
    })

    
</script>
