import { Logistic } from '@AppHelpers/classes.js';
import api from '@/helpers/api.js';
import routes from '@/helpers/routes.js';
import { format } from 'date-fns';

export class LogisticWithMap extends Logistic {
    constructor(activeDate) {
        super(activeDate);
        this.selectedRouteData = null;
        this.unassignedTasks = [];
        this.loadingRouteMapData = false;
        this.activeTaskId = null;
        this.onRouteChanged = null; // callback set by parent
    }

    choseRoute(row) {
        console.log('🟢 choseRoute called, row.id:', row.id);
        this.machine_tasks.route_id = row.id;
        this.machine_tasks.updatingCount++;
        this.getRouteFilters(row.id);
        this.loadRouteForMap(row.id);
    }

    // Сохранение строки в таблице маршрутов. Базовый Logistic.updateRoute
    // просто перезагружает таблицу; здесь дополнительно отслеживаем смену
    // цвета у активного (выбранного на карте) маршрута, чтобы перерисовать
    // линию маршрута новым цветом. data — массив изменённых строк, который
    // прилетает из Table.save() через @saveTable.
    updateRoute(data) {
        super.updateRoute?.(data);
        this.routes.updatingCount++;
        this.machine_tasks.updatingCount++;

        const rows = Array.isArray(data) ? data : [];
        const activeId = this.machine_tasks.route_id ?? this.selectedRouteData?.id;
        if (!activeId) return;

        const touchedActive = rows.some(r => {
            if (!r || Number(r.id) !== Number(activeId)) return false;
            // Если в запросе есть поле color (любое значение, включая null —
            // сброс) — это смена цвета, нужно перерисовать карту.
            return Object.prototype.hasOwnProperty.call(r, 'color');
        });
        if (touchedActive) {
            this.loadRouteForMap(activeId);
        }
    }

