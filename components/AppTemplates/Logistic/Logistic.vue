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
                        :ref="el => setRoutesTableRef(el)"
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
                            isDisableSockets: false,
                            isPermanentEdit: false,
                            isCheckClicked: true,
                            isTrash: false,
                            isHaveTopHeader: true,
                            isHaveFooter: false,
                            isDisablePull: true,
                            isDisablePut: true,
                            isDisableSort: true,
                            updatingCount: logistic.routes.updatingCount
                        }"
                        @saveTable="data => logistic.updateRoute(data)"
                        @getData="data => logistic.onRoutesTableLoaded(data)"
                        @openModal="item => emit('openModal', item)"
                        @choseRow="data => onRouteRowChosen(data)"
                        @initCreateRoute="logistic.initCreateRoute()"
                    />

                    <div class="logistic__section" v-else-if="section.key == 'tasks'">
                        <LogisticFilter
                            v-model="logistic.filterFields"
                            @update:modelValue="data => logistic.changeFilter(data)"
                        />
                        <AppVirtualTable
                            :ref="el => setTaskTableRef('unassigned', el)"
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
                                isDisablePut: false,
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
                            @removeRow="row => logistic.onTaskDroppedToUnassigned(row)"
                        />
                    </div>


                    <AppVirtualTable
                        :ref="el => setTaskTableRef('route', el)"
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
                            isHaveOrder: true,
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
        activeRoute: { default: null, type: Object },
        // Приходит из URL через поиск задач — подсветить конкретную задачу
        // в таблице и на карте после загрузки.
        activeTaskId: { default: null, type: [Number, String] }
    });

    const logistic = ref(new LogisticWithMap(props.activeDate));
    logistic.value.onRouteChanged = () => emit('routeChanged');

    // Прокидываем activeTaskId из URL в state, чтобы карта/таблица подсветили
    // нужную задачу. Watch на случай позднего получения данных.
    if (props.activeTaskId) {
        logistic.value.activeTaskId = Number(props.activeTaskId);
    }
    watch(() => props.activeTaskId, (val) => {
        logistic.value.activeTaskId = val ? Number(val) : null;
        if (val) {
            highlightTableRow(Number(val));
        }
    });

    // ── Drag&drop задачи на строку маршрута в таблице Маршруты ──
    // vuedraggable не различает "дроп на конкретную строку", а также если разрешить
    // ему принимать дроп в таблицу маршрутов, задача на секунду появляется как
    // отдельная строка. Поэтому таблица Маршруты put: false, а само наведение и
    // дроп отслеживаем глобально по mousemove / mouseup, используя
    // elementFromPoint и data-id, который Body.vue ставит на строки.
    const dropTargetRouteId = ref(null);
    let draggedTaskId = null;
    let dragSourceTable = null; // 'unassigned' | 'route'

    const findRoutesSection = () => {
        const sections = document.querySelectorAll('.logistic .section-table');
        for (const sec of sections) {
            const title = sec.querySelector('.section-table__top-title');
            if (title && title.textContent && title.textContent.trim().startsWith('Маршруты')) {
                return sec;
            }
        }
        return null;
    };

    const findTaskSourceSection = (el) => {
        const sec = el?.closest?.('.logistic .section-table');
        if (!sec) return null;
        const title = sec.querySelector('.section-table__top-title');
        const text = title?.textContent?.trim() || '';
        if (text.startsWith('Задачи логистики')) return 'unassigned';
        if (text.startsWith('Задачи в машине')) return 'route';
        return null;
    };

    const clearDropTargetHighlight = () => {
        document.querySelectorAll('.logistic__drop-target')
            .forEach(el => el.classList.remove('logistic__drop-target'));
    };

    const onGlobalMouseDown = (e) => {
        // Запоминаем задачу, по которой нажали — если начнётся drag, она тянется.
        const row = e.target?.closest?.('.table__row');
        if (!row) return;
        if (row.closest('.table__header')) return;
        const source = findTaskSourceSection(row);
        if (!source) return;
        const id = row.getAttribute('data-id');
        if (!id) return;
        draggedTaskId = Number(id);
        dragSourceTable = source;
    };

    const onGlobalMouseMove = (e) => {
        // Активны только когда vuedraggable пометил body как «идёт перетаскивание».
        if (!document.body.classList.contains('body_unselected')) return;
        if (!draggedTaskId) return;

        const routesSection = findRoutesSection();
        if (!routesSection) return;

        // elementsFromPoint, потому что fallback-клон vuedraggable, ползущий за
        // курсором, может «прикрыть» строку маршрута и сбить elementFromPoint.
        const stack = (typeof document.elementsFromPoint === 'function')
            ? document.elementsFromPoint(e.clientX, e.clientY)
            : [document.elementFromPoint(e.clientX, e.clientY)];
        let row = null;
        for (const el of stack) {
            if (!el) continue;
            if (el.classList?.contains('draggable-fallback')) continue;
            if (el.closest?.('.draggable-fallback')) continue;
            const candidate = el.closest?.('.table__row');
            if (candidate && routesSection.contains(candidate) && !candidate.closest('.table__header')) {
                row = candidate;
                break;
            }
        }

        if (!row) {
            if (dropTargetRouteId.value !== null) {
                dropTargetRouteId.value = null;
                clearDropTargetHighlight();
            }
            return;
        }

        let routeId = row.getAttribute('data-id');
        if (!routeId) {
            const idCell = row.querySelector('.table__cell[data-column-key="id"] .table__text');
            if (idCell) routeId = idCell.textContent.trim();
        }
        routeId = routeId ? Number(routeId) : null;
        if (!routeId) return;

        if (dropTargetRouteId.value !== routeId) {
            dropTargetRouteId.value = routeId;
            clearDropTargetHighlight();
            row.classList.add('logistic__drop-target');
        }
    };

    const onGlobalMouseUp = () => {
        const taskId = draggedTaskId;
        const routeId = dropTargetRouteId.value;
        const source = dragSourceTable;
        draggedTaskId = null;
        dragSourceTable = null;
        dropTargetRouteId.value = null;
        clearDropTargetHighlight();
        if (!taskId || !routeId) return;
        // Если задача уже в маршруте, в который её перетащили — assignTaskToRoute сам
        // обработает no-op. Для маршрута-источника совпадение маршрутов невозможно,
        // потому что в Задачах в машине route_id == текущий машинный маршрут, а
        // assignTaskToRoute сам обновит обе таблицы.
        logistic.value.assignTaskToRoute(taskId, routeId);
    };

    onMounted(() => {
        document.addEventListener('mousedown', onGlobalMouseDown, true);
        document.addEventListener('mousemove', onGlobalMouseMove);
        document.addEventListener('mouseup', onGlobalMouseUp);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('mousedown', onGlobalMouseDown, true);
        document.removeEventListener('mousemove', onGlobalMouseMove);
        document.removeEventListener('mouseup', onGlobalMouseUp);
        clearDropTargetHighlight();
    });

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

    // Только секции-таблицы задач (Задачи логистики + Задачи в машине).
    // Маршруты исключаем — у них своя выделенная строка (выбранный маршрут).
    // Иначе highlightTableRow(task.id) случайно подсвечивал маршрут с тем же
    // числовым id, что приводило к жалобе «тыкаю по маркеру маршрута, а
    // выделяется строка маршрутов, а не задача».
    const getTaskSections = () => {
        const result = [];
        document.querySelectorAll('.section-table').forEach(sec => {
            const title = sec.querySelector('.section-table__top-title')?.textContent?.trim() || '';
            if (title.startsWith('Задачи')) result.push(sec);
        });
        return result;
    };

    // Scroll-only «дотягивание» строки задачи в видимую область task-таблицы.
    // Класс table__row_clicked / галочку в checkbox-колонке выставляет
    // setTaskRowClicked через body[i].clicked, чтобы Vue-реактивность была
    // единым источником истины. Здесь только скроллим — с ретраями, потому
    // что строка может быть ещё не в DOM из-за virtualizer.
    const highlightTableRow = (taskId) => {
        const target = String(taskId);
        const delays = [200, 400, 700, 1200, 1800, 2500, 3500];

        const tryScroll = () => {
            const tables = getTaskSections();
            for (const table of tables) {
                const rows = table.querySelectorAll('.table__row');
                for (const row of rows) {
                    const idCell = row.querySelector('.table__cell[data-column-key="id"] .table__text');
                    if (idCell && idCell.textContent.trim() === target) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        return true;
                    }
                }
            }
            return false;
        };

        let i = 0;
        const next = () => {
            if (tryScroll() || i >= delays.length) return;
            setTimeout(next, delays[i++]);
        };
        setTimeout(next, delays[i++]);
    };

    // Ссылки на инстансы трёх таблиц логистики — нужны, чтобы централизованно
    // управлять выделением строк. Сценарии:
    //   1) Routes-таблица: только одна выделенная строка (= активный маршрут).
    //   2) Task-таблицы (Задачи логистики + Задачи в машине): ОДНА общая
    //      выделенная строка на обе — focused task. Нажатие на задачу в одной
    //      сбрасывает выделение в другой.
    //   3) Клик по маркеру задачи на карте: переводит focused task на
    //      соответствующую задачу в той из task-таблиц, где она физически есть.
    const taskTableRefs = { unassigned: null, route: null };
    const setTaskTableRef = (key, el) => {
        taskTableRefs[key] = el || null;
    };
    let routesTableComp = null;
    const setRoutesTableRef = (el) => {
        routesTableComp = el || null;
    };

    // defineExpose в Vue 3 АВТОматически распаковывает рефы на parent-стороне:
    // tableComp.table — уже сам Table instance (не ref), .value на нём
    // даёт undefined. Берём напрямую table.body.
    const getTableBody = (tableComp) => {
        const t = tableComp?.table;
        if (!t) return null;
        // Подстраховка для разных версий Vue: и если ref не распакован, и если
        // распакован напрямую инстанс.
        const inst = (t && typeof t === 'object' && 'value' in t && !Array.isArray(t.body)) ? t.value : t;
        return Array.isArray(inst?.body) ? inst.body : null;
    };

    // Установить clicked=true для строки с указанным id в любой task-таблице,
    // и одновременно clicked=false для всех остальных строк ВО ВСЕХ
    // task-таблицах. Это и даёт «одна галочка на две таблицы». Возвращает
    // true, если совпавшая строка реально нашлась.
    const setTaskRowClicked = (taskId) => {
        let found = false;
        for (const key in taskTableRefs) {
            const body = getTableBody(taskTableRefs[key]);
            if (!body) continue;
            for (const row of body) {
                if (!row) continue;
                const isMatch = taskId != null && Number(row.id) === Number(taskId);
                if (isMatch) found = true;
                if (!!row.clicked !== isMatch) row.clicked = isMatch;
            }
        }
        return found;
    };

    // Аналогично для routes-таблицы — одна выделенная строка.
    const setRouteRowClicked = (routeId) => {
        const body = getTableBody(routesTableComp);
        if (!body) return;
        for (const row of body) {
            if (!row) continue;
            const isMatch = routeId != null && Number(row.id) === Number(routeId);
            if (!!row.clicked !== isMatch) row.clicked = isMatch;
        }
    };

    // Полный сброс выделения во всех task-таблицах.
    const clearAllTaskRowsClicked = () => {
        setTaskRowClicked(null);
    };

    // Обёртка вокруг @choseRow для routes-таблицы: сначала ставим выделение
    // только на выбранную строку (исключая старую галочку у предыдущего
    // маршрута, которую Body.handleClick иногда не успевал перетереть из-за
    // virtualizer/reactivity-таймингов), затем триггерим обычный choseRoute.
    const onRouteRowChosen = (data) => {
        setRouteRowClicked(data?.id ?? null);
        // Смена маршрута сбрасывает focused task — он мог принадлежать
        // предыдущему маршруту и больше не релевантен.
        clearAllTaskRowsClicked();
        logistic.value.choseRoute(data);
    };

    // Click on route task marker on map → highlight row in task tables
    const onRouteTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
        // Маркер задачи → ставим галочку (clicked) в правильной task-таблице
        // и DOM-класс table__row_clicked, очищая выделение в обеих остальных.
        setTaskRowClicked(task.id);
        highlightTableRow(task.id);
    };

    const onRouteTaskClickInTable = (row) => {
        const taskId = row.id || row;
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = taskId; });
        // body.map в handleClick таблицы уже поставил clicked текущей строке,
        // но в ВТОРОЙ task-таблице clicked мог остаться от прошлого клика —
        // сбрасываем централизованно.
        setTaskRowClicked(taskId);
    };

    const onUnassignedTaskClickOnMap = (task) => {
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = task.id; });
        setTaskRowClicked(task.id);
        highlightTableRow(task.id);
    };

    const onUnassignedTaskClickInTable = (row) => {
        const taskId = row.id || row;
        logistic.value.activeTaskId = null;
        nextTick(() => { logistic.value.activeTaskId = taskId; });
        setTaskRowClicked(taskId);
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
        // Прямой переход с route_id в URL — сразу триггерим updateActiveRoute,
        // чтобы загрузились маршрутные данные и подсветилась задача.
        if (props.activeRoute) {
            logistic.value.updateActiveRoute(props.activeRoute);
        }
        // Подсветка задачи, пришедшей из URL. highlightTableRow ретраит
        // самостоятельно, пока виртуализатор не отрисует строки.
        if (props.activeTaskId) {
            highlightTableRow(Number(props.activeTaskId));
        }
    });
</script>