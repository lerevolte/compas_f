<template>
    <div class="logistic" :class="{ 'logistic_dragging': logistic.isDragging }">
        <draggable
            v-for="(column, index) in logistic.columns"
            tag="div"
            group="columns"
            class="logistic__column"
            ghost-class="draggable-ghost"
            drag-class="logistic__column_drag"
            v-model="logistic.columns[index]" 
            item-key="id" 
            fallback-class="draggable-fallback"
            :forceFallback="true"
            :fallbackOnBody="true"
            handle=".resize__icon-drag"
            @end="logistic.dragEnd()"
            @start="logistic.dragStart()"
        >
            <template #item="{ element: section }">
                <AppResize 
                    :options="{
                        height: section.height ? `${section.height}px` : 'auto', 
                        width: '100%'
                    }" 
                    @endResize="height => logistic.endResize({section, height})"
                >
                    <AppMap v-if="section.key == 'map'"
                        :options="{
                                showSelect: false
                        }"
                        :frameOptions="{
                            enableHeader: true,
                            enableSelection: true,
                            enableRoute: true
                        }"
                        :points="logistic.map"
                        @getSelectedPoints="data => logistic.getSelectedPoints(data)"
                    />

                    <AppVirtualTable 
                        v-else-if="section.key == 'routes'"
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
                            isCheckClicked: true,
                            isTrash: false,
                            isHaveTopHeader: true,
                            isHaveFooter: false,
                            updatingCount: logistic.routes.updatingCount
                        }"
                        @openModal="item => emit('openModal', item)"
                        @choseRow="data => logistic.choseRoute(data)"
                    />

                    <AppVirtualTable 
                        v-else-if="section.key == 'tasks'"
                        :slug="'logistic_tasks'"
                        :key="'logistic_tasks'"
                        :options="{
                            title: 'Задачи логистики',
                            isHaveQuery: true,
                            query: {
                                route_id: null
                            },
                            isDraggable: true,
                            isCheckClicked: true,
                            draggableTarget: '.table__row',
                            isHaveFilter: false,
                            isPermanentEdit: false,
                            isTrash: false,
                            isHaveTopHeader: true,
                            isHaveFooter: false,
                            updatingCount: logistic.logistic_tasks.updatingCount
                        }"
                        @openModal="item => emit('openModal', item)"
                    />

                    <AppVirtualTable 
                        v-else-if="section.key == 'route_tasks'"
                        :slug="'logistic_tasks'"
                        :key="'logistic_tasks_route'"
                        :options="{
                            title: 'Задачи в машине',
                            isDraggable: true,
                            draggableTarget: '.table__row',
                            isHaveQuery: true,
                            isCheckClicked: true,
                            query: {
                                route_id: String(logistic.machine_tasks.route_id),
                                delivery_date: logistic.activeDate
                            },
                            isHaveFilter: false,
                            isPermanentEdit: false,
                            isTrash: false,
                            isHaveTopHeader: true,
                            isHaveFooter: false,
                            isHaveLocalFilter: true,
                            localFilter: logistic.machine_tasks.selectedAddresses,
                            updatingCount: logistic.machine_tasks.updatingCount
                        }"
                        @openModal="item => emit('openModal', item)"
                        @getData="data => logistic.getRoutes(data)"
                    />
                </AppResize>
            </template>
        </draggable>
    </div>
</template>

<script setup>
    import './Logistic.scss';
    import AppMap from '@AppComponents/Inputs/Map/Map.vue';
    import AppResize from '@AppComponents/Resize/Resize.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import draggable from 'vuedraggable';
    import { Logistic } from '@AppHelpers/classes.js'

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

    const logistic = ref(new Logistic(props.activeDate))

    watch(() => props.activeDate, () => {
        logistic.value.updateActiveDate(props.activeDate)
    })

    watch(() => props.activeRoute, () => {
        logistic.value.updateActiveRoute(props.activeRoute)
    })

    onMounted(() => {
        logistic.value.getSections()
    })
</script>