    async loadRouteForMap(routeId) {
        console.log('🟢 loadRouteForMap called, routeId:', routeId);
        
        if (!routeId) {
            this.selectedRouteData = null;
            return;
        }

        try {
            this.loadingRouteMapData = true;

            const response = await api.callMethod('GET', `/routes/${routeId}/tasks`);

            let rows = response.data?.data || [];

            console.log('🟢 Loaded route tasks:', rows.length);

            if (rows.length === 0) {
                console.log('🟠 Route has no tasks');
                this.selectedRouteData = {
                    id: routeId, name: `Маршрут ${routeId}`, loading_time: '07:00',
                    color: '#8601ff', tasks: [], actual_path: [],
                    service_stops: [], parking_stops: [], signal_loss_events: []
                };
                return;
            }

            const tasks = rows.map((row, index) => {
                let addressStr;
                if (typeof row.address === 'string') {
                    addressStr = row.address;
                } else if (row.address && row.address.coords) {
                    addressStr = JSON.stringify(row.address);
                } else if (row.address && typeof row.address === 'object') {
                    addressStr = JSON.stringify(row.address);
                } else {
                    addressStr = JSON.stringify({ coords: [], text: '' });
                }

                return {
                    id: row.id || index + 1,
                    order: row.sort !== undefined ? row.sort + 1 : index + 1,
                    name: row.name || `Точка ${index + 1}`,
                    address: addressStr,
                    service_time: row.service_time || 0,
                    factTime: row.fact_time || row.factTime || '',
                    planTime: row.plan_time || row.planTime || '',
                    statusColor: row.statusColor || '#ccc'
                };
            });

            console.log('🟢 Converted tasks:', tasks.length);
            console.log('🟢 First task:', tasks[0]);

            // Load additional map data (actual path, route meta)
            let actualPath = [];
            let routeName = `Маршрут ${routeId}`;
            let loadingTime = '07:00';
            let routeColor = '#8601ff';

            try {
                const mapDataResponse = await api.callMethod('GET', `/routes/${routeId}/map_data`);
                const mapData = mapDataResponse.data || mapDataResponse;
                actualPath = mapData.actual_path || [];
                routeName = mapData.name || routeName;
                loadingTime = mapData.loading_time || loadingTime;
                // Color might be hex (#8601ff) or an ID (1484) — only use if it looks like a color
                const rawColor = mapData.color || '';
                if (rawColor && /^(#|rgb|hsl|linear)/.test(rawColor)) {
                    routeColor = rawColor;
                }
            } catch (e) {
                console.log('🟠 map_data endpoint not available, using defaults');
            }

            this.selectedRouteData = {
                id: routeId,
                name: routeName,
                loading_time: loadingTime,
                color: routeColor,
                tasks: tasks,
                actual_path: actualPath,
                service_stops: [],
                parking_stops: [],
                signal_loss_events: []
            };

            console.log('🟢 selectedRouteData ready, tasks:', this.selectedRouteData.tasks.length);

        } catch (error) {
            console.error('🔴 Error loading route for map:', error);
            this.selectedRouteData = null;
        } finally {
            this.loadingRouteMapData = false;
        }
    }

    async loadUnassignedTasks() {
        this._unassignedRequestId = (this._unassignedRequestId || 0) + 1;
        const requestId = this._unassignedRequestId;
        try {
            // Build filter query
            let filterParams = `filter[route_id]=null&filter[delivery_date]=${this.activeDate}&per_page=100&sort_field=id&sort_order=asc`;
            
            // Add requirements filters if set
            if (this.filterFields?.length) {
                this.filterFields.forEach(f => {
                    if (f.key && f.value && Array.isArray(f.value) && (f.key === 'car_requirements' || f.key === 'employee_requirements')) {
                        const filtered = f.value.filter(v => v !== null && v !== undefined && v !== '');
                        if (filtered.length > 0) {
                            filtered.forEach(v => {
                                filterParams += `&filter[${f.key}][]=${v}`;
                            });
                        }
                    }
                });
            }

            const url = `/objects/logistic_tasks/compose?${filterParams}`;
            const response = await api.callMethod('GET', url);
            
            if (requestId !== this._unassignedRequestId) return;
            
            let rows = response.data?.list?.data || [];
            
            // Frontend filtering for weight/volume
            if (this.filterFields?.length) {
                const weightFilter = this.filterFields.find(f => f.key === 'weight');
                const volumeFilter = this.filterFields.find(f => f.key === 'volume');
                
                console.log('🟢 Filter fields:', this.filterFields.map(f => ({ key: f.key, value: f.value })));
                
                if (weightFilter?.value) {
                    const wMin = weightFilter.value[0] !== null && weightFilter.value[0] !== undefined ? Number(weightFilter.value[0]) : null;
                    const wMax = weightFilter.value[1] !== null && weightFilter.value[1] !== undefined ? Number(weightFilter.value[1]) : null;
                    if (wMin !== null || wMax !== null) {
                        rows = rows.filter(row => {
                            const weight = this._calcProductsTotal(row.products, 'weight');
                            console.log('🟢 Task', row.id, 'weight:', weight, 'wMin:', wMin, 'wMax:', wMax);
                            if (wMin !== null && weight < wMin) return false;
                            if (wMax !== null && weight > wMax) return false;
                            return true;
                        });
                    }
                }
                
                if (volumeFilter?.value) {
                    const vMin = volumeFilter.value[0] !== null && volumeFilter.value[0] !== undefined ? Number(volumeFilter.value[0]) : null;
                    const vMax = volumeFilter.value[1] !== null && volumeFilter.value[1] !== undefined ? Number(volumeFilter.value[1]) : null;
                    if (vMin !== null || vMax !== null) {
                        rows = rows.filter(row => {
                            const volume = this._calcProductsTotal(row.products, 'volume');
                            if (vMin !== null && volume < vMin) return false;
                            if (vMax !== null && volume > vMax) return false;
                            return true;
                        });
                    }
                }
            }
            
            this.unassignedTasks = Array.isArray(rows) ? rows : [];
            console.log('🟢 Final unassigned tasks after filtering:', this.unassignedTasks.length, 'IDs:', this.unassignedTasks.map(t => t.id));
        } catch (error) {
            if (requestId === this._unassignedRequestId) {
                this.unassignedTasks = [];
            }
        }
    }

    _calcProductsTotal(products, field) {
        let data = products;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { return 0; }
        }
        if (!Array.isArray(data)) return 0;
        return data.reduce((sum, p) => sum + ((p[field] || 0) * (p.count || 1)), 0);
    }

    getRoutes(data) {
        this.map = data.map(row => row.address?.coords ?? []);
    }

    updateActiveDate(activeDate) {
        this.activeDate = format(activeDate, 'yyyy-MM-dd');
        this.machine_tasks.updatingCount++;
        this.logistic_tasks.updatingCount++;
        this.routes.updatingCount++;
        this.selectedRouteData = null;
        this.unassignedTasks = [];
        this.loadUnassignedTasks();
    }

    updateActiveRoute(activeRoute) {
        console.log('🟢 updateActiveRoute:', activeRoute);
        this.routes.id = activeRoute?.value?.[0];
        this.machine_tasks.route_id = activeRoute?.value?.[0];
        this.routes.updatingCount++;
        this.machine_tasks.updatingCount++;

        if (activeRoute?.value?.[0]) {
            this.loadRouteForMap(activeRoute.value[0]);
        } else {
            this.selectedRouteData = null;
        }
    }

