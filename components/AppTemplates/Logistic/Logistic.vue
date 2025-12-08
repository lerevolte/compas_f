<template>
    <div class="logistic">
        <div class="logistic__column">
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'logistic_tasks'"
                    :key="'logistic_tasks'"
                    :options="{
                        title: 'Задачи логистики',
                        isHaveQuery: true,
                        query: {
                            route_id: null
                        },
                        isDraggable: true,
                        draggableTarget: '.table__row',
                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: logistic.logistic_tasks.updatingCount
                    }"
                    @openModal="item => emit('openModal', item)"
                />
            </AppResize>
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'routes'"
                    :key="'routes'"
                    :options="{
                        title: 'Маршруты',
                        isHaveQuery: true,
                        query: {
                            id: logistic.routes.id ?? null,
                            date: logistic.activeDate
                        },
                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: logistic.routes.updatingCount
                    }"
                    @openModal="item => emit('openModal', item)"
                />
            </AppResize>
        </div>
        <div class="logistic__column">
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppMap 
                    :options="{
                            showSelect: false
                    }"
                    :frameOptions="{
                        enableRoute: true
                    }"
                    :points="logistic.map"
                />
            </AppResize>
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'logistic_tasks'"
                    :key="'logistic_tasks'"
                    :options="{
                        title: 'Задачи в машине',
                        isDraggable: true,
                        draggableTarget: '.table__row',
                        isHaveQuery: true,
                        query: {
                            route_id: logistic.machine_tasks.route_id,
                            delivery_date: logistic.activeDate
                        },
                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: logistic.machine_tasks.updatingCount
                    }"
                    @openModal="item => emit('openModal', item)"
                    @getData="data => logistic.getRoutes(data)"
                />
            </AppResize>
        </div>
    </div>
</template>

<script setup>
    import './Logistic.scss';
    import { format } from 'date-fns';
    import AppMap from '@AppComponents/Inputs/Map/Map.vue';
    import AppResize from '@AppComponents/Resize/Resize.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    
    const emit = defineEmits([
        'openModal'
    ])

    const props = defineProps({
        activeDate: {
            default: null,
            type: [String, Date]
        },
        activeRoute: {
            default: null,
            type: Object
        }
    })

    class Logistic {
        constructor(activeDate) {
            this.logistic_tasks = {
                updatingCount: 0
            }
            this.routes = {
                id: 0,
                updatingCount: 0
            }
            this.machine_tasks = {
                route_id: 0,
                updatingCount: 0
            }
            this.activeDate = format(activeDate, 'yyyy-MM-dd')
            this.map = []
        }

        // Получение точек маршрута для карты
        getRoutes(data) {
            this.map = data.map(row => row.address?.coords ?? [])
        }

        updateActiveDate() {
            this.activeDate = format(props.activeDate, 'yyyy-MM-dd')
            this.machine_tasks.updatingCount++
            this.routes.updatingCount++
        }

        updateActiveRoute() {
            this.routes.id = props.activeRoute?.value[0]
            this.machine_tasks.route_id = props.activeRoute?.value[0]
            this.routes.updatingCount++
            this.machine_tasks.updatingCount++
        }
    }

    const logistic = ref(new Logistic(props.activeDate)) 

    watch(() => props.activeDate, () => {
        logistic.value.updateActiveDate()
    })

    watch(() => props.activeRoute, () => {
        logistic.value.updateActiveRoute()
    })

    // onMounted(() => {
    //     setTimeout(() => {
    //         logistic.value.machine_tasks.route_id = 83
    //         logistic.value.activeDate = '2025-08-04'
    //         logistic.value.machine_tasks.updatingCount++
    //     }, 5000);
    // })
</script>
