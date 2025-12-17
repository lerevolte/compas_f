<template>
    <div class="detail detail_analytics">
        <header ref="detailHeaderRef" id="mobile-menu-target" class="detail-page__header">
            <IconArrowBack @click="detail.closeDetail"/>
            <AppH1 class="textarea_title">
                {{ detail.title }}
            </AppH1>
        </header>

        <div class="analytics__filter">
            <AppDateFilterRange 
                v-model="detail.activeRange"
            />
            <AppStatus 
                v-model="detail.type.value"
                :options="{
                    edit: true,
                    list: detail.type.options
                }"
            />
        </div>

        <div class="analytics__detail-content">
            <AppChart 
                :options="{
                    slug: detail.slug,
                    date_range: {
                        start: Array.isArray(detail.activeRange) ? detail.activeRange[0] : detail.activeRange,
                        end: Array.isArray(detail.activeRange) ? detail.activeRange[1] : detail.activeRange
                    },
                    type: detail.slug,
                    group: 'account_id'
                }"
                :settings="{
                    detail: null,
                    type: detail.type?.value ?? 'line',
                    height: 220,
                    isLabelEnable: true,
                    isShowGrid: true,
                    isEnableRows: true
                }"
                @getData="(data) => detail.get(data)"
            />

            <AppVirtualTable 
                v-if="detail.slug"
                :slug="detail.slug"
                :path="null"
                :options="{
                    isHaveQuery: false,
                    isPermanentEdit: true,
                    isHaveFilter: false,
                    isHaveFooter: false,
                    isHaveTopHeader: true,
                    isTrash: false,
                    isLocalTable: true,
                    isAnalytic: true,
                    updatingCount: detail.table.counter
                }"
                :table="detail.table"
            />
        </div>
    </div>
</template>

<script setup>
    import './Detail.scss'

    import { format } from 'date-fns'
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import IconArrowBack from '@AppIcons/ArrowBack.vue';
    import AppChart from '@AppComponents/Chart/Chart.vue'
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppDateFilterRange from '@AppComponents/DateFilter/Range.vue'
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';

    const router = useRoute()

    const props = defineProps({
        dateRange: {
            default: null,
            type: Array
        },
        slug: {
            default: null,
            type: String
        }
    })

    const emit = defineEmits([
        'closeDetail',
        'updateMetaHeader',
        'openModal'
    ])

    class Detail {
        constructor() {
            this.title = null
            this.table = {
                tableKeys: null,
                list: null,
                counter: 0
            }
            this.slug = props.slug ?? router.params.type
            this.activeRange = props.dateRange ?? [format(new Date(), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
            this.type = {
                value: 'line',
                options: [
                    {
                        label: {
                            "file": '/icons/chart-type/line.svg',
                            "is_hidden": 0,
                            "color": null,
                            "text": "Линия"
                        }, 
                        value: 'line'
                    },
                    {
                        label: {
                            "file": '/icons/chart-type/columns.svg',
                            "is_hidden": 0,
                            "color": null,
                            "text": "Столбцы"
                        }, 
                        value: 'column'
                    },
                    {
                        label: {
                            "file": '/icons/chart-type/oblast.svg',
                            "is_hidden": 0,
                            "color": null,
                            "text": "Заливка"
                        }, 
                        value: 'area'
                    },
                    {
                        label: {
                            "file": '/icons/chart-type/round.svg',
                            "is_hidden": 0,
                            "color": null,
                            "text": "Круговая диаграма"
                        }, 
                        value: 'pie'
                    }
                ]
            }
        }

        get(response) {
            this.title = response.title
            this.table.table = response.table
            this.table.list = response.list
            this.table.counter++
            console.log(this.table);
        }

        closeDetail() {
            emit('close', true)
            emit('closeDetail', true)
        }
    }

    const detail = ref(new Detail())
</script>