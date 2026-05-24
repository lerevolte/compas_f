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
                        @getSelectedPoints="data => onLassoSelection(data)"
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
                        v-else-if="section.key == 'route_tasks' && logistic.machine_tasks.route_id"
                        :slug="'logistic_tasks'"
                        :key="'logistic_tasks_route_' + (logistic.machine_tasks.route_id || 'none')"
                        :options="{
                            title: 'Задачи в машине',
                            isDraggable: true,
                            draggableTarget: '.table__row',
                            group: 'logistic_tasks',
                            isHaveQuery: true,
                            isCheckClicked: true,
                            query: {
                                route_id: String(logistic.machine_tasks.route_id)
                            },
                            disabledKeys: ['delivery_date'],
                            isShort: true,
                            isHaveFilter: false,
                            isPermanentEdit: false,
                            isTrash: false,
                            isDisablePull: false,
                            isDisablePut: false,
                            isDisableSort: true,
                            isHaveTopHeader: true,
                            isDisableSockets: true,
                            isHaveFooter: false,
                            isHaveLocalFilter: false,
                            updatingCount: logistic.machine_tasks.updatingCount
                        }"
                        @openModal="item => emit('openModal', { ...item, slug: item.slug || 'logistic_tasks', route_id: logistic.machine_tasks.route_id })"
                        @getData="data => logistic.getRoutes(data)"
                        @addRow="row => logistic.changeRouteTasks(row.list)"
                        @removeRow="row => logistic.changeRouteTasks(row.list)"
                        @changePositionRow="row => logistic.changeRouteTasks(row.list)"
                        @choseRow="row => onRouteTaskClickInTable(row)"
                    />
                    <section v-else-if="section.key == 'route_tasks'" class="section-table">
                        <div class="section-table__top">
                            <div class="section-table__top-group section-table__top-title">
                                Задачи в машине
                            </div>
                        </div>
                    </section>
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

    const emit = defineEmits(['openModal', 'routeChanged']);

    const props = defineProps({
        activeDate: { default: null, type: [String, Date] },
        filterTabs: { default: null, type: Array },
        activeRoute: { default: null, type: Object }
    });

    const logistic = ref(new LogisticWithMap(props.activeDate));
    logistic.value.onRouteChanged = () => emit('routeChanged');

    // ── Map ↔ Table interaction ──
    
    // Lasso filter for unassigned tasks — hide rows via DOM
    const lassoFilterIds = ref([]);

    const onLassoSelection = (data) => {
        console.log('🟣 onLassoSelection called:', data);
        if (data.state) {
            // Lasso drawn - show only tasks with matching IDs (may be empty = hide all)
            lassoFilterIds.value = (data.ids || []).map(Number);
            console.log('🟣 Applying lasso filter, IDs:', lassoFilterIds.value);
            applyLassoFilterToTable();
        } else {
            // Lasso cleared - show all
            lassoFilterIds.value = [];
            clearLassoFilterFromTable();
        }
    };

    const applyLassoFilterToTable = () => {
        nextTick(() => {
            const allRows = document.querySelectorAll('.section-table .table__row');
            allRows.forEach(row => {
                const idCell = row.querySelector('.table__cell[data-column-key="id"] .table__text');
                if (!idCell) return;
                const rowId = Number(idCell.textContent.trim());
                // Check if this is an unassigned task row
                const routeCell = row.querySelector('.table__cell[data-column-key="route_id"]');
                const isUnassigned = routeCell && (
                    routeCell.querySelector('.select_empty') || 
                    routeCell.textContent.includes('Не выбрано')
                );
                if (isUnassigned) {
                    if (lassoFilterIds.value.length === 0 || !lassoFilterIds.value.includes(rowId)) {
                        row.style.display = 'none';
                    } else {
                        row.style.display = '';
                    }
                }
            });
        });
    };

    const clearLassoFilterFromTable = () => {
        const tables = document.querySelectorAll('.section-table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('.table__row');
            rows.forEach(row => {
                row.style.display = '';
            });
        });
    };

    // Highlight a row in table by adding clicked class directly
    const highlightTableRow = (taskId) => {
        setTimeout(() => {
            // Remove previous highlights
            document.querySelectorAll('.table__row_clicked').forEach(r => r.classList.remove('table__row_clicked'));
            
            // Find row by checking each table's rows
            const tables = document.querySelectorAll('.section-table');
            for (const table of tables) {
                const rows = table.querySelectorAll('.table__row');
                for (const row of rows) {
                    // Check all text cells for matching ID
                    const cells = row.querySelectorAll('.table__cell .table__text, .table__cell-content .table__text');
                    for (const cell of cells) {
                        const text = cell.textContent.trim();
                        if (text === String(taskId) || text.includes(`#${taskId}`)) {
                            row.classList.add('table__row_clicked');
                            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            return;
                        }
                    }
                }
            }
        }, 200);
    };

    // Click on route task marker on map → highlight row in table
    const onRouteTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
        highlightTableRow(task.id);
    };

    const onRouteTaskClickInTable = (row) => {
        const taskId = row.id || row;
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = taskId; });
    };

    const onUnassignedTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
        highlightTableRow(task.id);
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

    watch(() => filteredFields.value, async () => {
        logistic.value.logistic_tasks.updatingCount++;
        // Reload unassigned tasks for map with new filters
        await logistic.value.loadUnassignedTasks();
        // Sync table visibility with map
        applyFilterToUnassignedTable();
    });

    // Hide unassigned table rows that don't match filtered unassignedTasks
    const applyFilterToUnassignedTable = () => {
        setTimeout(() => {
            // First reset all rows
            resetUnassignedTableDisplay();
            
            const hasFilter = logistic.value.filterFields?.some(f => {
                if (!f.value) return false;
                if (Array.isArray(f.value)) return f.value.some(v => v !== null && v !== undefined && v !== '');
                return f.value !== null && f.value !== '';
            });
            
            if (!hasFilter) return;
            
            const validIds = logistic.value.unassignedTasks.map(t => Number(t.id));
            
            const allRows = document.querySelectorAll('.section-table .table__row');
            allRows.forEach(row => {
                const idCell = row.querySelector('.table__cell[data-column-key="id"] .table__text');
                if (!idCell) return;
                const rowId = Number(idCell.textContent.trim());
                const routeCell = row.querySelector('.table__cell[data-column-key="route_id"]');
                const isUnassigned = routeCell && (
                    routeCell.querySelector('.select_empty') || 
                    routeCell.textContent.includes('Не выбрано')
                );
                if (isUnassigned && !validIds.includes(rowId)) {
                    row.style.display = 'none';
                }
            });
        }, 500);
    };

    const resetUnassignedTableDisplay = () => {
        const allRows = document.querySelectorAll('.section-table .table__row');
        allRows.forEach(row => {
            if (row.style.display === 'none') {
                row.style.display = '';
            }
        });
    };

    watch(() => props.activeDate, () => {
        logistic.value.updateActiveDate(props.activeDate);
    });

    watch(() => props.activeRoute, () => {
        logistic.value.updateActiveRoute(props.activeRoute);
    });

    onMounted(() => {
        logistic.value.getSections();
        // updateActiveDate calls loadUnassignedTasks internally
        if (props.activeDate) {
            logistic.value.updateActiveDate(props.activeDate);
        }
    });
</script>