    async changeRouteTasks(list) {
        const routeId = this.machine_tasks.route_id;
        if (!routeId) return;

        const ids = list.map(row => row.id);

        if (!ids.length) return;

        try {
            const response = await api.callMethod('PUT', `/routes/${routeId}/tasks`, { ids });
            
            // Use response data directly — it's already in correct order
            const responseData = response.data || response;
            const rows = responseData.data || [];
            
            if (rows.length > 0) {
                const tasks = rows.map((row, index) => {
                    let addressStr = row.address;
                    if (typeof addressStr === 'object' && addressStr !== null) {
                        addressStr = JSON.stringify(addressStr);
                    }
                    return {
                        id: row.id || index + 1,
                        order: index + 1,
                        name: typeof row.name === 'object' ? (row.name?.value || row.name?.name || `Точка ${index + 1}`) : (row.name || `Точка ${index + 1}`),
                        address: addressStr,
                        service_time: row.service_time || 0,
                        factTime: row.fact_time || '',
                        planTime: row.plan_time || '',
                        statusColor: row.statusColor || '#ccc'
                    };
                });

                // Load map_data for color/name/actual_path
                let actualPath = [];
                let routeName = `Маршрут ${routeId}`;
                let loadingTime = '07:00';
                let routeColor = '#8601ff';

                try {
                    const mapDataResponse = await api.callMethod('GET', `/routes/${routeId}/map_data`);
                    const mapData = mapDataResponse.data || mapDataResponse;
                    actualPath = mapData.actual_path || [];
                    routeName = mapData.name || routeName;
                    loadingTime = mapData.loading_time || loadingTime;
                    const rawColor = mapData.color || '';
                    if (rawColor && /^(#|rgb|hsl|linear)/.test(rawColor)) {
                        routeColor = rawColor;
                    }
                } catch (e) {}

                this.selectedRouteData = {
                    id: routeId,
                    name: routeName,
                    loading_time: loadingTime,
                    color: routeColor,
                    tasks: tasks,
                    actual_path: actualPath,
                    service_stops: [],
                    parking_stops: [],
                    signal_loss_events: []
                };
            }

            // Reload unassigned tasks (task may have moved in/out)
            this.loadUnassignedTasks();
            // Refresh unassigned tasks table only (route tasks table already updated by drag)
            this.logistic_tasks.updatingCount++;
            // Notify parent to refresh analytics
            if (this.onRouteChanged) this.onRouteChanged();
        } catch (error) {
            console.error('🔴 Error updating route tasks:', error);
        }
    }

    async onTaskDroppedToUnassigned(row) {
        // Task was dropped from route to unassigned — need to remove it from route
        const routeId = this.machine_tasks.route_id;
        if (!routeId) return;

        // Get current route tasks table (without the dropped task)
        // The route_tasks table already updated via @removeRow → changeRouteTasks
        // But if drag goes to unassigned table, @removeRow fires on route table
        // and @addRow fires on unassigned table.
        // changeRouteTasks handles the route side.
        // Here we just need to refresh the unassigned table and map.
        this._loadingUnassigned = false;
        this.loadUnassignedTasks();
        this.logistic_tasks.updatingCount++;
    }

    // Прикрепление задачи к маршруту по drag&drop на строку маршрута в таблице Маршруты.
    // Использует существующий PUT /routes/{id}/tasks с полным списком ids — берём текущие
    // задачи маршрута и добавляем перенесённую. Параллельно эта же ручка снимает задачу
    // с предыдущего маршрута (если она там была), поэтому работает и для перемещения
    // между маршрутами.
    async assignTaskToRoute(taskId, routeId) {
        if (!taskId || !routeId) return;
        try {
            const response = await api.callMethod('GET', `/routes/${routeId}/tasks`);
            const currentIds = (response.data?.data || []).map(t => t.id);
            if (currentIds.includes(Number(taskId)) || currentIds.includes(String(taskId))) {
                // Уже в этом маршруте — ничего не делаем
                return;
            }
            const newIds = [...currentIds, taskId];
            await api.callMethod('PUT', `/routes/${routeId}/tasks`, { ids: newIds });
        } catch (error) {
            console.error('🔴 Error assigning task to route:', error);
        } finally {
            // Перерисовать таблицу маршрутов (вернёт исходное состояние без вставленной задачи)
            this.routes.updatingCount++;
            // Обновить список нераспределённых задач
            this.loadUnassignedTasks();
            this.logistic_tasks.updatingCount++;
            // Если активный маршрут (Задачи в машине) совпадает — перерисовать его
            if (this.machine_tasks.route_id == routeId || this.machine_tasks.route_id) {
                this.machine_tasks.updatingCount++;
                if (this.machine_tasks.route_id) {
                    this.loadRouteForMap(this.machine_tasks.route_id);
                }
            }
            if (this.onRouteChanged) this.onRouteChanged();
        }
    }
}