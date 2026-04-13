<template>
    <div class="logistic-map">
        <div class="logistic-map__header">
            <div class="logistic-map__title">Карта</div>
            <IconLaso
                v-if="props.enableSelection"
                class="map__frame-selection"
                :class="{ 'map__frame-selection_active': selectionActive }"
                @click="toggleSelectionMode"
            />
        </div>

        <!-- Settings panel - fully DOM-managed to bypass Vue reactivity issues with Leaflet -->
        <div class="logistic-map__settings" @click.stop>
            <button class="logistic-map__settings-button" @click.stop="toggleSettings">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#333">
                    <path d="M19.4,11.5c-0.2-0.8-0.6-1.6-1-2.3L19,8.5c0.2-0.2,0.2-0.5,0-0.7l-2.2-2.2c-0.2-0.2-0.5-0.2-0.7,0l-0.7,0.7c-0.7-0.4-1.5-0.8-2.3-1l-0.2-0.9C12.8,4.2,12.6,4,12.3,4h-3c-0.3,0-0.5,0.2-0.5,0.4l-0.2,0.9c-0.8,0.2-1.6,0.6-2.3,1l-0.7-0.7c-0.2-0.2-0.5-0.2-0.7,0L2.7,7.8c-0.2,0.2-0.2,0.5,0,0.7l0.7,0.7c-0.4,0.7-0.8,1.5-1,2.3L2,12.3c0,0.3,0.2,0.5,0.4,0.5h0.9c0.2,0.8,0.6,1.6,1,2.3l-0.7,0.7c-0.2,0.2-0.2,0.5,0,0.7l2.2,2.2c0.2,0.2,0.5,0.2,0.7,0l0.7-0.7c0.7,0.4,1.5,0.8,2.3,1l0.2,0.9c0,0.3,0.2,0.5,0.5,0.5h3c0.3,0,0.5-0.2,0.5-0.4l0.2-0.9c0.8-0.2,1.6-0.6,2.3-1l0.7,0.7c0.2,0.2,0.5,0.2,0.7,0l2.2-2.2c0.2-0.2,0.2-0.5,0-0.7l-0.7-0.7c0.4-0.7,0.8-1.5,1-2.3l0.9-0.2c0.3,0,0.5-0.2,0.4-0.5L19.4,11.5z M12,15.5c-1.9,0-3.5-1.6-3.5-3.5s1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5S13.9,15.5,12,15.5z"/>
                </svg>
            </button>
            <div ref="settingsPanelRef" class="settings-panel" @click.stop></div>
        </div>

        <div class="logistic-map__body">
            <div ref="mapContainerRef" class="logistic-map__container"></div>
        </div>
    </div>
</template>

