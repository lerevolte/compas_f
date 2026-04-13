<template>
    <div class="logistic" :class="{ 'logistic_dragging': logistic.isDragging }">
        <draggable
            v-for="(column, index) in logistic.columns"
            tag="div"
            group="columns"
            class="logistic__column"
            ghost-class="draggable-ghost"
            drag-class="draggable-drag"
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
                    <!-- ★ LogisticMap instead of AppMap -->
                    <LogisticMap v-if="section.key == 'map'"
                        :routeData="logistic.selectedRouteData"
                        :unassignedTasks="logistic.unassignedTasks"
                        :showUnassigned="true"
                        :enableSelection="true"
                        :activeTaskId="logistic.activeTaskId"
                        @getSelectedPoints="data => logistic.getSelectedPoints(data)"
                        @routeTaskClick="task => onRouteTaskClickOnMap(task)"
                        @unassignedTaskClick="task => onUnassignedTaskClickOnMap(task)"
                    />

                    <AppVirtualTable 
                        v-else-if="section.key == 'routes'"
                        :slug="'routes'"
                        :key="'routes'"
                        :showMore="[
                            {
                                name: 'Создать маршрут',
                                action: 'initCreateRoute',
                                enabled: true
                            }
                        ]"
                        :options="{
                            title: 'Маршруты',
                            isHaveQuery: true,
                            query: {
                                id: logistic.routes.id ?? null,
                                date: logistic.activeDate
                            },
                            isShort: true,
                            isEnableCreateOption: false,
                            isHaveFilter: false,
                            isDisableSockets: true,
                            isPermanentEdit: false,
                            isCheckClicked: true,
                            isTrash: false,
                            isHaveTopHeader: true,
                            isHaveFooter: false,
                            updatingCount: logistic.routes.updatingCount
                        }"
                        @saveTable="data => logistic.updateRoute(data)"
                        @openModal="item => emit('openModal', item)"
                        @choseRow="data => logistic.choseRoute(data)"
                        @initCreateRoute="logistic.initCreateRoute()"
                    />

                    <div class="logistic__section" v-else-if="section.key == 'tasks'">
                        <LogisticFilter 
                            v-model="logistic.filterFields"
                            @update:modelValue="data => logistic.changeFilter(data)"
                        />
                        <AppVirtualTable 
                            :slug="'logistic_tasks'"
                            :key="'logistic_tasks'"
                            :options="{
                                title: 'Задачи логистики',
                                isHaveQuery: true,
                                query: {
                                    ...filteredFields,
                                    route_id: 'null',
                                    delivery_date: logistic.activeDate,
                                    per_page: 12 
                                },
                                isShort: true,
                                overscan: 5,
                                isDraggable: true,
                                isDisableSockets: true,
                                isCheckClicked: true,
                                isDisableSort: false,
                                isDisablePull: false,
                                isDisablePut: true,
                                draggableTarget: '.table__row',
                                group: 'logistic_tasks',
                                isHaveFilter: false,
                                isPermanentEdit: false,
                                isTrash: false,
                                isHaveTopHeader: true,
                                isHaveFooter: false,
                                updatingCount: logistic.logistic_tasks.updatingCount
                            }"
                            @openModal="item => emit('openModal', item)"
                            @choseRow="row => onUnassignedTaskClickInTable(row)"
                            @addRow="row => logistic.onTaskDroppedToUnassigned(row)"
                        />
                    </div>

                    <AppVirtualTable 
                        v-else-if="section.key == 'route_tasks'"
                        :slug="'logistic_tasks'"
                        :key="'logistic_tasks_route'"
                        :options="{
                            title: 'Задачи в машине',
                            isDraggable: true,
                            draggableTarget: '.table__row',
                            group: logistic.machine_tasks.route_id ? 'logistic_tasks' : 'logistic_tasks_empty',
                            isHaveQuery: true,
                            isCheckClicked: true,
                            query: {
                                route_id: String(logistic.machine_tasks.route_id),
                                sort_field: 'sort',
                                sort_order: 'asc'
                            },
                            disabledKeys: ['delivery_date'],
                            isShort: true,
                            isHaveFilter: false,
                            isPermanentEdit: false,
                            isTrash: false,
                            isDisablePull: !logistic.machine_tasks.route_id,
                            isDisablePut: !logistic.machine_tasks.route_id,
                            isDisableSort: true,
                            isHaveTopHeader: true,
                            isDisableSockets: true,
                            isHaveFooter: false,
                            isHaveLocalFilter: true,
                            localFilter: logistic.machine_tasks.selectedAddresses,
                            updatingCount: logistic.machine_tasks.updatingCount
                        }"
                        @openModal="item => emit('openModal', { ...item, slug: item.slug || 'logistic_tasks', route_id: logistic.machine_tasks.route_id })"
                        @getData="data => logistic.getRoutes(data)"
                        @addRow="row => logistic.changeRouteTasks(row.list)"
                        @removeRow="row => logistic.changeRouteTasks(row.list)"
                        @changePositionRow="row => logistic.changeRouteTasks(row.list)"
                        @choseRow="row => onRouteTaskClickInTable(row)"
                    />
                </AppResize>
            </template>
        </draggable>
        <teleport to="#menu__overlay" v-if="logistic.modal.state">
            <LogisticModal 
                :modal="logistic.modal"
                @close="logistic.modal.state = false"
                @create="content => logistic.createRoute(content)"
            />
        </teleport>
    </div>
</template>

<script setup>
    import './Logistic.scss';
    import AppResize from '@AppComponents/Resize/Resize.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import draggable from 'vuedraggable';
    import LogisticModal from './Modal/Modal.vue';
    import LogisticFilter from './Filter/Filter.vue';
    import LogisticMap from './Map/LogisticMap.vue';
    import { LogisticWithMap } from './logisticClass.js';

    const emit = defineEmits(['openModal']);

    const props = defineProps({
        activeDate: { default: null, type: [String, Date] },
        filterTabs: { default: null, type: Array },
        activeRoute: { default: null, type: Object }
    });

    const logistic = ref(new LogisticWithMap(props.activeDate));

    // ── Map ↔ Table interaction ──
    // Click on route task marker on map → highlight row in table
    const onRouteTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
    };

    const onRouteTaskClickInTable = (row) => {
        const taskId = row.id || row;
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = taskId; });
    };

    const onUnassignedTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
    };

    const onUnassignedTaskClickInTable = (row) => {
        const taskId = row.id || row;
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = taskId; });
    };

    const filteredFields = computed(() => {
        let request = {};
        if (logistic.value.filterFields.length === 0) return request;
        logistic.value.filterFields.map(tab => { request[tab.key] = tab.value; });
        return request;
    });

    watch(() => filteredFields.value, () => {
        logistic.value.logistic_tasks.updatingCount++;
    });

    watch(() => props.activeDate, () => {
        logistic.value.updateActiveDate(props.activeDate);
    });

    watch(() => props.activeRoute, () => {
        logistic.value.updateActiveRoute(props.activeRoute);
    });

    onMounted(() => {
        logistic.value.getSections();
        logistic.value.loadUnassignedTasks();
    });
</script>