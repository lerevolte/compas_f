<template>
    <div class="logistic-map">
        <div class="logistic-map__header">
            <div class="logistic-map__title">Карта</div>
            <div class="logistic-map__header-actions">
                <IconLaso
                    v-if="props.enableSelection"
                    class="map__frame-selection"
                    :class="{ 'map__frame-selection_active': selectionActive }"
                    @click="toggleSelectionMode"
                />
                <!-- Открыть выбранный маршрут в Яндекс.Картах -->
                <button
                    v-if="hasRoutePoints"
                    class="logistic-map__open-route"
                    @click.stop="openRouteInYandex"
                >Открыть маршрут</button>
                <!-- Settings -->
                <div class="logistic-map__settings" @click.stop>
                    <button class="logistic-map__settings-button" @click.stop="toggleSettings">
                        <IconSettings />
                    </button>
                    <div ref="settingsPanelRef" class="settings-panel" @click.stop></div>
                </div>
            </div>
        </div>

        <div class="logistic-map__body">
            <div ref="mapContainerRef" class="logistic-map__container"></div>
        </div>
    </div>
</template>

<script setup>
    import './LogisticMap.scss';
    import IconLaso from '@AppIcons/Laso.vue';
    import IconSettings from '@AppIcons/Actions/Settings.vue';
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'

    let L = null;

    const emit = defineEmits(['getSelectedPoints', 'unassignedTaskClick', 'routeTaskClick']);

    const props = defineProps({
        routeData: { default: null, type: Object },
        unassignedTasks: { default: () => [], type: Array },
        showUnassigned: { default: true, type: Boolean },
        enableSelection: { default: false, type: Boolean },
        activeTaskId: { default: null, type: [Number, String] },
        defaultCenter: { default: () => [55.755864, 37.617698], type: Array },
        serviceRadius: { default: 500, type: Number }
    });

    const mapContainerRef = ref(null);
    const settingsPanelRef = ref(null);
    const mapInstance = ref(null);
    const mapReady = ref(false);
    const settingsOpen = ref(false);
    const settingsSubmenu = ref(null);
    const selectionActive = ref(false);

    const settings = reactive({
        orders: 'all',
        route_display: 'standard',
        map_type: 'Яндекс.Карты',
        analytics: { stops: true, signal_loss: true, actual_path: true }
    });

    // ── Layer refs ──
    let baseLayers = {};
    let routeMarkers = [];
    let actualPathLayers = [];
    let actualMarkerLayers = [];
    let stopMarkersLayer = null;
    let signalLossMarkersLayer = null;
    let unassignedMarkers = [];
    let routeDecoratorsLayer = null;
    let serviceRadiusCircle = null;
    let activeMarkerElement = null;
    let routingControl = null;

    // ★ This holds the processed route data including coordinates for re-drawing
    let processedRoute = null;

    // Selection state
    let selectionPolygon = null;
    let isDrawingPath = false;
    let selectionPath = [];
    let drawingPolyline = null;
    let selectionMouseDownHandler = null;

    // ── Settings panel (fully DOM-managed, Vue reactivity broken by Leaflet) ──
    const renderSettingsPanel = () => {
        const panel = settingsPanelRef.value;
        if (!panel) return;

        const sub = settingsSubmenu.value;
        let html = '';

        if (sub === null) {
            html = `
                <div class="menu-panel active">
                    <div class="menu-item" data-sub="orders">Заказы <figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure></div>
                    <div class="menu-item" data-sub="route_display">Отображение маршрута<figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure></div>
                    <div class="menu-item" data-sub="maps">Карты <figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure></div>
                </div>`;
        } else if (sub === 'orders') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure> Заказы</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="all" ${settings.orders === 'all' ? 'checked' : ''}> Все</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="in_car" ${settings.orders === 'in_car' ? 'checked' : ''}> В машине</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="unprocessed" ${settings.orders === 'unprocessed' ? 'checked' : ''}> Показать необработанные</label></div>
                </div>`;
        } else if (sub === 'route_display') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure> Отображение маршрута</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="standard" ${settings.route_display === 'standard' ? 'checked' : ''}> Стандартный</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="decorated" ${settings.route_display === 'decorated' ? 'checked' : ''}> С направлением</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="vector" ${settings.route_display === 'vector' ? 'checked' : ''}> Вектор движения</label></div>
                </div>`;
        } else if (sub === 'maps') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure> Карты</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="OpenStreetMap" ${settings.map_type === 'OpenStreetMap' ? 'checked' : ''}> OpenStreetMap</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="Яндекс.Карты" ${settings.map_type === 'Яндекс.Карты' ? 'checked' : ''}> Яндекс.Карты</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="Яндекс.Спутник" ${settings.map_type === 'Яндекс.Спутник' ? 'checked' : ''}> Яндекс.Спутник</label></div>
                </div>`;
        } else if (sub === 'analytics') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><figure class="icon__arrow"><svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg></figure> Аналитика</div>
                    <div class="menu-item checkbox-item"><label><input type="checkbox" name="s_stops" ${settings.analytics.stops ? 'checked' : ''}> Остановки</label></div>
                    <div class="menu-item checkbox-item"><label><input type="checkbox" name="s_signal_loss" ${settings.analytics.signal_loss ? 'checked' : ''}> Потеря сигнала</label></div>
                    <div class="menu-item checkbox-item"><label><input type="checkbox" name="s_actual_path" ${settings.analytics.actual_path ? 'checked' : ''}> Фактический маршрут</label></div>
                </div>`;
        }

        panel.innerHTML = html;

        // Bind navigation clicks
        panel.querySelectorAll('[data-sub]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = el.getAttribute('data-sub');
                settingsSubmenu.value = target === 'back' ? null : target;
                renderSettingsPanel();
            });
        });

        // Bind radio changes
        panel.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const name = e.target.name;
                const val = e.target.value;
                if (name === 's_orders') {
                    // Смена набора заказов меняет видимость и маршрута, и
                    // необработанных задач — полностью перерисовываем карту.
                    // skipFitBounds: только фильтруем точки, зум не меняем.
                    settings.orders = val;
                    renderAll({ skipFitBounds: true });
                    return;
                }
                else if (name === 's_route_display') settings.route_display = val;
                else if (name === 's_map_type') settings.map_type = val;
                applySettings();
            });
        });

        // Bind checkbox changes
        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const name = e.target.name;
                if (name === 's_stops') settings.analytics.stops = e.target.checked;
                else if (name === 's_signal_loss') settings.analytics.signal_loss = e.target.checked;
                else if (name === 's_actual_path') settings.analytics.actual_path = e.target.checked;
                applySettings();
            });
        });
    };

    const toggleSettings = () => {
        settingsOpen.value = !settingsOpen.value;
        if (!settingsOpen.value) {
            settingsSubmenu.value = null;
        }
        if (settingsPanelRef.value) {
            if (settingsOpen.value) {
                renderSettingsPanel();
                settingsPanelRef.value.style.display = 'block';
            } else {
                settingsPanelRef.value.style.display = 'none';
            }
        }
    };

    const closeSettingsOnClick = (e) => {
        const settingsEl = e.target.closest('.logistic-map__settings');
        if (settingsEl) return;
        
        if (settingsOpen.value) {
            settingsOpen.value = false;
            settingsSubmenu.value = null;
            if (settingsPanelRef.value) {
                settingsPanelRef.value.style.display = 'none';
            }
        }
    };

    // ── Helpers ──
    // ── Decode OSRM encoded polyline (polyline5 format) ──
    const decodePolyline = (encoded) => {
        const points = [];
        let index = 0, lat = 0, lng = 0;
        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
            points.push([lat / 1e5, lng / 1e5]);
        }
        return points;
    };

    const calculateBearing = (lat1, lon1, lat2, lon2) => {
        const dLon = lon2 - lon1;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    };

    const parseAddress = (address) => {
        try {
            // Convert Vue Proxy to raw object if needed
            let raw = address;
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                raw = JSON.parse(JSON.stringify(raw));
            }
            const addr = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (addr && addr.coords && addr.coords.length === 2) {
                const lat = parseFloat(addr.coords[0]);
                const lng = parseFloat(addr.coords[1]);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    return { text: addr.text || '', coords: [lat, lng] };
                }
            }
        } catch (e) {}
        return null;
    };

    // ── Load libraries ──
    const loadLeaflet = async () => {
        if (L) return;
        const leafletModule = await import('leaflet');
        L = leafletModule.default;
        await import('leaflet/dist/leaflet.css');
        if (typeof window !== 'undefined') window.L = L;
        await loadYandexMapsAPI();
        await import('@AppComponents/Inputs/Map/Yandex.js');
    };

    const loadYandexMapsAPI = () => {
        return new Promise((resolve) => {
            if (window.ymaps && typeof window.ymaps.ready === 'function') { resolve(); return; }
            if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
                const check = setInterval(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') { clearInterval(check); resolve(); }
                }, 100);
                setTimeout(() => { clearInterval(check); resolve(); }, 10000);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://api-maps.yandex.ru/2.1/?apikey=10946c08-3ea9-4fac-95d1-c833ee44dd6b&suggest_apikey=ac70b70c-5e2e-4a1e-9d90-a66aa3b11ddd&lang=ru_RU';
            script.onload = () => setTimeout(resolve, 200);
            script.onerror = () => resolve(); // Don't block on error
            document.head.appendChild(script);
        });
    };

    const loadRoutingMachine = () => {
        return new Promise(async (resolve, reject) => {
            if (window.L?.Routing?.control) { resolve(); return; }
            try {
                await import('@AppComponents/Inputs/Map/RoutingMachine.js');
                setTimeout(() => {
                    window.L?.Routing?.control ? resolve() : reject(new Error('RoutingMachine not loaded'));
                }, 200);
            } catch (e) { reject(e); }
        });
    };

    const loadMarkerCluster = async () => {
        if (L?.markerClusterGroup) return;
        try {
            await import('leaflet.markercluster/dist/leaflet.markercluster.js');
            await import('leaflet.markercluster/dist/MarkerCluster.css');
            await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
        } catch (e) { console.warn('MarkerCluster not available'); }
    };

    const loadPolylineDecorator = async () => {
        if (L?.polylineDecorator) return;
        try { await import('leaflet-polylinedecorator'); } catch (e) {}
    };

    // ── Init map ──
    const initMap = async () => {
        if (typeof window === 'undefined') return;
        await nextTick();
        if (!mapContainerRef.value) return;

        await loadLeaflet();

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const center = fetchedCenter.value || props.defaultCenter;
        mapInstance.value = L.map(mapContainerRef.value, { center, zoom: 10, zoomControl: true, minZoom: 3, maxZoom: 18, doubleClickZoom: false });

        // Monkey-patch L.Marker to prevent _animateZoom crash on removed markers
        const origAnimateZoom = L.Marker.prototype._animateZoom;
        if (origAnimateZoom && !L.Marker.prototype._animateZoomPatched) {
            L.Marker.prototype._animateZoom = function(opt) {
                if (!this._map) return;
                origAnimateZoom.call(this, opt);
            };
            L.Marker.prototype._animateZoomPatched = true;
        }

        // Wait for ymaps to be fully ready before creating Yandex layers
        if (settings.map_type.startsWith('Яндекс') && window.ymaps) {
            await new Promise(resolve => {
                window.ymaps.ready(resolve);
            });
        }

        baseLayers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }),
            'Яндекс.Карты': L.yandex({ suppressMapOpenBlock: true, suppressObsoleteBrowserNotifier: true }),
            'Яндекс.Спутник': L.yandex({ type: 'satellite', suppressMapOpenBlock: true, suppressObsoleteBrowserNotifier: true })
        };

        baseLayers[settings.map_type].addTo(mapInstance.value);

        // Disable clicks on Yandex map objects (POIs, buildings etc)
        const disableYandexClicks = () => {
            Object.values(baseLayers).forEach(layer => {
                if (layer._yandex) {
                    try {
                        layer._yandex.events.add('click', (e) => e.preventDefault());
                        layer._yandex.panes.get('events').getElement().style.pointerEvents = 'none';
                    } catch(e) {}
                }
            });
        };
        if (window.ymaps) {
            window.ymaps.ready(() => setTimeout(disableYandexClicks, 500));
        }

        stopMarkersLayer = L.layerGroup().addTo(mapInstance.value);
        signalLossMarkersLayer = L.layerGroup().addTo(mapInstance.value);
        routeDecoratorsLayer = L.layerGroup().addTo(mapInstance.value);

        try { await loadMarkerCluster(); } catch (e) {}
        try { await loadPolylineDecorator(); } catch (e) {}

        // Клик по пустой карте НЕ деактивирует выбранный маркер: снятие
        // выделения должно происходить только при выборе другого маркера или
        // другой задачи через таблицу (см. handleMarkerClick — оно само
        // снимает .active с остальных route-popup__extend). Поэтому здесь
        // намеренно ничего не сбрасываем.

        mapReady.value = true;
        console.log('🟢 Map initialized');

        setTimeout(() => {
            if (!mapInstance.value) return;
            renderAll();
        }, 300);
    };

    // ── Clear all ──
    const clearAllLayers = () => {
        if (!mapInstance.value) return;
        if (routingControl) { mapInstance.value.removeControl(routingControl); routingControl = null; }
        routeMarkers.forEach(l => mapInstance.value.removeLayer(l)); routeMarkers = [];
        groupedMarkers.forEach(l => mapInstance.value.removeLayer(l)); groupedMarkers = [];
        actualPathLayers.forEach(l => mapInstance.value.removeLayer(l)); actualPathLayers = [];
        actualMarkerLayers.forEach(l => mapInstance.value.removeLayer(l)); actualMarkerLayers = [];
        clearUnassignedMarkers();
        stopMarkersLayer?.clearLayers();
        signalLossMarkersLayer?.clearLayers();
        routeDecoratorsLayer?.clearLayers();
        if (serviceRadiusCircle) { mapInstance.value.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null; }
        processedRoute = null;
    };

    const clearUnassignedMarkers = () => {
        unassignedMarkers.forEach(m => {
            if (mapInstance.value) mapInstance.value.removeLayer(m);
        });
        unassignedMarkers = [];
    };

    // ── Render all ──
    let isRendering = false;

    const renderAll = async (opts = {}) => {
        if (!mapInstance.value || !L) return;
        if (isRendering) { console.log('🟠 renderAll skipped — already rendering'); return; }
        isRendering = true;

        try {
            clearAllLayers();

            if (shouldShowRoute() && props.routeData?.tasks?.length > 0) {
                await renderRoute(props.routeData);
            }

            if (shouldShowUnassigned()) {
                renderUnassignedTasks(props.unassignedTasks);
            }

            // Group overlapping markers at same coordinates
            groupOverlappingMarkers();

            if (!opts.skipFitBounds && props.routeData?.tasks?.length > 0) {
                fitBounds();
            }
        } finally {
            isRendering = false;
        }
    };

    // ── Group markers at same coordinates into combined (cluster) markers ──
    let groupedMarkers = [];

    // Иконки кластера (SVG лежат в public/img/, подключены через CSS по классу
    // .cluster-popup_<type> .cluster-marker__icon):
    //   cluster-unassigned.svg — кластер только из необработанных задач (серый фон)
    //   cluster-route.svg      — кластер точек одного маршрута (фон = цвет маршрута)
    //   cluster-mixed.svg      — смешанный кластер (градиент) — вложенное меню

    const extractTaskName = (name, fallback = '') => {
        if (!name) return fallback;
        if (typeof name === 'string') return name;
        if (typeof name === 'object') return name.value || name.name || name.title || fallback;
        return fallback;
    };

    // Унифицированная информация о точке кластера. groupKey/groupName/groupColor
    // определяют «принадлежность» (маршрут или необработанные) — это сразу
    // обобщает кластеры на N маршрутов, когда на карту начнут выводить все
    // маршруты (сейчас route-точки всегда из выбранного маршрута).
    const getClusterItemInfo = (item) => {
        if (item.type === 'route') {
            const task = processedRoute?.tasks?.find(t => t.id === item.id);
            const planTime = task?.departureTime?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) || task?.planTime || '';
            return {
                id: item.id,
                type: 'route',
                groupKey: `route:${task?.routeId ?? processedRoute?.id ?? 'route'}`,
                groupName: task?.routeName || processedRoute?.name || 'Маршрут',
                groupColor: task?.routeColor || '#b6b6b6',
                statusColor: task?.statusColor || '#ccc',
                order: task?.order || '',
                planTime,
                factTime: task?.factTime || '',
                name: extractTaskName(task?.name, `#${item.id}`)
            };
        }
        const ut = props.unassignedTasks.find(t => Number(t.id) === Number(item.id));
        return {
            id: item.id,
            type: 'unassigned',
            groupKey: 'unassigned',
            groupName: 'Необработанные',
            groupColor: '#A6B7D4',
            statusColor: ut?.statusColor || '#ccc',
            order: '',
            planTime: ut?.planTime || ut?.plan_time || '',
            factTime: '',
            name: extractTaskName(ut?.name, `#${item.id}`)
        };
    };

    // Строка точки маршрута: статус / порядок / план · факт (pr3).
    const renderClusterPoint = (info) => {
        const fact = info.factTime
            ? ` <span class="cluster-point__sep">·</span> <span class="cluster-point__fact">${info.factTime}</span>`
            : '';
        return `<div class="cluster-point" data-task-id="${info.id}" data-type="${info.type}">
            <span class="route-popup__status route-popup__status_inline" style="background:${info.statusColor}"></span>
            <span class="cluster-point__order">${info.order}.</span>
            <span class="cluster-point__time">${info.planTime}</span>${fact}
        </div>`;
    };

    // Строка необработанной задачи: только название (как сейчас).
    const renderClusterName = (info) => {
        return `<div class="cluster-point cluster-point_name" data-task-id="${info.id}" data-type="${info.type}">
            <span class="cluster-point__name">${info.name}</span>
        </div>`;
    };

    // Навигация по содержимому кластера: вложенное меню (case 2) + клики по
    // точкам. Вынесено в функцию, чтобы переиспользовать при открытии кластера
    // как кликом по карте, так и из таблицы (focusGroupedMarker).
    const bindClusterEvents = (el) => {
        if (!el) return;
        // Вход во вложенное меню (по маршруту / необработанным).
        el.querySelectorAll('.cluster-menu__item').forEach(menuItem => {
            menuItem.onclick = (ev) => {
                ev.stopPropagation();
                const key = menuItem.dataset.groupKey;
                const root = el.querySelector('.cluster-menu[data-level="root"]');
                if (root) root.style.display = 'none';
                el.querySelectorAll('.cluster-submenu').forEach(s => {
                    s.style.display = s.dataset.groupKey === key ? 'block' : 'none';
                });
            };
        });
        // Возврат на верхний уровень меню.
        el.querySelectorAll('.cluster-submenu__back').forEach(back => {
            back.onclick = (ev) => {
                ev.stopPropagation();
                const root = el.querySelector('.cluster-menu[data-level="root"]');
                if (root) root.style.display = 'block';
                el.querySelectorAll('.cluster-submenu').forEach(s => { s.style.display = 'none'; });
            };
        });
        // Клик по точке — выделение и эмит выбора в таблицу/карту.
        el.querySelectorAll('.cluster-point').forEach(ci => {
            ci.onclick = (ev) => {
                ev.stopPropagation();
                const tid = Number(ci.dataset.taskId);
                const ttype = ci.dataset.type;
                el.querySelectorAll('.cluster-point.active').forEach(i => i.classList.remove('active'));
                ci.classList.add('active');
                if (ttype === 'route') {
                    const task = processedRoute?.tasks?.find(t => t.id === tid);
                    if (task) { clickedFromMap = true; emit('routeTaskClick', task); setTimeout(() => { clickedFromMap = false; }, 100); }
                } else {
                    const rawTask = props.unassignedTasks.find(t => Number(t.id) === tid);
                    if (rawTask) { clickedFromMap = true; emit('unassignedTaskClick', rawTask); setTimeout(() => { clickedFromMap = false; }, 100); }
                }
            };
        });
    };

    const groupOverlappingMarkers = () => {
        // Clean up old grouped markers
        groupedMarkers.forEach(m => { if (mapInstance.value) mapInstance.value.removeLayer(m); });
        groupedMarkers = [];

        // Collect all task markers with their coords
        const allMarkers = [
            ...routeMarkers.map(m => ({ marker: m, type: 'route', id: m._taskId, lat: m.getLatLng().lat, lng: m.getLatLng().lng })),
            ...unassignedMarkers.map(m => ({ marker: m, type: 'unassigned', id: m._taskId, lat: m.getLatLng().lat, lng: m.getLatLng().lng }))
        ];

        // Group by coordinate key (rounded to 6 decimals to handle float imprecision)
        const groups = {};
        allMarkers.forEach(item => {
            const key = `${item.lat.toFixed(6)}_${item.lng.toFixed(6)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // For groups with >1 marker, hide originals and create combined marker
        Object.values(groups).forEach(group => {
            if (group.length <= 1) return;

            group.forEach(item => mapInstance.value.removeLayer(item.marker));

            const infos = group.map(getClusterItemInfo);

            // Группируем точки по принадлежности (маршрут / необработанные).
            const byGroup = {};
            const groupOrder = [];
            infos.forEach(info => {
                if (!byGroup[info.groupKey]) {
                    byGroup[info.groupKey] = { key: info.groupKey, type: info.type, name: info.groupName, color: info.groupColor, items: [] };
                    groupOrder.push(info.groupKey);
                }
                byGroup[info.groupKey].items.push(info);
            });

            const count = group.length;
            let iconType;
            let extendHtml;

            if (groupOrder.length === 1) {
                const only = byGroup[groupOrder[0]];
                if (only.type === 'unassigned') {
                    // Case 1a — только необработанные: список названий.
                    iconType = 'unassigned';
                    extendHtml = `<div class="cluster-list">${only.items.map(renderClusterName).join('')}</div>`;
                } else {
                    // Case 1b — один маршрут: статус / порядок / время.
                    iconType = 'route';
                    extendHtml = `<div class="cluster-list">${only.items.map(renderClusterPoint).join('')}</div>`;
                }
            } else {
                // Case 2 — смешанный кластер: вложенное меню.
                iconType = 'mixed';
                const rootItems = groupOrder.map(k => {
                    const g = byGroup[k];
                    return `<div class="cluster-menu__item" data-group-key="${g.key}">
                        <span class="cluster-menu__color" style="background:${g.color}"></span>
                        <span class="cluster-menu__name">${g.name}</span>
                        <span class="cluster-menu__arrow">›</span>
                    </div>`;
                }).join('');
                const subMenus = groupOrder.map(k => {
                    const g = byGroup[k];
                    const rows = g.type === 'unassigned'
                        ? g.items.map(renderClusterName).join('')
                        : g.items.map(renderClusterPoint).join('');
                    return `<div class="cluster-submenu" data-group-key="${g.key}" style="display:none">
                        <div class="cluster-submenu__back" data-group-key="${g.key}">
                            <span class="cluster-menu__back-arrow">‹</span>
                            <span class="cluster-menu__color" style="background:${g.color}"></span>
                            <span class="cluster-menu__name">${g.name}</span>
                        </div>
                        <div class="cluster-list">${rows}</div>
                    </div>`;
                }).join('');
                extendHtml = `<div class="cluster-menu" data-level="root">${rootItems}</div>${subMenus}`;
            }

            // Для кластера маршрута фон иконки = цвет маршрута (задаём inline);
            // серый (unassigned) и градиент (mixed) — в CSS по классу типа.
            const iconColorStyle = iconType === 'route'
                ? ` style="background-color:${byGroup[groupOrder[0]].color}"`
                : '';

            const html = `<div class="route-popup cluster-popup cluster-popup_${iconType}">
                <div class="route-popup__main cluster-marker">
                    <span class="cluster-marker__icon"${iconColorStyle}></span>
                    <span class="cluster-marker__count">${count}</span>
                </div>
                <div class="route-popup__extend cluster-extend">${extendHtml}</div>
            </div>`;

            const combined = L.marker([group[0].lat, group[0].lng], {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [14, 14] }),
                zIndexOffset: 1100
            }).addTo(mapInstance.value);

            combined.on('click', () => {
                const el = combined.getElement();
                if (el) handleMarkerClick(el);
                setTimeout(() => bindClusterEvents(el), 50);
            });

            groupedMarkers.push(combined);
        });
    };

    const shouldShowUnassigned = () => {
        if (!props.showUnassigned) return false;
        // "В машине" = only show route tasks, hide unassigned
        if (settings.orders === 'in_car') return false;
        return true;
    };

    // "Показать необработанные" = только необработанные задачи, маршрут скрываем.
    // "Все" и "В машине" — маршрут показываем.
    const shouldShowRoute = () => {
        if (settings.orders === 'unprocessed') return false;
        return true;
    };

    // ── Открыть выбранный маршрут в Яндекс.Картах ──
    const routePointCoords = () => {
        const tasks = [...(props.routeData?.tasks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const coords = [];
        tasks.forEach(t => {
            const a = parseAddress(t.address);
            if (a && a.coords.length === 2) coords.push(`${a.coords[0]},${a.coords[1]}`);
        });
        return coords;
    };

    const hasRoutePoints = computed(() => (props.routeData?.tasks?.length || 0) > 0);

    const openRouteInYandex = () => {
        if (typeof window === 'undefined') return;
        const coords = routePointCoords();
        if (coords.length < 2) return;
        const rtext = coords.join('~');
        const url = `https://yandex.ru/maps/?from=api-maps&mode=routes&rtext=${rtext}`;
        window.open(url, '_blank', 'noopener');
    };

    // ── Render route ──
    const renderRoute = async (routeData) => {
        const allTasks = [...(routeData.tasks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const tasksWithAddress = allTasks.filter(t => parseAddress(t.address));

        console.log('🟢 renderRoute: total tasks:', allTasks.length, 'with address:', tasksWithAddress.length);
        tasksWithAddress.forEach(t => {
            const addr = parseAddress(t.address);
            console.log('🔵 Route task:', t.id, 'name:', typeof t.name === 'object' ? JSON.stringify(t.name) : t.name, 'raw address:', t.address, 'parsed coords:', addr?.coords);
        });

        if (tasksWithAddress.length === 0) return;

        const waypoints = tasksWithAddress.map(t => {
            const addr = parseAddress(t.address);
            return L.latLng(addr.coords[0], addr.coords[1]);
        });

        // Build tasks with times (simple calculation without routing)
        const buildTasksWithTime = (routeCoordinates) => {
            const [startHours, startMinutes] = (routeData.loading_time || '07:00').split(':').map(Number);
            const startTime = new Date();
            startTime.setHours(startHours, startMinutes, 0, 0);

            let cumulativeServiceTime = 0;

            return allTasks.map((task, idx) => {
                const addr = parseAddress(task.address);
                let arrivalTime = null;
                let departureTime = null;

                if (addr) {
                    const totalSeconds = cumulativeServiceTime + idx * 600; // rough estimate: 10min between points
                    arrivalTime = new Date(startTime.getTime() + totalSeconds * 1000);
                    departureTime = new Date(arrivalTime.getTime() + (task.service_time || 0) * 60000);
                }
                cumulativeServiceTime += (task.service_time || 0) * 60;

                return {
                    ...task,
                    latLng: addr ? L.latLng(addr.coords[0], addr.coords[1]) : null,
                    arrivalTime,
                    departureTime,
                    adjustedTime: departureTime,
                    routeId: routeData.id,
                    routeColor: routeData.color || '#b6b6b6',
                    routeName: routeData.name || `Маршрут ${routeData.id}`
                };
            }).filter(t => t.latLng && t.arrivalTime);
        };

        // Try to fetch route from OSRM

        try {
            await loadRoutingMachine();

            // Build OSRM URL и тянем геометрию маршрута. На длинных маршрутах
            // (>500 км) OSRM с default-конфигом часто упирается в лимиты по
            // сэмплированию (`max-matching-radius`/`max-table-size`), и при
            // `overview=simplified` или `overview=false` отдаёт сильно «обрезанную»
            // или ступенчатую геометрию — отсюда визуальные обрывы (см. bug2).
            // Просим `overview=full` + `geometries=geojson`: один массив [lng,lat]
            // на весь маршрут, без полилайн-кодирования.
            //
            // Параллельно делаем дополнительную проверку «полноты»: если
            // декодированная геометрия не дотягивает до последнего waypoint
            // (> ~3 км от него) — считаем это обрывом и достраиваем хвост
            // прямой линией от последней точки геометрии до последнего
            // waypoint. Лучше пунктир-намёк, чем «полпути в никуда».
            const coordsStr = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
            const osrmUrl = `/route/v1/driving/${coordsStr}?overview=full&alternatives=false&steps=false&geometries=geojson`;

            console.log('🟢 Fetching OSRM route:', osrmUrl);

            let osrmResponse;
            try {
                // Try relative URL first (works on production)
                const res = await fetch(osrmUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                osrmResponse = await res.json();
            } catch (fetchErr) {
                // Fallback: try production URL directly
                console.log('🟠 Relative fetch failed, trying production URL');
                const res = await fetch(`https://opt6.compas.pro${osrmUrl}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                osrmResponse = await res.json();
            }

            if (osrmResponse.code !== 'Ok' || !osrmResponse.routes?.length) {
                throw new Error('No routes found');
            }

            console.log('🟢 OSRM response OK');
            const osrmRoute = osrmResponse.routes[0];

            // С geometries=geojson получаем готовый массив координат
            // [lng, lat] — перекладываем в [lat, lng] для Leaflet.
            // Фолбэк: если вернулся encoded-полилайн или geometry только
            // по шагам — декодируем доступным способом.
            let routeCoordinates = [];
            const geom = osrmRoute.geometry;
            if (geom && typeof geom === 'object' && Array.isArray(geom.coordinates)) {
                routeCoordinates = geom.coordinates.map(c => [c[1], c[0]]);
            } else if (typeof geom === 'string') {
                routeCoordinates = decodePolyline(geom);
            } else if (osrmRoute.legs) {
                osrmRoute.legs.forEach(leg => {
                    (leg.steps || []).forEach(step => {
                        if (step.geometry) {
                            const dec = typeof step.geometry === 'string'
                                ? decodePolyline(step.geometry)
                                : (step.geometry.coordinates || []).map(c => [c[1], c[0]]);
                            routeCoordinates.push(...dec);
                        }
                    });
                });
            }
            console.log('🟢 OSRM geometry points:', routeCoordinates.length);

            // Защита от «обрыва»: проверяем, что геометрия не оборвана раньше
            // последнего waypoint. Если последняя точка маршрута дальше ~3 км
            // от целевой — достраиваем прямую к ней, чтобы линия дошла до
            // конечного маркера, а не зависала где-то посередине.
            if (routeCoordinates.length && waypoints.length) {
                const lastGeo = routeCoordinates[routeCoordinates.length - 1];
                const lastWp = waypoints[waypoints.length - 1];
                if (lastGeo && lastWp && typeof lastWp.lat === 'number' && typeof lastWp.lng === 'number') {
                    const dist = L.latLng(lastGeo[0], lastGeo[1]).distanceTo(lastWp);
                    if (dist > 3000) {
                        console.warn('🟠 OSRM geometry ends', Math.round(dist), 'm from last waypoint — patching');
                        routeCoordinates.push([lastWp.lat, lastWp.lng]);
                    }
                }
                // Симметрично — проверяем стартовый waypoint, бывает что
                // OSRM «срезает» начало (например, если стартовая точка — на
                // обочине, и OSRM нанизывает геометрию от ближайшей дороги).
                const firstGeo = routeCoordinates[0];
                const firstWp = waypoints[0];
                if (firstGeo && firstWp && typeof firstWp.lat === 'number' && typeof firstWp.lng === 'number') {
                    const dist = L.latLng(firstGeo[0], firstGeo[1]).distanceTo(firstWp);
                    if (dist > 3000) {
                        console.warn('🟠 OSRM geometry starts', Math.round(dist), 'm from first waypoint — patching');
                        routeCoordinates.unshift([firstWp.lat, firstWp.lng]);
                    }
                }
            }

            // Проверка «полноты» по ВСЕМ waypoint'ам (а не только концам).
            // Если хоть одна точка далеко от всей геометрии — значит маршрут
            // оборван в середине (частая причина — данные OSRM не покрывают
            // регион целиком, и геометрия обрывается на границе покрытия).
            // В этом случае строим непрерывную прямую через все точки, чтобы
            // линия доходила до каждого маркера, а не обрывалась посередине.
            if (routeCoordinates.length && waypoints.length > 1) {
                let maxGap = 0;
                for (const wp of waypoints) {
                    let minDist = Infinity;
                    for (const c of routeCoordinates) {
                        const d = L.latLng(c[0], c[1]).distanceTo(wp);
                        if (d < minDist) minDist = d;
                        if (minDist < 2000) break; // достаточно близко — дальше не ищем
                    }
                    if (minDist > maxGap) maxGap = minDist;
                }
                if (maxGap > 5000) {
                    console.warn('🟠 OSRM route does not cover all waypoints (max gap', Math.round(maxGap), 'm) — using straight-line path');
                    routeCoordinates = waypoints.map(wp => [wp.lat, wp.lng]);
                }
            }

            // Build tasks with proper travel times
            const [startHours, startMinutes] = (routeData.loading_time || '07:00').split(':').map(Number);
            const startTime = new Date();
            startTime.setHours(startHours, startMinutes, 0, 0);

            const reachPoints = [];
            let cumTravelTime = 0;
            osrmRoute.legs.forEach((leg, i) => {
                cumTravelTime += leg.duration;
                if (i < osrmRoute.legs.length) {
                    reachPoints.push({ time: cumTravelTime });
                }
            });

            let cumServiceTime = 0;
            let wpIdx = 0;

            const tasksWithTime = allTasks.map((task) => {
                const addr = parseAddress(task.address);
                let arrivalTime = null, departureTime = null;

                if (addr) {
                    const travelTime = wpIdx === 0 ? 0 : (reachPoints[wpIdx - 1]?.time || 0);
                    arrivalTime = new Date(startTime.getTime() + (travelTime + cumServiceTime) * 1000);
                    departureTime = new Date(arrivalTime.getTime() + (task.service_time || 0) * 60000);
                    wpIdx++;
                }
                cumServiceTime += (task.service_time || 0) * 60;

                return {
                    ...task,
                    latLng: addr ? L.latLng(addr.coords[0], addr.coords[1]) : null,
                    arrivalTime, departureTime,
                    routeId: routeData.id,
                    routeColor: routeData.color || '#b6b6b6',
                    routeName: routeData.name || `Маршрут ${routeData.id}`
                };
            }).filter(t => t.latLng && t.arrivalTime);

            adjustPlannedTimes(tasksWithTime, routeData.service_stops || []);

            processedRoute = {
                ...routeData,
                tasks: tasksWithTime,
                coordinates: routeCoordinates.map(c => L.latLng(c[0], c[1])),
                waypointCoords: waypoints
            };

            drawPlannedRoute();
            createTaskMarkers(tasksWithTime);
        } catch (e) {
            // ★ Fallback: no routing available, draw straight lines
            console.log('🟠 Routing failed, using straight-line fallback:', e.message);

            const validTasks = buildTasksWithTime(null);
            adjustPlannedTimes(validTasks, routeData.service_stops || []);

            // ★ Build coordinates as straight lines between waypoints
            const straightCoords = waypoints.map(wp => L.latLng(wp.lat, wp.lng));

            processedRoute = {
                ...routeData,
                tasks: validTasks,
                coordinates: straightCoords,
                waypointCoords: waypoints
            };

            drawPlannedRoute();
            createTaskMarkers(validTasks);
        }

        // Draw analytics layers (regardless of routing success)
        drawActualPath(routeData);
        showActualPathMarkers(routeData);
        showStopMarkers(routeData);
        showSignalLossMarkers(routeData);

        console.log('🟢 Route rendering complete, processedRoute:', processedRoute ? 'set' : 'null');
    };

    // ── Adjust planned times ──
    const adjustPlannedTimes = (tasks, serviceStops) => {
        let delta = 0;
        tasks.forEach(task => {
            task.adjustedTime = task.departureTime ? new Date(task.departureTime.getTime() + delta) : null;
            task.factTime = task.factTime || '';
            const service = serviceStops.find(s => s.related_task_id === task.id);
            if (service && task.departureTime) {
                task.factTime = service.start_time;
                const [h, m] = service.end_time.split(':');
                const end = new Date(task.departureTime.getTime());
                end.setHours(parseInt(h), parseInt(m), 0, 0);
                task.adjustedTime = end;
                delta = end.getTime() - task.departureTime.getTime();
            }
        });
    };

    // ── Draw planned route ──
    const drawPlannedRoute = () => {
        if (!processedRoute) { console.log('🟠 drawPlannedRoute: no processedRoute'); return; }
        
        routeDecoratorsLayer.clearLayers();
        
        const coords = processedRoute.coordinates;
        const color = processedRoute.color || '#b6b6b6';
        const wpCoords = processedRoute.waypointCoords;

        console.log('🟢 drawPlannedRoute, style:', settings.route_display, 'coords:', coords?.length, 'waypoints:', wpCoords?.length);

        if (!coords || coords.length < 2) {
            console.log('🟠 Not enough coordinates to draw route');
            return;
        }

        switch (settings.route_display) {
            case 'standard':
                L.polyline(coords, { color, opacity: 0.8, weight: 5 }).addTo(routeDecoratorsLayer);
                break;

            case 'decorated':
                L.polyline(coords, { color, opacity: 0.7, weight: 5 }).addTo(routeDecoratorsLayer);
                if (L.polylineDecorator) {
                    L.polylineDecorator(coords, {
                        patterns: [{ offset: 25, repeat: 100, symbol: L.Symbol.arrowHead({ pixelSize: 15, pathOptions: { color, fillOpacity: 1, weight: 0 } }) }]
                    }).addTo(routeDecoratorsLayer);
                }
                break;

            case 'vector':
                if (wpCoords && wpCoords.length > 1) {
                    for (let i = 0; i < wpCoords.length - 1; i++) {
                        const seg = [wpCoords[i], wpCoords[i + 1]];
                        L.polyline(seg, { color, weight: 5 }).addTo(routeDecoratorsLayer);
                        if (L.polylineDecorator) {
                            L.polylineDecorator(seg, {
                                patterns: [{ offset: '100%', repeat: 0, symbol: L.Symbol.arrowHead({ pixelSize: 15, polygon: false, pathOptions: { stroke: true, color, fillOpacity: 1, weight: 5 } }) }]
                            }).addTo(routeDecoratorsLayer);
                        }
                    }
                } else {
                    // Fallback for vector when no waypoints
                    L.polyline(coords, { color, weight: 5 }).addTo(routeDecoratorsLayer);
                }
                break;
        }
    };

    // Flag to prevent watcher from re-triggering handleMarkerClick after map click
    let clickedFromMap = false;

    // ── Task markers ──
    const createTaskMarkers = (tasks) => {
        console.log('🟢 createTaskMarkers:', tasks.length);
        tasks.forEach(task => {
            const planTime = task.departureTime?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) || '';
            const adjTime = task.adjustedTime?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) || '';

            // Safely extract name
            let taskName = '';
            if (task.name) {
                if (typeof task.name === 'string') {
                    taskName = task.name;
                } else if (typeof task.name === 'object') {
                    taskName = task.name.value || task.name.name || task.name.title || '';
                }
            }

            const factTimeStr = task.factTime || '';
            const factDisplay = factTimeStr ? ` → <span class="fact-time">${factTimeStr}</span>` : '';
            const statusColor = task.statusColor || '#ccc';

            const html = `
                <div class="route-popup">
                    <div class="route-popup__main" style="border-color: ${task.routeColor}">
                        <span class="route-popup__counter" style="background: ${task.routeColor}">${task.order || ''}</span>
                        <span class="route-popup__status" style="background: ${statusColor}"></span>
                        <span class="route-popup__time">${planTime}${factDisplay}</span>
                    </div>
                    <div class="route-popup__extend">
                        <div class="point-attrs">
                            <span class="point-attrs__item"><span class="point-attrs__label">Название:</span><span class="point-attrs__val">${taskName}</span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">Статус точки:</span><span class="point-attrs__val"><span class="route-popup__status route-popup__status_inline" style="background: ${statusColor}"></span></span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">План. время:</span><span class="point-attrs__val">${planTime}</span></span>
                        </div>
                    </div>
                </div>`;

            const marker = L.marker(task.latLng, {
                // iconAnchor = центр .route-popup__counter (24×24): счётчик —
                // первый элемент внутри .route-popup__main с рамкой 1px, поэтому
                // его центр ≈ (13, 13) от левого-верхнего угла иконки. Так
                // географическая точка задачи (и центр круга зоны обслуживания,
                // см. handleMarkerClick/focusRouteTask) совпадает с центром
                // счётчика, без смещения.
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [13, 13], popupAnchor: [0, -40] }),
                zIndexOffset: 1000
            }).addTo(mapInstance.value);

            marker._taskId = task.id;
            marker._latLng = task.latLng;
            marker.on('click', () => {
                clickedFromMap = true;
                const el = marker.getElement();
                if (el) handleMarkerClick(el);
                // Show service radius circle
                if (serviceRadiusCircle) { mapInstance.value.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null; }
                const radius = props.serviceRadius || 500;
                serviceRadiusCircle = L.circle(task.latLng, {
                    radius,
                    color: task.routeColor || '#b6b6b6',
                    fillColor: task.routeColor || '#b6b6b6',
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: '5,5'
                }).addTo(mapInstance.value);
                emit('routeTaskClick', task);
                setTimeout(() => { clickedFromMap = false; }, 100);
            });
            routeMarkers.push(marker);
        });
    };

    // ── Actual path ──
    const drawActualPath = (routeData) => {
        if (!routeData.actual_path || routeData.actual_path.length < 2 || !settings.analytics.actual_path) return;
        const coords = routeData.actual_path.map(p => [p.lat, p.lon]);
        const polyline = L.polyline(coords, { color: '#0000FF', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(mapInstance.value);
        actualPathLayers.push(polyline);
    };

    const showActualPathMarkers = (routeData) => {
        if (!routeData.actual_path?.length || !settings.analytics.actual_path || !L.markerClusterGroup) return;
        const MIN_DIST = 200;

        const markers = L.markerClusterGroup({
            maxClusterRadius: (zoom) => zoom > 18 ? 50 : 80,
            disableClusteringAtZoom: 19,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false,
            spiderfyOnMaxZoom: false,
            iconCreateFunction: (cluster) => {
                const children = cluster.getAllChildMarkers();
                const total = children.length;
                const last = children[total - 1];
                const first = children[0];

                // Use last point's bearing for arrow direction
                const bearing = last.options._bearing || 0;
                // Average speed
                const avgSpeed = (children.reduce((s, m) => s + (m.options._speed || 0), 0) / total).toFixed(1);
                // Time range
                const timeFrom = first.options._time || '';
                const timeTo = last.options._time || '';
                const timeLabel = timeFrom === timeTo ? timeTo : `${timeFrom}—${timeTo}`;

                const html = `<div class="actual-path-marker"><div class="marker-main-view"><div class="icon-container"><div class="icon-background"><svg width="21" height="21" viewBox="0 0 21 21" style="transform:rotate(${bearing}deg)"><g stroke="none" fill="none"><g transform="translate(-173,-643)" fill="#FFF"><g transform="translate(162.5,634.5)"><g><g><g transform="translate(20.49,20.49) translate(-20.49,-20.49) translate(5.49,5.49)"><path d="M15.15,9.07L20.84,19.54C21.37,20.51 21.01,21.72 20.04,22.25C19.53,22.52 18.94,22.57 18.4,22.37L13.36,20.54L8.4,22.36C7.36,22.73 6.21,22.2 5.83,21.16C5.64,20.62 5.68,20.03 5.95,19.52L11.63,9.07C12.16,8.1 13.38,7.74 14.35,8.27C14.69,8.45 14.97,8.73 15.15,9.07Z" transform="translate(13.39,15) translate(-13.39,-15)"/></g></g></g></g></g></g></svg></div></div><span class="marker-time-label">${timeLabel}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Точек:</span><span class="point-attrs__val">${total}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">${timeFrom} — ${timeTo}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Ср. скорость:</span><span class="point-attrs__val">${avgSpeed} км/ч</span></span></div></div></div>`;

                return L.divIcon({ className: 'custom-div-icon', html, iconSize: [90, 30], iconAnchor: [15, 15] });
            }
        });

        // Cluster click → toggle expand info
        markers.on('clusterclick', (e) => {
            const el = e.layer.getElement();
            if (el) {
                const marker = el.querySelector('.actual-path-marker');
                if (marker) {
                    const was = marker.classList.contains('active');
                    document.querySelectorAll('.actual-path-marker.active').forEach(m => m.classList.remove('active'));
                    if (!was) marker.classList.add('active');
                }
            }
        });

        let last = null;
        routeData.actual_path.forEach((pt, i) => {
            const cur = L.latLng(pt.lat, pt.lon);
            if (last && last.distanceTo(cur) <= MIN_DIST) return;
            let bearing = 0;
            if (i < routeData.actual_path.length - 1) {
                const nxt = routeData.actual_path[i + 1];
                bearing = calculateBearing(pt.lat, pt.lon, nxt.lat, nxt.lon);
            }
            const speed = ((pt.speed || 0) * 1.60934).toFixed(1);
            const html = `<div class="actual-path-marker"><div class="marker-main-view"><div class="icon-container"><div class="icon-background"><svg width="21" height="21" viewBox="0 0 21 21" style="transform:rotate(${bearing}deg)"><g stroke="none" fill="none"><g transform="translate(-173,-643)" fill="#FFF"><g transform="translate(162.5,634.5)"><g><g><g transform="translate(20.49,20.49) translate(-20.49,-20.49) translate(5.49,5.49)"><path d="M15.15,9.07L20.84,19.54C21.37,20.51 21.01,21.72 20.04,22.25C19.53,22.52 18.94,22.57 18.4,22.37L13.36,20.54L8.4,22.36C7.36,22.73 6.21,22.2 5.83,21.16C5.64,20.62 5.68,20.03 5.95,19.52L11.63,9.07C12.16,8.1 13.38,7.74 14.35,8.27C14.69,8.45 14.97,8.73 15.15,9.07Z" transform="translate(13.39,15) translate(-13.39,-15)"/></g></g></g></g></g></g></svg></div></div><span class="marker-time-label">${pt.time||''}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Время:</span><span class="point-attrs__val">${pt.time||''}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Скорость:</span><span class="point-attrs__val">${speed} км/ч</span></span></div></div></div>`;
            const m = L.marker(cur, {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [90, 30], iconAnchor: [15, 15] }),
                _time: pt.time || '',
                _speed: parseFloat(speed),
                _bearing: bearing
            });
            m.on('click', handleActualMarkerClick);
            markers.addLayer(m);
            last = cur;
        });
        actualMarkerLayers.push(markers);
        mapInstance.value.addLayer(markers);
    };

    // ── Parse time string "HH:MM" to minutes from midnight ──
    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    // ── Analyze actual_path to find stops (>5min stationary) ──
    const analyzeStops = (actualPath, taskPositions, radius) => {
        if (!actualPath || actualPath.length < 2) return { serviceStops: [], parkingStops: [] };

        const STOP_THRESHOLD_METERS = 50; // consider stationary if moved less than 50m
        const STOP_MIN_MINUTES = 5;

        // Group consecutive stationary points
        const rawStops = [];
        let currentStop = null;

        for (let i = 1; i < actualPath.length; i++) {
            const prev = actualPath[i - 1];
            const curr = actualPath[i];
            const dist = L.latLng(prev.lat, prev.lon).distanceTo(L.latLng(curr.lat, curr.lon));

            if (dist <= STOP_THRESHOLD_METERS) {
                if (!currentStop) {
                    currentStop = { lat: prev.lat, lon: prev.lon, start_time: prev.time, end_time: curr.time, points: [prev, curr] };
                } else {
                    currentStop.end_time = curr.time;
                    currentStop.points.push(curr);
                }
            } else {
                if (currentStop) {
                    const duration = parseTimeToMinutes(currentStop.end_time) - parseTimeToMinutes(currentStop.start_time);
                    if (duration >= STOP_MIN_MINUTES) {
                        currentStop.duration = duration;
                        // Average position
                        currentStop.lat = currentStop.points.reduce((s, p) => s + p.lat, 0) / currentStop.points.length;
                        currentStop.lon = currentStop.points.reduce((s, p) => s + p.lon, 0) / currentStop.points.length;
                        rawStops.push(currentStop);
                    }
                    currentStop = null;
                }
            }
        }
        // Don't forget last stop
        if (currentStop) {
            const duration = parseTimeToMinutes(currentStop.end_time) - parseTimeToMinutes(currentStop.start_time);
            if (duration >= STOP_MIN_MINUTES) {
                currentStop.duration = duration;
                currentStop.lat = currentStop.points.reduce((s, p) => s + p.lat, 0) / currentStop.points.length;
                currentStop.lon = currentStop.points.reduce((s, p) => s + p.lon, 0) / currentStop.points.length;
                rawStops.push(currentStop);
            }
        }

        // Classify stops: service (within radius of task) vs parking
        const serviceStops = [];
        const parkingStops = [];

        rawStops.forEach(stop => {
            const stopLatLng = L.latLng(stop.lat, stop.lon);
            let isService = false;

            for (const taskPos of taskPositions) {
                if (stopLatLng.distanceTo(taskPos.latLng) <= radius) {
                    isService = true;
                    // Check if we can merge with existing service stop for this task (contiguous time)
                    const existing = serviceStops.find(s =>
                        s.related_task_id === taskPos.id &&
                        Math.abs(parseTimeToMinutes(s.end_time) - parseTimeToMinutes(stop.start_time)) <= 5
                    );
                    if (existing) {
                        existing.end_time = stop.end_time;
                        existing.duration = parseTimeToMinutes(existing.end_time) - parseTimeToMinutes(existing.start_time);
                    } else {
                        serviceStops.push({
                            ...stop,
                            related_task_id: taskPos.id,
                            type: 'service'
                        });
                    }
                    break;
                }
            }

            if (!isService) {
                parkingStops.push({ ...stop, type: 'parking' });
            }
        });

        return { serviceStops, parkingStops };
    };

    // ── Analyze signal loss (>5min gap between consecutive points) ──
    const analyzeSignalLoss = (actualPath) => {
        if (!actualPath || actualPath.length < 2) return [];
        const SIGNAL_LOSS_MIN_MINUTES = 5;
        const events = [];

        for (let i = 1; i < actualPath.length; i++) {
            const prev = actualPath[i - 1];
            const curr = actualPath[i];
            const gap = parseTimeToMinutes(curr.time) - parseTimeToMinutes(prev.time);

            if (gap >= SIGNAL_LOSS_MIN_MINUTES) {
                events.push({
                    loss_point: { lat: prev.lat, lon: prev.lon, time: prev.time },
                    restore_point: { lat: curr.lat, lon: curr.lon, time: curr.time },
                    duration: gap
                });
            }
        }
        return events;
    };

    // ── Show stops on map (with data-aware clustering) ──
    const showStopMarkers = (routeData) => {
        if (!settings.analytics.stops) return;
        stopMarkersLayer.clearLayers();

        let serviceStops = routeData.service_stops || [];
        let parkingStops = routeData.parking_stops || [];

        if (serviceStops.length === 0 && parkingStops.length === 0 && routeData.actual_path?.length > 1) {
            const taskPositions = (processedRoute?.tasks || []).filter(t => t.latLng).map(t => ({ id: t.id, latLng: t.latLng }));
            const result = analyzeStops(routeData.actual_path, taskPositions, props.serviceRadius || 500);
            serviceStops = result.serviceStops;
            parkingStops = result.parkingStops;
        }

        const createCluster = (stops, type) => {
            if (!stops?.length || !L.markerClusterGroup) return;
            const isService = type === 'service';
            const bgColor = isService ? '#4a90d9' : '#bf0000';
            const iconSrc = isService ? '/img/unloading.svg' : '/img/stop.svg';
            const label = isService ? 'Обслуживание' : 'Остановка';

            const grp = L.markerClusterGroup({
                disableClusteringAtZoom: 17,
                maxClusterRadius: 60,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: false,
                iconCreateFunction: (cluster) => {
                    const children = cluster.getAllChildMarkers();
                    const total = children.length;
                    // Aggregate: total duration, time range
                    const totalDuration = children.reduce((s, m) => s + (m.options._duration || 0), 0);
                    const times = children.map(m => m.options._startTime || '').filter(Boolean).sort();
                    const endTimes = children.map(m => m.options._endTime || '').filter(Boolean).sort();
                    const timeFrom = times[0] || '';
                    const timeTo = endTimes[endTimes.length - 1] || '';

                    const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:${bgColor}"><div class="icon-container"><div class="icon-background" style="background-color:${bgColor}"><img src="${iconSrc}" class="marker-svg-icon" /></div></div><span class="marker-time-label">${label} (${total})</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Количество:</span><span class="point-attrs__val">${total}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">${timeFrom} — ${timeTo}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Общее время:</span><span class="point-attrs__val">${totalDuration} мин</span></span></div></div></div>`;

                    return L.divIcon({ className: 'custom-div-icon', html, iconSize: [120, 30], iconAnchor: [15, 15] });
                }
            });

            grp.on('clusterclick', (e) => {
                const el = e.layer.getElement();
                if (el) {
                    const marker = el.querySelector('.actual-path-marker');
                    if (marker) {
                        const was = marker.classList.contains('active');
                        document.querySelectorAll('.actual-path-marker.active').forEach(m => m.classList.remove('active'));
                        if (!was) marker.classList.add('active');
                    }
                }
            });

            stops.forEach(s => {
                const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:${bgColor}"><div class="icon-container"><div class="icon-background" style="background-color:${bgColor}"><img src="${iconSrc}" class="marker-svg-icon" /></div></div><span class="marker-time-label">${label}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">с ${s.start_time} по ${s.end_time}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Длительность:</span><span class="point-attrs__val">${s.duration} мин</span></span></div></div></div>`;
                const m = L.marker([s.lat, s.lon], {
                    icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [120, 30], iconAnchor: [15, 15] }),
                    _duration: s.duration || 0,
                    _startTime: s.start_time || '',
                    _endTime: s.end_time || ''
                });
                m.on('click', handleActualMarkerClick);
                grp.addLayer(m);
            });

            stopMarkersLayer.addLayer(grp);
        };

        createCluster(serviceStops, 'service');
        createCluster(parkingStops, 'parking');
    };

    // ── Signal loss markers (with data-aware clustering) ──
    const showSignalLossMarkers = (routeData) => {
        if (!settings.analytics.signal_loss) return;
        signalLossMarkersLayer.clearLayers();

        let events = routeData.signal_loss_events || [];
        if (events.length === 0 && routeData.actual_path?.length > 1) {
            events = analyzeSignalLoss(routeData.actual_path);
        }

        if (!events.length || !L.markerClusterGroup) return;

        const grp = L.markerClusterGroup({
            disableClusteringAtZoom: 17,
            maxClusterRadius: 60,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false,
            iconCreateFunction: (cluster) => {
                const children = cluster.getAllChildMarkers();
                const total = children.length;
                const totalDuration = children.reduce((s, m) => s + (m.options._duration || 0), 0);
                const times = children.map(m => m.options._lossTime || '').filter(Boolean).sort();
                const endTimes = children.map(m => m.options._restoreTime || '').filter(Boolean).sort();
                const timeFrom = times[0] || '';
                const timeTo = endTimes[endTimes.length - 1] || '';

                const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:#f07178"><div class="icon-container"><div class="icon-background" style="background-color:#f07178"><img src="/img/nosignal.svg" class="marker-svg-icon" /></div></div><span class="marker-time-label">Потеря (${total})</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Количество:</span><span class="point-attrs__val">${total}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">${timeFrom} — ${timeTo}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Общее время:</span><span class="point-attrs__val">${totalDuration} мин</span></span></div></div></div>`;

                return L.divIcon({ className: 'custom-div-icon', html, iconSize: [150, 30], iconAnchor: [15, 15] });
            }
        });

        grp.on('clusterclick', (e) => {
            const el = e.layer.getElement();
            if (el) {
                const marker = el.querySelector('.actual-path-marker');
                if (marker) {
                    const was = marker.classList.contains('active');
                    document.querySelectorAll('.actual-path-marker.active').forEach(m => m.classList.remove('active'));
                    if (!was) marker.classList.add('active');
                }
            }
        });

        events.forEach(ev => {
            const pt = ev.loss_point;
            const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:#f07178"><div class="icon-container"><div class="icon-background" style="background-color:#f07178"><img src="/img/nosignal.svg" class="marker-svg-icon" /></div></div><span class="marker-time-label">Потеря сигнала</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">${ev.loss_point.time} — ${ev.restore_point.time}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Длительность:</span><span class="point-attrs__val">${ev.duration} мин</span></span></div></div></div>`;
            const m = L.marker([pt.lat, pt.lon], {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [150, 30], iconAnchor: [15, 15] }),
                _duration: ev.duration || 0,
                _lossTime: ev.loss_point.time || '',
                _restoreTime: ev.restore_point.time || ''
            });
            m.on('click', handleActualMarkerClick);
            grp.addLayer(m);
        });

        signalLossMarkersLayer.addLayer(grp);
    };

    // ── Unassigned tasks ──
    const renderUnassignedTasks = (tasks) => {
        if (!mapInstance.value) return;
        clearUnassignedMarkers();
        if (!tasks?.length) return;
        tasks.forEach(task => {
            const addr = parseAddress(task.address);
            if (!addr) return;
            let taskName = '';
            if (task.name) {
                if (typeof task.name === 'string') {
                    taskName = task.name;
                } else if (typeof task.name === 'object') {
                    taskName = task.name.value || task.name.name || task.name.title || '';
                    if (!taskName) {
                        try { taskName = JSON.parse(JSON.stringify(task.name)).value || ''; } catch(e) {}
                    }
                }
            }
            if (!taskName && task.id) taskName = `#${task.id}`;
            const statusColor = task.statusColor || '#ccc';
            const planTime = task.planTime || task.plan_time || '';
            const html = `<div class="route-popup unassigned-popup">
                <div class="route-popup__main">
                    <span class="route-popup__counter"></span>
                    <span class="route-popup__time">${taskName}</span>
                </div>
                <div class="route-popup__extend">
                    <div class="point-attrs">
                        <span class="point-attrs__item"><span class="point-attrs__label">Название:</span><span class="point-attrs__val">${taskName}</span></span>
                        <span class="point-attrs__item"><span class="point-attrs__label">Статус точки:</span><span class="point-attrs__val"><span class="route-popup__status route-popup__status_inline" style="background: ${statusColor}"></span></span></span>
                        <span class="point-attrs__item"><span class="point-attrs__label">План. время:</span><span class="point-attrs__val">${planTime}</span></span>
                    </div>
                </div>
            </div>`;
            const marker = L.marker([addr.coords[0], addr.coords[1]], {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [15, 15] }),
                zIndexOffset: 500
            }).addTo(mapInstance.value);
            marker._selected = false;
            marker.on('click', () => {
                const el = marker.getElement();
                const extend = el?.querySelector('.route-popup__extend');
                const isAlreadyOpen = extend?.classList.contains('active');
                if (isAlreadyOpen) return;
                
                unassignedMarkers.forEach(m => {
                    m.setZIndexOffset(500);
                    const mEl = m.getElement();
                    if (mEl) mEl.querySelector('.route-popup__extend')?.classList.remove('active');
                });
                
                clickedFromMap = true;  // ADD THIS
                marker.setZIndexOffset(10000);
                if (el) handleMarkerClick(el);
                emit('unassignedTaskClick', task);
                setTimeout(() => { clickedFromMap = false; }, 100);  // ADD THIS
            });
            marker._taskId = task.id;
            unassignedMarkers.push(marker);
        });
    };

    // ── Click handlers ──
    const handleMarkerClick = (el, forceOpen = false) => {
        if (!el) return;
        if (activeMarkerElement && activeMarkerElement !== el) activeMarkerElement.style.zIndex = '';
        el.style.zIndex = 1000; activeMarkerElement = el;
        const ext = el.querySelector('.route-popup__extend');
        document.querySelectorAll('.route-popup__extend.active').forEach(e => { if (e !== ext) e.classList.remove('active'); });
        if (ext) {
            if (forceOpen) {
                // Если popup уже открыт — даём короткий visual flash
                // (off → on через 60ms), чтобы пользователь увидел,
                // что действие отработало даже при повторном поиске
                // той же задачи (state уже целевой → без flash'а
                // визуально «ничего не происходит»).
                if (ext.classList.contains('active')) {
                    ext.classList.remove('active');
                    setTimeout(() => ext.classList.add('active'), 60);
                } else {
                    ext.classList.add('active');
                }
            } else {
                // Клик по маркеру ВСЕГДА открывает его (не сворачивает повторным
                // кликом). Свернётся только при выборе другого маркера/задачи —
                // тогда .active снимается строкой выше с остальных extend'ов.
                ext.classList.add('active');
            }
        }
    };

    const handleActualMarkerClick = (e) => {
        L.DomEvent.stopPropagation(e);
        const el = e.target.getElement(); if (!el) return;
        if (activeMarkerElement) activeMarkerElement.style.zIndex = '';
        el.style.zIndex = 1000; activeMarkerElement = el;
        const was = el.classList.contains('active');
        document.querySelectorAll('.actual-path-marker.active').forEach(m => m.classList.remove('active'));
        if (!was) el.querySelector('.actual-path-marker')?.classList.add('active');
    };

    // ── Safe zoom/pan that works with Yandex tiles ──
    const safeSetView = (latlng, zoom) => {
        if (!mapInstance.value) return;
        const isYandex = settings.map_type.startsWith('Яндекс');
        const layer = baseLayers[settings.map_type];
        if (isYandex && layer) mapInstance.value.removeLayer(layer);
        mapInstance.value.setView(latlng, zoom, { animate: false });
        if (isYandex && layer) {
            setTimeout(() => { if (mapInstance.value) layer.addTo(mapInstance.value); }, 50);
        }
    };

    const safeFitBounds = (bounds, options) => {
        if (!mapInstance.value) return;
        const isYandex = settings.map_type.startsWith('Яндекс');
        const layer = baseLayers[settings.map_type];
        if (isYandex && layer) mapInstance.value.removeLayer(layer);
        mapInstance.value.fitBounds(bounds, { ...options, animate: false });
        if (isYandex && layer) {
            setTimeout(() => { if (mapInstance.value) layer.addTo(mapInstance.value); }, 50);
        }
    };

    // ── Fit bounds ──
    // При выборе маршрута всегда подгоняем zoom под сам маршрут: длинный —
    // отдаляем, чтобы он влез целиком; короткий — приближаем, чтобы он был
    // хорошо виден (раньше zoom сохранялся от предыдущего маршрута, и после
    // длинного маршрута короткий оставался слишком далёким). maxZoom не даёт
    // приблизиться вплотную к совсем компактным маршрутам.
    const FIT_MAX_ZOOM = 16;
    const fitBounds = () => {
        if (!mapInstance.value || !L) return;
        const pts = [];
        if (processedRoute?.tasks) processedRoute.tasks.forEach(t => { if (t.latLng) pts.push(t.latLng); });
        if (pts.length === 0) {
            if (shouldShowUnassigned()) {
                props.unassignedTasks.forEach(t => {
                    const a = parseAddress(t.address);
                    if (a) pts.push(L.latLng(a.coords[0], a.coords[1]));
                });
            }
            if (pts.length === 0) return;
        }
        if (pts.length === 1) {
            // Одиночная точка: приближаем до удобного zoom, а не оставляем
            // далёкий zoom от предыдущего длинного маршрута.
            safeSetView(pts[0], FIT_MAX_ZOOM);
            return;
        }
        const targetBounds = L.latLngBounds(pts);
        safeFitBounds(targetBounds, { padding: [40, 40], maxZoom: FIT_MAX_ZOOM });
    };

    // ── Apply settings (called when user changes any setting) ──
    const applySettings = () => {
        if (!mapInstance.value) return;

        console.log('🟢 applySettings:', JSON.stringify(settings));

        // Switch base layer
        Object.values(baseLayers).forEach(l => mapInstance.value.removeLayer(l));
        if (baseLayers[settings.map_type]) {
            baseLayers[settings.map_type].addTo(mapInstance.value);
            // Yandex tiles need invalidateSize after async init
            if (settings.map_type.startsWith('Яндекс')) {
                setTimeout(() => mapInstance.value?.invalidateSize(), 500);
            }
        }

        // Route display style — just redraw the route line
        if (processedRoute) {
            drawPlannedRoute();

            // Toggle analytics layers
            if (settings.analytics.stops) {
                mapInstance.value.addLayer(stopMarkersLayer);
            } else {
                mapInstance.value.removeLayer(stopMarkersLayer);
            }

            if (settings.analytics.signal_loss) {
                mapInstance.value.addLayer(signalLossMarkersLayer);
            } else {
                mapInstance.value.removeLayer(signalLossMarkersLayer);
            }

            if (settings.analytics.actual_path) {
                actualPathLayers.forEach(l => mapInstance.value.addLayer(l));
                actualMarkerLayers.forEach(l => mapInstance.value.addLayer(l));
            } else {
                actualPathLayers.forEach(l => mapInstance.value.removeLayer(l));
                actualMarkerLayers.forEach(l => mapInstance.value.removeLayer(l));
            }
        }

        // Unassigned tasks
        if (shouldShowUnassigned()) {
            renderUnassignedTasks(props.unassignedTasks);
        } else {
            clearUnassignedMarkers();
        }
    };

    // ── Selection (lasso) ──
    let lassoActive = false; // tracks if lasso area is drawn (not just mode)

    const toggleSelectionMode = () => {
        if (!props.enableSelection || !mapInstance.value) return;
        
        // If lasso area exists — clear everything and restore
        if (lassoActive) {
            lassoActive = false;
            emit('getSelectedPoints', { value: [], state: false });
            stopSelectionMode(false);
            return;
        }
        
        // If in drawing mode — cancel
        if (selectionActive.value) {
            stopSelectionMode(false);
            return;
        }
        
        // Start drawing mode
        clearSelectionPolygon();
        selectionActive.value = true;
        mapInstance.value.getContainer().style.cursor = 'crosshair';
        mapInstance.value.dragging.disable();

        selectionMouseDownHandler = (e) => {
            if (!selectionActive.value || e.originalEvent.button !== 0) return;
            e.originalEvent.preventDefault();
            selectionPath = [[e.latlng.lat, e.latlng.lng]];
            isDrawingPath = true;
            const moveH = (ev) => {
                if (!isDrawingPath) return;
                selectionPath.push([ev.latlng.lat, ev.latlng.lng]);
                if (drawingPolyline) drawingPolyline.setLatLngs(selectionPath);
                else drawingPolyline = L.polyline(selectionPath, { color: '#3b82f6', weight: 2, dashArray: '5,5' }).addTo(mapInstance.value);
            };
            const upH = () => {
                mapInstance.value.off('mousemove', moveH); mapInstance.value.off('mouseup', upH);
                isDrawingPath = false;
                if (drawingPolyline) { mapInstance.value.removeLayer(drawingPolyline); drawingPolyline = null; }
                if (selectionPath.length >= 3) {
                    const closed = [...selectionPath, selectionPath[0]];
                    selectionPolygon = L.polygon([closed], { fillColor: '#3b82f6', fillOpacity: 0.2, color: '#3b82f6', weight: 2 }).addTo(mapInstance.value);
                    const polLL = selectionPolygon.getLatLngs()[0], bounds = selectionPolygon.getBounds();

                    // Filter ONLY unassigned tasks that fall inside the lasso
                    const insideIds = [];
                    const insideCoords = [];
                    console.log('🟣 Lasso: checking', props.unassignedTasks?.length, 'unassigned tasks');
                    props.unassignedTasks.forEach(t => {
                        const a = parseAddress(t.address);
                        if (!a) { console.log('🟣 Task', t.id, 'no address parsed'); return; }
                        const ll = L.latLng(a.coords[0], a.coords[1]);
                        console.log('🟣 Task', t.id, 'coords:', ll.lat, ll.lng, 'bounds contains:', bounds.contains(ll));
                        if (!bounds.contains(ll)) return;
                        let ins = false;
                        for (let i = 0, j = polLL.length - 1; i < polLL.length; j = i++) {
                            const xi = polLL[i].lng, yi = polLL[i].lat, xj = polLL[j].lng, yj = polLL[j].lat;
                            if (((yi > ll.lat) !== (yj > ll.lat)) && (ll.lng < (xj - xi) * (ll.lat - yi) / (yj - yi) + xi)) ins = !ins;
                        }
                        console.log('🟣 Task', t.id, 'inside polygon:', ins);
                        if (ins) {
                            insideIds.push(Number(t.id));
                            insideCoords.push(a.coords);
                        }
                    });

                    // Hide unassigned markers outside the lasso
                    unassignedMarkers.forEach(m => {
                        if (!insideIds.includes(Number(m._taskId))) {
                            mapInstance.value.removeLayer(m);
                        }
                    });

                    // Also hide grouped markers that don't contain any selected task
                    groupedMarkers.forEach(gm => {
                        const el = gm.getElement();
                        if (!el) return;
                        const items = el.querySelectorAll('.cluster-task-item[data-type="unassigned"]');
                        let hasSelected = false;
                        items.forEach(item => {
                            if (insideIds.includes(Number(item.dataset.taskId))) hasSelected = true;
                        });
                        if (!hasSelected && !el.querySelector('.cluster-task-item[data-type="route"]')) {
                            mapInstance.value.removeLayer(gm);
                        }
                    });

                    lassoActive = true;
                    console.log('🟣 MAP: emitting getSelectedPoints, insideIds:', insideIds, 'insideCoords:', insideCoords.length);
                    emit('getSelectedPoints', { value: insideCoords, ids: insideIds, state: true });
                }
                // Stop drawing mode but keep polygon visible
                selectionActive.value = false;
                if (mapInstance.value) {
                    mapInstance.value.getContainer().style.cursor = '';
                    mapInstance.value.dragging.enable();
                    if (selectionMouseDownHandler) mapInstance.value.off('mousedown', selectionMouseDownHandler);
                }
            };
            mapInstance.value.on('mousemove', moveH); mapInstance.value.on('mouseup', upH);
        };
        mapInstance.value.on('mousedown', selectionMouseDownHandler);
    };

    const stopSelectionMode = (keep) => {
        if (mapInstance.value) { mapInstance.value.getContainer().style.cursor = ''; mapInstance.value.dragging.enable(); if (selectionMouseDownHandler) mapInstance.value.off('mousedown', selectionMouseDownHandler); }
        if (!keep) {
            clearSelectionPolygon();
            // Restore all unassigned markers
            if (mapInstance.value && shouldShowUnassigned()) {
                renderUnassignedTasks(props.unassignedTasks);
                groupOverlappingMarkers();
            }
        }
        selectionActive.value = false; isDrawingPath = false;
    };

    const clearSelectionPolygon = () => {
        if (selectionPolygon && mapInstance.value) mapInstance.value.removeLayer(selectionPolygon);
        if (drawingPolyline && mapInstance.value) mapInstance.value.removeLayer(drawingPolyline);
        selectionPolygon = null; drawingPolyline = null; selectionPath = [];
    };

    // ── Public: focus on an unassigned task from table click ──
    // При фокусе на задаче СОХРАНЯЕМ текущий zoom — пользователь жаловался,
    // что любой клик по задаче «зумирует» карту. Просто панорамируем к точке.
    // forceOpenPopup=true (по умолчанию) — popup task'а ВСЕГДА открывается,
    // даже если уже был открыт. handleMarkerClick без forceOpen toggle'ит
    // active-класс — на повторном поиске той же задачи popup закрывался
    // обратно, и пользователь не видел никакой реакции.
    const focusUnassignedTask = (taskId, forceOpenPopup = true) => {
        if (!mapInstance.value) return;
        const id = Number(taskId);
        if (focusGroupedMarker(id, 'unassigned')) return;
        const marker = unassignedMarkers.find(m => Number(m._taskId) === id);
        if (marker) {
            const latlng = marker.getLatLng();
            safeSetView(latlng, mapInstance.value.getZoom());
            const el = marker.getElement();
            if (el) handleMarkerClick(el, forceOpenPopup);
        }
    };

    const focusRouteTask = (taskId, forceOpenPopup = true) => {
        if (!mapInstance.value) return;
        const id = Number(taskId);
        if (focusGroupedMarker(id, 'route')) return;
        const marker = routeMarkers.find(m => Number(m._taskId) === id);
        if (marker) {
            const latlng = marker.getLatLng();
            safeSetView(latlng, mapInstance.value.getZoom());
            const el = marker.getElement();
            if (el) handleMarkerClick(el, forceOpenPopup);
            // Show service radius
            if (serviceRadiusCircle) { mapInstance.value.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null; }
            const radius = props.serviceRadius || 500;
            const task = processedRoute?.tasks?.find(t => t.id === id);
            const color = task?.routeColor || '#b6b6b6';
            serviceRadiusCircle = L.circle(latlng, {
                radius,
                color,
                fillColor: color,
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5,5'
            }).addTo(mapInstance.value);
        }
    };

    // Focus on a task inside a grouped (cluster) marker
    const focusGroupedMarker = (taskId, type) => {
        for (const gm of groupedMarkers) {
            const el = gm.getElement();
            if (!el) continue;
            const point = el.querySelector(`.cluster-point[data-task-id="${taskId}"]`);
            if (point) {
                const latlng = gm.getLatLng();
                safeSetView(latlng, mapInstance.value.getZoom());
                // Always open (not toggle)
                handleMarkerClick(el, true);
                setTimeout(() => {
                    bindClusterEvents(el);
                    const pointEl = el.querySelector(`.cluster-point[data-task-id="${taskId}"]`);
                    // Если точка во вложенном меню (смешанный кластер) — открываем
                    // нужную подменю, чтобы её было видно.
                    const submenu = pointEl?.closest('.cluster-submenu');
                    if (submenu) {
                        const root = el.querySelector('.cluster-menu[data-level="root"]');
                        if (root) root.style.display = 'none';
                        el.querySelectorAll('.cluster-submenu').forEach(s => {
                            s.style.display = s === submenu ? 'block' : 'none';
                        });
                    }
                    el.querySelectorAll('.cluster-point.active').forEach(i => i.classList.remove('active'));
                    if (pointEl) pointEl.classList.add('active');
                }, 100);
                return true;
            }
        }
        return false;
    };

    defineExpose({ focusUnassignedTask, focusRouteTask, focusTaskWithRetry: (id) => focusTaskWithRetry(id) });

    // Подтянуть пользовательские настройки модуля «Логистика» и применить к карте.
    const fetchedCenter = ref(null);
    const applyModuleSettings = async () => {
        try {
            const response = await api.callMethod('GET', routes.settings.modules.logistics.get);
            const fields = response.data || [];
            for (const f of fields) {
                if ((f.key === 'main_city' || f.title === 'Главный город') && f.value && Array.isArray(f.value.coords)) {
                    const lat = Number(f.value.coords[0]);
                    const lng = Number(f.value.coords[1]);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        fetchedCenter.value = [lat, lng];
                    }
                }
                if ((f.key === 'used_map' || f.title === 'Используемая карта') && typeof f.value === 'string') {
                    // settings.map_type использует те же значения 'OpenStreetMap' / 'Яндекс.Карты'.
                    if (f.value === 'OpenStreetMap' || f.value === 'Яндекс.Карты') {
                        settings.map_type = f.value;
                    } else if (/openstreet/i.test(f.value)) {
                        settings.map_type = 'OpenStreetMap';
                    } else if (/яндекс/i.test(f.value)) {
                        settings.map_type = 'Яндекс.Карты';
                    }
                }
            }
        } catch (e) {
            console.warn('[LogisticMap] Не удалось получить настройки модуля логистики', e);
        }
    };

    // ── Lifecycle ──
    onMounted(async () => {
        await applyModuleSettings();
        await initMap();
        /* document.addEventListener('click', closeSettingsOnClick); — temporarily disabled, test modal */
    });
    onBeforeUnmount(() => {
        document.removeEventListener('click', closeSettingsOnClick);
        stopSelectionMode(false); clearAllLayers();
        if (mapInstance.value) { mapInstance.value.remove(); mapInstance.value = null; }
    });

    // ── Watchers ──
    watch(() => props.routeData, (newVal, oldVal) => {
        // Only re-render if route data reference actually changed
        if (newVal === oldVal && newVal !== null) return;
        console.log('🟢 WATCH routeData');
        renderAll();
    });
    watch(() => props.unassignedTasks, (newVal) => {
        if (isRendering) return;
        if (shouldShowUnassigned() && newVal?.length) {
            clearUnassignedMarkers();
            // Also clear grouped markers that were unassigned-only
            groupedMarkers.forEach(gm => {
                const el = gm.getElement();
                if (!el) return;
                if (!el.querySelector('.cluster-task-item[data-type="route"]')) {
                    mapInstance.value.removeLayer(gm);
                }
            });
            renderUnassignedTasks(newVal);
            groupOverlappingMarkers();
        } else {
            // No unassigned tasks — clear all unassigned markers
            clearUnassignedMarkers();
            groupedMarkers.forEach(gm => {
                const el = gm.getElement();
                if (!el) return;
                if (!el.querySelector('.cluster-task-item[data-type="route"]')) {
                    mapInstance.value.removeLayer(gm);
                }
            });
            groupedMarkers = groupedMarkers.filter(gm => {
                const el = gm.getElement();
                return el && el.querySelector('.cluster-task-item[data-type="route"]');
            });
        }
    }, { deep: true });
    watch(() => props.showUnassigned, () => applySettings());
    // Когда activeTaskId приходит из поиска по задачам (URL ?task_id=…),
    // markers могут быть ещё не отрисованы — это асинхронная цепочка
    // (загрузка route/unassigned → renderRoute → addTo(map)). Поэтому
    // делаем ретраи: как только marker появится — центрируем карту.
    // 30×200ms = ~6с, должно хватить даже на медленную загрузку route.
    // force=true — пропустить clickedFromMap-блокировку (исп. для search-
    // инициированного фокуса, где блокировки быть не должно).
    const focusTaskWithRetry = (taskId, attempt = 0, force = false) => {
        if (!taskId || !mapInstance.value) return;
        if (!force && clickedFromMap) return;
        const id = Number(taskId);
        const routeMarker = routeMarkers.find(m => Number(m._taskId) === id);
        if (routeMarker) { focusRouteTask(id); return; }
        const unassignedMarker = unassignedMarkers.find(m => Number(m._taskId) === id);
        if (unassignedMarker) { focusUnassignedTask(id); return; }
        if (attempt < 30) {
            setTimeout(() => focusTaskWithRetry(taskId, attempt + 1, force), 200);
        }
    };
    watch(() => props.activeTaskId, (taskId) => {
        focusTaskWithRetry(taskId);
    }, { immediate: true });

    // Самый надёжный путь для search-инициированного фокуса. Минует
    // Vue ref/expose/prop-watch — page просто dispatch'ит
    // window-event 'logistic:focusTask', LogisticMap ловит и центрирует.
    // Работает даже когда mapComp в Logistic.vue по каким-то причинам
    // null или defineExpose не пробросил метод.
    const handleSearchFocusEvent = (e) => {
        const id = Number(e?.detail?.taskId);
        if (!id) return;
        focusTaskWithRetry(id, 0, true);
    };
    onMounted(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('logistic:focusTask', handleSearchFocusEvent);
        }
    });
    onBeforeUnmount(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('logistic:focusTask', handleSearchFocusEvent);
        }
    });
</script>