<script setup>
    import './LogisticMap.scss';
    import IconLaso from '@AppIcons/Laso.vue';

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
                    <div class="menu-item" data-sub="orders">Заказы <span class="arrow">›</span></div>
                    <div class="menu-item" data-sub="route_display">Отображение маршрута <span class="arrow">›</span></div>
                    <div class="menu-item" data-sub="maps">Карты <span class="arrow">›</span></div>
                    <div class="menu-item" data-sub="analytics">Аналитика <span class="arrow">›</span></div>
                </div>`;
        } else if (sub === 'orders') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><span class="back-arrow">‹</span> Заказы</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="all" ${settings.orders === 'all' ? 'checked' : ''}> Все</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="in_car" ${settings.orders === 'in_car' ? 'checked' : ''}> В машине</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_orders" value="unprocessed" ${settings.orders === 'unprocessed' ? 'checked' : ''}> Показать необработанные</label></div>
                </div>`;
        } else if (sub === 'route_display') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><span class="back-arrow">‹</span> Отображение маршрута</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="standard" ${settings.route_display === 'standard' ? 'checked' : ''}> Стандартный</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="decorated" ${settings.route_display === 'decorated' ? 'checked' : ''}> С направлением</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_route_display" value="vector" ${settings.route_display === 'vector' ? 'checked' : ''}> Вектор движения</label></div>
                </div>`;
        } else if (sub === 'maps') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><span class="back-arrow">‹</span> Карты</div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="OpenStreetMap" ${settings.map_type === 'OpenStreetMap' ? 'checked' : ''}> OpenStreetMap</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="Яндекс.Карты" ${settings.map_type === 'Яндекс.Карты' ? 'checked' : ''}> Яндекс.Карты</label></div>
                    <div class="menu-item radio-item"><label><input type="radio" name="s_map_type" value="Яндекс.Спутник" ${settings.map_type === 'Яндекс.Спутник' ? 'checked' : ''}> Яндекс.Спутник</label></div>
                </div>`;
        } else if (sub === 'analytics') {
            html = `
                <div class="menu-panel active">
                    <div class="submenu-header" data-sub="back"><span class="back-arrow">‹</span> Аналитика</div>
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
                if (name === 's_orders') settings.orders = val;
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

        mapInstance.value = L.map(mapContainerRef.value, { center: props.defaultCenter, zoom: 12, zoomControl: true, minZoom: 3, maxZoom: 18, doubleClickZoom: false });

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
            'Яндекс.Карты': L.yandex(),
            'Яндекс.Спутник': L.yandex({ type: 'satellite' })
        };

        baseLayers[settings.map_type].addTo(mapInstance.value);

        stopMarkersLayer = L.layerGroup().addTo(mapInstance.value);
        signalLossMarkersLayer = L.layerGroup().addTo(mapInstance.value);
        routeDecoratorsLayer = L.layerGroup().addTo(mapInstance.value);

        try { await loadMarkerCluster(); } catch (e) {}
        try { await loadPolylineDecorator(); } catch (e) {}

        mapInstance.value.on('click', () => {
            document.querySelectorAll('.actual-path-marker.active, .route-popup__extend.active').forEach(el => el.classList.remove('active'));
            if (activeMarkerElement) { activeMarkerElement.style.zIndex = ''; activeMarkerElement = null; }
            if (serviceRadiusCircle) { mapInstance.value.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null; }
        });

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

    const renderAll = async () => {
        if (!mapInstance.value || !L) return;
        if (isRendering) { console.log('🟠 renderAll skipped — already rendering'); return; }
        isRendering = true;

        try {
            clearAllLayers();

            if (props.routeData?.tasks?.length > 0) {
                await renderRoute(props.routeData);
            }

            if (shouldShowUnassigned()) {
                renderUnassignedTasks(props.unassignedTasks);
            }

            fitBounds();
        } finally {
            isRendering = false;
        }
    };

    const shouldShowUnassigned = () => {
        if (!props.showUnassigned) return false;
        // "В машине" = only show route tasks, hide unassigned
        if (settings.orders === 'in_car') return false;
        return true;
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
                    routeColor: routeData.color || '#8601ff',
                    routeName: routeData.name || `Маршрут ${routeData.id}`
                };
            }).filter(t => t.latLng && t.arrivalTime);
        };

        // Try to fetch route from OSRM

        try {
            await loadRoutingMachine();

            // Build OSRM URL and fetch through API proxy (works on both localhost and production)
            const coordsStr = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
            const osrmUrl = `/route/v1/driving/${coordsStr}?overview=false&alternatives=true&steps=true`;
            
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

            // Decode route geometry from steps
            const routeCoordinates = [];
            osrmRoute.legs.forEach(leg => {
                leg.steps.forEach(step => {
                    if (step.geometry) {
                        const decoded = decodePolyline(step.geometry);
                        routeCoordinates.push(...decoded);
                    }
                });
            });

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
                    routeColor: routeData.color || '#8601ff',
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
        const color = processedRoute.color || '#8601ff';
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

            const html = `
                <div class="route-popup">
                    <div class="route-popup__main" style="border-color: ${task.routeColor}">
                        <span class="route-popup__counter" style="background-color: ${task.routeColor}">${task.order || ''}</span>
                        <span class="route-popup__time">${planTime}${adjTime ? ' • <span class="red">' + adjTime + '</span>' : ''}</span>
                    </div>
                    <div class="route-popup__extend">
                        <div class="point-attrs">
                            <span class="point-attrs__item"><span class="point-attrs__label">Название:</span><span class="point-attrs__val">${taskName}</span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">План. время:</span><span class="point-attrs__val">${planTime}</span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">Факт. время:</span><span class="point-attrs__val red">${task.factTime || '—'}</span></span>
                        </div>
                    </div>
                </div>`;

            const marker = L.marker(task.latLng, {
                icon: L.divIcon({ className: 'custom-div-icon', html, popupAnchor: [0, -40] }),
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
                    color: task.routeColor || '#8601ff',
                    fillColor: task.routeColor || '#8601ff',
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
        const markers = L.markerClusterGroup({ iconCreateFunction: () => L.divIcon({ html: '', className: 'hidden-cluster', iconSize: L.point(0, 0) }) });
        let last = null;
        routeData.actual_path.forEach((pt, i) => {
            const cur = L.latLng(pt.lat, pt.lon);
            if (last && last.distanceTo(cur) <= MIN_DIST) return;
            let bearing = 0;
            if (i < routeData.actual_path.length - 1) { const nxt = routeData.actual_path[i + 1]; bearing = calculateBearing(pt.lat, pt.lon, nxt.lat, nxt.lon); }
            const speed = ((pt.speed || 0) * 1.60934).toFixed(1);
            const html = `<div class="actual-path-marker"><div class="marker-main-view"><div class="icon-container"><div class="icon-background"><svg width="21" height="21" viewBox="0 0 21 21" style="transform:rotate(${bearing}deg)"><g stroke="none" fill="none"><g transform="translate(-173,-643)" fill="#FFF"><g transform="translate(162.5,634.5)"><g><g><g transform="translate(20.49,20.49) translate(-20.49,-20.49) translate(5.49,5.49)"><path d="M15.15,9.07L20.84,19.54C21.37,20.51 21.01,21.72 20.04,22.25C19.53,22.52 18.94,22.57 18.4,22.37L13.36,20.54L8.4,22.36C7.36,22.73 6.21,22.2 5.83,21.16C5.64,20.62 5.68,20.03 5.95,19.52L11.63,9.07C12.16,8.1 13.38,7.74 14.35,8.27C14.69,8.45 14.97,8.73 15.15,9.07Z" transform="translate(13.39,15) translate(-13.39,-15)"/></g></g></g></g></g></g></svg></div></div><span class="marker-time-label">${pt.time||''}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Время:</span><span class="point-attrs__val">${pt.time||''}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Скорость:</span><span class="point-attrs__val">${speed} км/ч</span></span></div></div></div>`;
            const m = L.marker(cur, { icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [90, 30], iconAnchor: [15, 15] }) });
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

    // ── Show stops on map ──
    const showStopMarkers = (routeData) => {
        if (!settings.analytics.stops) return;
        stopMarkersLayer.clearLayers();

        // Compute stops from actual_path if backend didn't provide them
        let serviceStops = routeData.service_stops || [];
        let parkingStops = routeData.parking_stops || [];

        if (serviceStops.length === 0 && parkingStops.length === 0 && routeData.actual_path?.length > 1) {
            const taskPositions = (processedRoute?.tasks || []).filter(t => t.latLng).map(t => ({ id: t.id, latLng: t.latLng }));
            const result = analyzeStops(routeData.actual_path, taskPositions, props.serviceRadius || 500);
            serviceStops = result.serviceStops;
            parkingStops = result.parkingStops;
        }

        const create = (stops, type) => {
            if (!stops?.length) return;
            const isService = type === 'service';
            stops.forEach(s => {
                const label = isService ? 'Обслуживание' : 'Остановка';
                const bgColor = isService ? '#4a90d9' : '#bf0000';
                const icon = isService ? '🔧' : 'P';
                const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:${bgColor}"><div class="icon-container"><div class="icon-background" style="background-color:${bgColor}">${icon}</div></div><span class="marker-time-label">${label}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">с ${s.start_time} по ${s.end_time}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Длительность:</span><span class="point-attrs__val">${s.duration} мин</span></span></div></div></div>`;
                const m = L.marker([s.lat, s.lon], { icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [120, 30], iconAnchor: [15, 15] }) });
                m.on('click', handleActualMarkerClick);
                stopMarkersLayer.addLayer(m);
            });
        };
        create(serviceStops, 'service');
        create(parkingStops, 'parking');
    };

    // ── Signal loss markers ──
    const showSignalLossMarkers = (routeData) => {
        if (!settings.analytics.signal_loss) return;
        signalLossMarkersLayer.clearLayers();

        // Compute signal loss from actual_path if backend didn't provide them
        let events = routeData.signal_loss_events || [];
        if (events.length === 0 && routeData.actual_path?.length > 1) {
            events = analyzeSignalLoss(routeData.actual_path);
        }

        events.forEach(ev => {
            ['loss', 'restore'].forEach(type => {
                const pt = type === 'loss' ? ev.loss_point : ev.restore_point;
                const isLoss = type === 'loss';
                const html = `<div class="actual-path-marker stop-marker"><div class="marker-main-view" style="border-color:#f07178"><div class="icon-container"><div class="icon-background" style="background-color:#f07178">${isLoss ? '✕' : '✓'}</div></div><span class="marker-time-label">${isLoss ? 'Потеря сигнала' : 'Восстановление'}</span></div><div class="route-popup__extend"><div class="point-attrs"><span class="point-attrs__item"><span class="point-attrs__label">Период:</span><span class="point-attrs__val">${ev.loss_point.time} — ${ev.restore_point.time}</span></span><span class="point-attrs__item"><span class="point-attrs__label">Длительность:</span><span class="point-attrs__val">${ev.duration} мин</span></span></div></div></div>`;
                const m = L.marker([pt.lat, pt.lon], { icon: L.divIcon({ className: 'custom-div-icon', html, iconSize: [150, 30], iconAnchor: [15, 15] }) });
                m.on('click', handleActualMarkerClick);
                signalLossMarkersLayer.addLayer(m);
            });
        });
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

            const addrText = addr.text || '';

            const html = `<div class="route-popup unassigned-popup">
                <div class="route-popup__main" style="border-color: #999">
                    <span class="route-popup__counter" style="background-color: #999"></span>
                </div>
                <div class="route-popup__extend">
                    <div class="point-attrs">
                        <span class="point-attrs__item"><span class="point-attrs__label">Название:</span><span class="point-attrs__val">${taskName}</span></span>
                        <span class="point-attrs__item"><span class="point-attrs__label">Адрес:</span><span class="point-attrs__val">${addrText}</span></span>
                    </div>
                </div>
            </div>`;

            const marker = L.marker([addr.coords[0], addr.coords[1]], {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [15, 15] }),
                zIndexOffset: 500
            }).addTo(mapInstance.value);

            marker.on('click', () => {
                const el = marker.getElement();
                if (el) handleMarkerClick(el);
                emit('unassignedTaskClick', task);
            });

            marker._taskId = task.id;
            unassignedMarkers.push(marker);
        });
    };

    // ── Click handlers ──
    const handleMarkerClick = (el) => {
        if (!el) return;
        if (activeMarkerElement) activeMarkerElement.style.zIndex = '';
        el.style.zIndex = 1000; activeMarkerElement = el;
        const ext = el.querySelector('.route-popup__extend');
        document.querySelectorAll('.route-popup__extend.active').forEach(e => { if (e !== ext) e.classList.remove('active'); });
        if (ext) ext.classList.toggle('active');
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
    const fitBounds = () => {
        if (!mapInstance.value || !L) return;
        const pts = [];
        if (processedRoute?.tasks) processedRoute.tasks.forEach(t => { if (t.latLng) pts.push(t.latLng); });
        if (shouldShowUnassigned()) {
            props.unassignedTasks.forEach(t => {
                const a = parseAddress(t.address);
                if (a) pts.push(L.latLng(a.coords[0], a.coords[1]));
            });
        }
        if (pts.length === 0) return;
        if (pts.length === 1) safeSetView(pts[0], 15);
        else safeFitBounds(L.latLngBounds(pts), { padding: [30, 30] });
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
    const toggleSelectionMode = () => {
        if (!props.enableSelection || !mapInstance.value) return;
        if (selectionActive.value) { emit('getSelectedPoints', { value: [], state: false }); stopSelectionMode(false); return; }
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
                    const inside = props.unassignedTasks.filter(t => {
                        const a = parseAddress(t.address); if (!a) return false;
                        const ll = L.latLng(a.coords[0], a.coords[1]); if (!bounds.contains(ll)) return false;
                        let ins = false;
                        for (let i = 0, j = polLL.length - 1; i < polLL.length; j = i++) {
                            const xi = polLL[i].lng, yi = polLL[i].lat, xj = polLL[j].lng, yj = polLL[j].lat;
                            if (((yi > ll.lat) !== (yj > ll.lat)) && (ll.lng < (xj - xi) * (ll.lat - yi) / (yj - yi) + xi)) ins = !ins;
                        }
                        return ins;
                    });
                    emit('getSelectedPoints', { value: inside.map(t => parseAddress(t.address)?.coords), state: true });
                }
                stopSelectionMode(true);
            };
            mapInstance.value.on('mousemove', moveH); mapInstance.value.on('mouseup', upH);
        };
        mapInstance.value.on('mousedown', selectionMouseDownHandler);
    };

    const stopSelectionMode = (keep) => {
        if (mapInstance.value) { mapInstance.value.getContainer().style.cursor = ''; mapInstance.value.dragging.enable(); if (selectionMouseDownHandler) mapInstance.value.off('mousedown', selectionMouseDownHandler); }
        if (!keep) clearSelectionPolygon();
        selectionActive.value = false; isDrawingPath = false;
    };

    const clearSelectionPolygon = () => {
        if (selectionPolygon && mapInstance.value) mapInstance.value.removeLayer(selectionPolygon);
        if (drawingPolyline && mapInstance.value) mapInstance.value.removeLayer(drawingPolyline);
        selectionPolygon = null; drawingPolyline = null; selectionPath = [];
    };

    // ── Public: focus on an unassigned task from table click ──
    const focusUnassignedTask = (taskId) => {
        if (!mapInstance.value) return;
        const id = Number(taskId);
        const marker = unassignedMarkers.find(m => Number(m._taskId) === id);
        if (marker) {
            const latlng = marker.getLatLng();
            safeSetView(latlng, 16);
            const el = marker.getElement();
            if (el) handleMarkerClick(el);
        }
    };

    // ── Public: focus on a route task from table click ──
    const focusRouteTask = (taskId) => {
        if (!mapInstance.value) return;
        const id = Number(taskId);
        const marker = routeMarkers.find(m => Number(m._taskId) === id);
        if (marker) {
            const latlng = marker.getLatLng();
            safeSetView(latlng, 16);
            const el = marker.getElement();
            if (el) handleMarkerClick(el);
            // Show service radius
            if (serviceRadiusCircle) { mapInstance.value.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null; }
            const radius = props.serviceRadius || 500;
            const task = processedRoute?.tasks?.find(t => t.id === id);
            const color = task?.routeColor || '#8601ff';
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

    defineExpose({ focusUnassignedTask, focusRouteTask });

    // ── Lifecycle ──
    onMounted(async () => { await initMap(); /* document.addEventListener('click', closeSettingsOnClick); */ });
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
        console.log('🟢 WATCH unassignedTasks, length:', newVal?.length);
        if (shouldShowUnassigned() && newVal?.length) {
            renderUnassignedTasks(newVal);
        }
    }, { deep: true });
    watch(() => props.showUnassigned, () => applySettings());
    watch(() => props.activeTaskId, (taskId) => {
        if (!taskId || !mapInstance.value) return;
        // Skip if click came from map marker — already handled
        if (clickedFromMap) return;
        const id = Number(taskId);
        // Try route markers first
        const routeMarker = routeMarkers.find(m => Number(m._taskId) === id);
        if (routeMarker) {
            focusRouteTask(id);
            return;
        }
        // Try unassigned markers
        const unassignedMarker = unassignedMarkers.find(m => Number(m._taskId) === id);
        if (unassignedMarker) {
            focusUnassignedTask(id);
        }
    });
</script>