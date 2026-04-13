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
    }

    choseRoute(row) {
        console.log('🟢 choseRoute called, row.id:', row.id);
        this.machine_tasks.route_id = row.id;
        this.machine_tasks.updatingCount++;
        this.getRouteFilters(row.id);
        this.loadRouteForMap(row.id);
    }

    async loadRouteForMap(routeId) {
        console.log('🟢 loadRouteForMap called, routeId:', routeId);
        
        if (!routeId) {
            this.selectedRouteData = null;
            return;
        }

        try {
            this.loadingRouteMapData = true;

            // НЕ передаём delivery_date — на бэкенде баг, дата задач не совпадает с датой маршрута
            const response = await api.callMethod('GET', 
                `/objects/logistic_tasks/compose?filter[route_id]=${routeId}&per_page=100&sort_field=sort&sort_order=asc`
            );

            let rows = response.data?.list?.data || [];

            console.log('🟢 Loaded route tasks:', rows.length);
            if (rows.length > 0) {
                console.log('🟢 First row keys:', Object.keys(rows[0]));
                console.log('🟢 First row address:', rows[0].address);
                console.log('🟢 First row name:', rows[0].name);
            }

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
                    statusColor: row.statusColor || '#ccc'
                };
            });

            console.log('🟢 Converted tasks:', tasks.length);
            console.log('🟢 First task:', tasks[0]);

            // ── TEST DATA: remove after connecting real API ──
            // Simulates driver movement from Okhotny Ryad → Balashikha → back to Moscow
            // Includes: normal driving, a stop near task 1 (service), a parking stop, and a signal gap
            const testActualPath = [
                // Starts near task 1 (Okhotny Ryad 55.7575, 37.6163)
                { lat: 55.7574, lon: 37.6160, speed: 0,   time: '07:05' },
                { lat: 55.7576, lon: 37.6165, speed: 5,   time: '07:08' },
                // Stationary near task 1 for 12 min → should become "Обслуживание"
                { lat: 55.7576, lon: 37.6164, speed: 0,   time: '07:10' },
                { lat: 55.7576, lon: 37.6164, speed: 0,   time: '07:15' },
                { lat: 55.7575, lon: 37.6164, speed: 0,   time: '07:22' },
                // Driving east toward Balashikha
                { lat: 55.7550, lon: 37.6500, speed: 45,  time: '07:30' },
                { lat: 55.7500, lon: 37.7000, speed: 60,  time: '07:40' },
                { lat: 55.7400, lon: 37.7800, speed: 55,  time: '07:55' },
                { lat: 55.7350, lon: 37.8500, speed: 50,  time: '08:05' },
                // Signal loss gap: 15 min → should become "Потеря сигнала"
                { lat: 55.7348, lon: 37.8600, speed: 40,  time: '08:10' },
                { lat: 55.7350, lon: 37.9000, speed: 35,  time: '08:25' },
                // Near task 2 (Balashikha 55.7348, 38.0113)
                { lat: 55.7345, lon: 37.9500, speed: 45,  time: '08:35' },
                { lat: 55.7348, lon: 38.0100, speed: 10,  time: '08:50' },
                // Stationary near task 2 for 8 min → "Обслуживание"
                { lat: 55.7348, lon: 38.0112, speed: 0,   time: '08:52' },
                { lat: 55.7348, lon: 38.0112, speed: 0,   time: '08:57' },
                { lat: 55.7348, lon: 38.0113, speed: 0,   time: '09:00' },
                // Driving back west
                { lat: 55.7400, lon: 37.9500, speed: 50,  time: '09:10' },
                // Random parking stop (not near any task) for 7 min → "Остановка"
                { lat: 55.7450, lon: 37.8800, speed: 0,   time: '09:20' },
                { lat: 55.7450, lon: 37.8800, speed: 0,   time: '09:25' },
                { lat: 55.7450, lon: 37.8801, speed: 0,   time: '09:27' },
                // Continue driving
                { lat: 55.7500, lon: 37.8000, speed: 55,  time: '09:35' },
                { lat: 55.7530, lon: 37.7000, speed: 60,  time: '09:45' },
                // Near task 3 (Moscow 55.754, 37.620)
                { lat: 55.7540, lon: 37.6210, speed: 10,  time: '10:00' },
                { lat: 55.7540, lon: 37.6205, speed: 0,   time: '10:02' },
                { lat: 55.7540, lon: 37.6205, speed: 0,   time: '10:08' },
                { lat: 55.7541, lon: 37.6205, speed: 0,   time: '10:12' },
            ];
            // ── END TEST DATA ──

            this.selectedRouteData = {
                id: routeId,
                name: `Маршрут ${routeId}`,
                loading_time: '07:00',
                color: '#8601ff',
                tasks: tasks,
                actual_path: testActualPath, // Replace with real API data later
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
        if (this._loadingUnassigned) return;
        this._loadingUnassigned = true;
        try {
            // НЕ передаём delivery_date — бэкенд баг, дата задач не совпадает
            const response = await api.callMethod('GET',
                `/objects/logistic_tasks/compose?filter[route_id]=null&per_page=100&sort_field=id&sort_order=asc`
            );
            
            let rows = response.data?.list?.data || [];
            console.log('🟢 Loaded unassigned tasks:', rows.length);
            this.unassignedTasks = Array.isArray(rows) ? rows : [];
        } catch (error) {
            console.error('🔴 Error loading unassigned tasks:', error);
            this.unassignedTasks = [];
        } finally {
            this._loadingUnassigned = false;
        }
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

        try {
            await api.callMethod('PUT', `/routes/${routeId}/tasks`, { ids });
            
            // Reload route data for map
            this.loadRouteForMap(routeId);
            // Reload unassigned tasks (task may have moved in/out)
            this._loadingUnassigned = false;
            this.loadUnassignedTasks();
            // Refresh unassigned tasks table
            this.logistic_tasks.updatingCount++;
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
}