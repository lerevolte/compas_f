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
        // Защита от гонок при обновлении карты:
        // - _routeDataSeq — номер последнего запроса данных маршрута; ответ
        //   более раннего запроса не должен затирать selectedRouteData,
        //   записанный более поздним (из-за этого «вытащил все точки, а на
        //   карте одна осталась в маршруте»).
        // - _mutationChain — очередь мутаций состава маршрутов: пары
        //   «GET текущих ids → PUT полного списка» не должны перемежаться,
        //   иначе второй drag перетирает результат первого.
        this._routeDataSeq = 0;
        this._mutationChain = Promise.resolve();
    }

    // Последовательное выполнение мутаций состава маршрута (drag&drop).
    _enqueueRouteMutation(fn) {
        this._mutationChain = this._mutationChain.then(fn, fn);
        return this._mutationChain;
    }

    choseRoute(row) {
        console.log('🟢 choseRoute called, row.id:', row.id);
        this.machine_tasks.route_id = row.id;
        this.machine_tasks.updatingCount++;
        // При смене активного маршрута забываем «последний известный цвет»,
        // иначе onRoutesTableLoaded подумает, что цвет не менялся, и не
        // перерисует карту.
        this._lastKnownActiveColorId = null;
        this.getRouteFilters(row.id);
        this.loadRouteForMap(row.id);
    }

    // Сохранение строки в таблице маршрутов: базовый Logistic.updateRoute
    // просто инкрементит updatingCount для перезагрузки таблицы. Отдельно
    // на смену цвета здесь не реагируем — есть универсальный обработчик
    // onRoutesTableLoaded, который ловит ЛЮБОЕ обновление таблицы маршрутов
    // (inline-правка, modal-правка через socket "Загрузить", внешняя правка
    // другим пользователем) и перерисовывает линию маршрута, если цвет
    // активного маршрута поменялся.
    updateRoute(data) {
        super.updateRoute?.(data);
        this.routes.updatingCount++;
        this.machine_tasks.updatingCount++;
    }

    // Маршруты удалены из таблицы «Маршруты»: их задачи возвращаются в
    // «Задачи логистики» (бэкенд отдаёт задачи удалённых маршрутов по
    // фильтру route_id=null), а если среди удалённых был активный маршрут —
    // сбрасываем «Задачи в машине» и карту.
    onRoutesDeleted(ids = []) {
        const deleted = (ids || []).map(Number);
        const activeId = Number(this.machine_tasks.route_id ?? this.selectedRouteData?.id ?? 0);

        if (activeId && deleted.includes(activeId)) {
            this.machine_tasks.route_id = null;
            this.routes.id = null;
            this._lastKnownActiveColorId = null;
            this.activeTaskId = null;
            this.selectedRouteData = null;
            this.machine_tasks.updatingCount++;
        }

        // Таблица маршрутов перезагружает себя сама после delete().
        this.loadUnassignedTasks();
        this.logistic_tasks.updatingCount++;
        if (this.onRouteChanged) this.onRouteChanged();
    }

    // Колбэк @getData таблицы маршрутов: вызывается каждый раз, когда
    // таблица отрисовалась со свежими данными. Если активный маршрут
    // присутствует и его цвет отличается от того, что сейчас на карте,
    // перезапрашиваем map_data, чтобы линия маршрута стала нового цвета.
    onRoutesTableLoaded(rows) {
        const activeId = this.machine_tasks.route_id ?? this.selectedRouteData?.id;
        if (!activeId || !Array.isArray(rows)) return;
        const row = rows.find(r => Number(r?.id) === Number(activeId));
        if (!row) return;

        // color у строки может быть скаляром (id field_value) или объектом
        // {value, localOptions:[{label:{color:...}}]} — приводим к скаляру.
        const extract = (v) => {
            if (v == null) return null;
            if (typeof v === 'object') {
                return v.value ?? v.id ?? null;
            }
            return v;
        };
        const newColorId = extract(row.color);
        const oldColorId = this._lastKnownActiveColorId ?? null;
        if (newColorId !== oldColorId) {
            this._lastKnownActiveColorId = newColorId;
            this.loadRouteForMap(activeId);
        }
    }

    // Ключ координат адреса для сравнения «изменился ли адрес задачи».
    // address бывает строкой (в т.ч. JSON-строкой из loadRouteForMap) или
    // объектом {coords, ...} (строки таблиц) — приводим к одному виду.
    _addressCoordsKey(address) {
        let value = address;
        if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch (e) { return value; }
        }
        if (value && typeof value === 'object') {
            return JSON.stringify(value.coords ?? value);
        }
        return JSON.stringify(value ?? '');
    }

    // Колбэк @getData таблицы «Задачи в машине». Если после перезагрузки
    // таблицы (например, по кнопке «Загрузить» socket-плашки после правки
    // адреса задачи) состав задач или их координаты отличаются от того, что
    // сейчас на карте, — перезапрашиваем данные маршрута, чтобы линия
    // перестроилась по новым адресам. Раньше обновлялась только таблица.
    onMachineTasksTableLoaded(rows) {
        const routeId = this.machine_tasks.route_id;
        if (!routeId || !Array.isArray(rows)) return;
        // Раньше при this.loadingRouteMapData коррекция молча пропускалась
        // (и не повторялась) — если параллельная загрузка привозила устаревший
        // состав, карта оставалась рассинхронизированной до перезагрузки.
        // Теперь гонки разруливает _routeDataSeq, поэтому при расхождении
        // таблицы и карты всегда перезапрашиваем данные маршрута.
        const current = this.selectedRouteData;
        if (!current || Number(current.id) !== Number(routeId)) return;

        const knownById = new Map(
            (current.tasks || []).map(t => [Number(t.id), this._addressCoordsKey(t.address)])
        );
        const sameIds = rows.length === knownById.size
            && rows.every(r => knownById.has(Number(r?.id)));
        const sameCoords = sameIds && rows.every(r =>
            knownById.get(Number(r.id)) === this._addressCoordsKey(r.address)
        );
        if (!sameIds || !sameCoords) {
            this.loadRouteForMap(routeId);
        }
    }

    // Аналог для таблицы «Задачи логистики»: если у нераспределённой задачи
    // после перезагрузки таблицы изменились координаты — обновляем маркеры
    // нераспределённых задач на карте.
    onUnassignedTasksTableLoaded(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const knownById = new Map(
            (this.unassignedTasks || []).map(t => [Number(t.id), this._addressCoordsKey(t.address)])
        );
        const changed = rows.some(r => {
            const known = knownById.get(Number(r?.id));
            return known !== undefined && known !== this._addressCoordsKey(r.address);
        });
        if (changed) {
            this.loadUnassignedTasks();
        }
    }

    async loadRouteForMap(routeId) {
        console.log('🟢 loadRouteForMap called, routeId:', routeId);

        const seq = ++this._routeDataSeq;

        if (!routeId) {
            this.selectedRouteData = null;
            return;
        }

        try {
            this.loadingRouteMapData = true;

            const response = await api.callMethod('GET', `/routes/${routeId}/tasks`);
            // Пока ждали ответ, стартовал более новый запрос данных маршрута —
            // его результат актуальнее, наш ответ молча выбрасываем.
            if (seq !== this._routeDataSeq) return;

            let rows = response.data?.data || [];

            console.log('🟢 Loaded route tasks:', rows.length);

            if (rows.length === 0) {
                console.log('🟠 Route has no tasks');
                this.selectedRouteData = {
                    id: routeId, name: `Маршрут ${routeId}`, loading_time: '07:00',
                    color: '#b6b6b6', tasks: [], actual_path: [],
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
            let routeColor = '#b6b6b6';

            try {
                const mapDataResponse = await api.callMethod('GET', `/routes/${routeId}/map_data`);
                const mapData = mapDataResponse.data || mapDataResponse;
                actualPath = mapData.actual_path || [];
                routeName = mapData.name || routeName;
                loadingTime = mapData.loading_time || loadingTime;
                // Color might be hex (#b6b6b6) or an ID (1484) — only use if it looks like a color
                const rawColor = mapData.color || '';
                if (rawColor && /^(#|rgb|hsl|linear)/.test(rawColor)) {
                    routeColor = rawColor;
                }
            } catch (e) {
                console.log('🟠 map_data endpoint not available, using defaults');
            }

            if (seq !== this._routeDataSeq) return;

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
            if (seq === this._routeDataSeq) this.selectedRouteData = null;
        } finally {
            if (seq === this._routeDataSeq) this.loadingRouteMapData = false;
        }
    }

    async loadUnassignedTasks() {
        this._unassignedRequestId = (this._unassignedRequestId || 0) + 1;
        const requestId = this._unassignedRequestId;
        try {
            // Build filter query
            let filterParams = `filter[route_id]=null&filter[delivery_date]=${this.activeDate}&per_page=500&sort_field=id&sort_order=asc`;
            
            // Add requirements / search filters if set
            if (this.filterFields?.length) {
                this.filterFields.forEach(f => {
                    if (f.key === 'search' && f.value != null && f.value !== '') {
                        // Поиск уходит параметром q= (как в обычных таблицах,
                        // см. Filter.get()), а НЕ filter[search]. Без этого
                        // запрос возвращал все задачи (поиск не применялся).
                        filterParams += `&q=${encodeURIComponent(f.value)}`;
                    } else if (f.key && f.value && Array.isArray(f.value) && (f.key === 'car_requirements' || f.key === 'employee_requirements')) {
                        const filtered = f.value.filter(v => v !== null && v !== undefined && v !== '');
                        if (filtered.length > 0) {
                            filtered.forEach(v => {
                                filterParams += `&filter[${f.key}][]=${v}`;
                            });
                        }
                    } else if ((f.key === 'weight' || f.key === 'volume') && Array.isArray(f.value)) {
                        const min = f.value[0];
                        const max = f.value[1];
                        if (min !== null && min !== undefined && min !== '') {
                            filterParams += `&filter[${f.key}][0]=${encodeURIComponent(min)}`;
                        }
                        if (max !== null && max !== undefined && max !== '') {
                            filterParams += `&filter[${f.key}][1]=${encodeURIComponent(max)}`;
                        }
                    }
                });
            }

            const url = `/objects/logistic_tasks/compose?${filterParams}`;
            const response = await api.callMethod('GET', url);

            if (requestId !== this._unassignedRequestId) return;

            let rows = response.data?.list?.data || [];

            // Карта «значение статуса → цвет» из определения поля point_status
            // (compose возвращает fields с опциями статуса и их цветами). Нужна,
            // чтобы на карте у маркера нераспределённой задачи показать квадратик
            // статуса точки нужного цвета.
            // ВАЖНО: Field::list() отдаёт объект, ключ — имя поля (НЕ массив),
            // поэтому берём по ключу point_status, а фолбэк — по типу через
            // Object.values. (Раньше тут был .find по объекту → исключение →
            // catch обнулял unassignedTasks, и маркеры пропадали с карты.)
            const fieldsDef = response.data?.fields || {};
            const fieldsArr = Array.isArray(fieldsDef) ? fieldsDef : Object.values(fieldsDef);
            const statusField = fieldsDef.point_status
                || fieldsArr.find(f => f && f.type === 'status');
            const statusColorByValue = {};
            if (statusField && Array.isArray(statusField.options)) {
                statusField.options.forEach(o => {
                    if (o && o.value != null) {
                        statusColorByValue[o.value] = o.label?.color || o.color || null;
                    }
                });
            }
            this._unassignedStatusColors = statusColorByValue;

            const statusColors = this._unassignedStatusColors || {};
            this.unassignedTasks = (Array.isArray(rows) ? rows : []).map(row => ({
                ...row,
                statusColor: statusColors[row.point_status] || '#ccc',
                planTime: row.plan_time || row.planTime || ''
            }));
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
        // При смене даты сбрасываем активный маршрут и все связанные с ним
        // состояния — иначе таблица «Задачи в машине» оставалась подвязанной
        // к route_id с прошлой даты, а на карте висел старый selectedRoute.
        this.machine_tasks.route_id = null;
        this.routes.id = null;
        this._lastKnownActiveColorId = null;
        this.activeTaskId = null;
        this.selectedRouteData = null;
        this.unassignedTasks = [];
        this.machine_tasks.updatingCount++;
        this.logistic_tasks.updatingCount++;
        this.routes.updatingCount++;
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

        // НЕ выходим при пустом списке: пустой ids = из маршрута вытащили
        // последнюю задачу. Бэкенду всё равно нужно её отвязать (route_id = null),
        // иначе после перезагрузки задача останется привязанной к маршруту и не
        // появится в «Задачах логистики» (там фильтр route_id = null).
        return this._enqueueRouteMutation(() => this._changeRouteTasks(routeId, ids));
    }

    async _changeRouteTasks(routeId, ids) {
        try {
            const response = await api.callMethod('PUT', `/routes/${routeId}/tasks`, { ids });
            // Данные этого ответа — самые свежие на момент PUT; всё, что
            // запрашивалось раньше, не должно их перезатереть.
            const seq = ++this._routeDataSeq;
            
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
                let routeColor = '#b6b6b6';

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

                if (seq === this._routeDataSeq) {
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
            } else if (seq === this._routeDataSeq) {
                // Маршрут опустел (вытащили последнюю задачу) — чистим данные
                // выбранного маршрута, чтобы на карте не висели старые точки.
                this.selectedRouteData = {
                    id: routeId,
                    name: `Маршрут ${routeId}`,
                    loading_time: '07:00',
                    color: '#b6b6b6',
                    tasks: [],
                    actual_path: [],
                    service_stops: [],
                    parking_stops: [],
                    signal_loss_events: []
                };
            }

            // Reload unassigned tasks (task may have moved in/out)
            this.loadUnassignedTasks();
            // Refresh unassigned tasks table only (route tasks table already updated by drag)
            this.logistic_tasks.updatingCount++;
            this.routes.updatingCount++;
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
        return this._enqueueRouteMutation(() => this._assignTaskToRoute(taskId, routeId));
    }

    async _assignTaskToRoute(taskId, routeId) {
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

    // Создание задачи логистики из адреса «Справочника адресов» (drag&drop
    // адреса на маршрут / в «Задачи в машине»). Адрес-источник НЕ меняется и НЕ
    // удаляется — бэкенд (POST /routes/task-from-address) создаёт новую задачу,
    // копируя поля адреса, и прикрепляет её к маршруту.
    async createTaskFromAddress(addressId, routeId) {
        if (!addressId || !routeId) return;
        return this._enqueueRouteMutation(() => this._createTaskFromAddress(addressId, routeId));
    }

    async _createTaskFromAddress(addressId, routeId) {
        try {
            await api.callMethod('POST', '/routes/task-from-address', {
                address_id: addressId,
                route_id: routeId
            });
        } catch (error) {
            console.error('🔴 Error creating task from address:', error);
        } finally {
            // Перерисовать маршруты и нераспределённые задачи.
            this.routes.updatingCount++;
            this.loadUnassignedTasks();
            this.logistic_tasks.updatingCount++;
            // Перерисовать активный маршрут (Задачи в машине) и карту.
            if (this.machine_tasks.route_id) {
                this.machine_tasks.updatingCount++;
                this.loadRouteForMap(this.machine_tasks.route_id);
            }
            if (this.onRouteChanged) this.onRouteChanged();
        }
    }

    // Снимает задачу с активного маршрута (machine_tasks.route_id) без drag&drop —
    // используется когда задачу тащили при скрытой вкладке «Задачи логистики»
    // и vuedraggable не нашёл контейнер-цель.
    async unassignTaskFromRoute(taskId) {
        const routeId = this.machine_tasks.route_id;
        if (!routeId || !taskId) return;
        return this._enqueueRouteMutation(() => this._unassignTaskFromRoute(taskId, routeId));
    }

    async _unassignTaskFromRoute(taskId, routeId) {
        try {
            const response = await api.callMethod('GET', `/routes/${routeId}/tasks`);
            const currentIds = (response.data?.data || []).map(t => t.id);
            const newIds = currentIds.filter(id => String(id) !== String(taskId));
            if (newIds.length === currentIds.length) return;
            await api.callMethod('PUT', `/routes/${routeId}/tasks`, { ids: newIds });
        } catch (error) {
            console.error('🔴 Error unassigning task from route:', error);
        } finally {
            this.routes.updatingCount++;
            this.machine_tasks.updatingCount++;
            this.loadUnassignedTasks();
            this.logistic_tasks.updatingCount++;
            this.loadRouteForMap(routeId);
            if (this.onRouteChanged) this.onRouteChanged();
        }
    }
}