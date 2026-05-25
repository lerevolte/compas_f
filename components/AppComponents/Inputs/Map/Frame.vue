<template>
    <div class="map__frame">
        <div class="map__frame-header" v-if="props.options?.enableHeader">
            <div class="map__frame-title">
                Карта
            </div>
            <IconLaso 
                class="map__frame-selection"
                :class="{'map__frame-selection_active': selectionActive}"
                v-if="props.options.enableSelection"
                @click="toggleSelectionMode"
            />
        </div>

        <div ref="mapContainer" class="map__frame-map"></div>
    </div>
</template>

<script setup>
    import './Map.scss';
    import IconLaso from '@AppIcons/Laso.vue';

    // Leaflet будет загружен динамически только на клиенте
    let L = null;

    const emit = defineEmits([
        'map-ready',
        'route-built',
        'getSelectedPoints'
    ]);

    const props = defineProps({
        points: {
            default: () => [],
            type: Array
        },
        options: {
            default: {
                enableRoute: false,
                enableSelection: false,
                defaultZoom: 10
            }
        },
        markerOptions: {
            default: () => ({
                imageHref: '',
                imageSize: [32, 32],
                imageOffset: [-16, -32]
            }),
            type: Object
        },
        defaultCenter: {
            default: () => [55.755864, 37.617698],
            type: Array
        }
    });

    const mapContainer = ref(null);
    const mapInstance = ref(null);
    const markersLayer = ref(null);
    const routeLayer = ref(null);
    const routingControl = ref(null);
    const selectionPolygon = ref(null);
    const selectionActive = ref(false);
    const isDrawingPath = ref(false);
    const selectionPath = ref([]);
    const drawingPolyline = ref(null);
    let selectionMouseDownHandler = null;
    let throttledMoveHandler = null;

    /**
     * Нормализует массив точек из пропсов
     * Преобразует строковые координаты в числа и валидирует их
     * @returns {Array} Массив нормализованных точек с координатами [lat, lng], исходными данными и индексом
     */
    const normalizedPoints = computed(() => {
        if (!Array.isArray(props.points)) {
            return [];
        }

        return props.points
            .map((point, index) => {
                if (!Array.isArray(point) || point.length < 2) {
                    return null;
                }

                const lat = Number(point[0]);
                const lng = Number(point[1]);

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return null;
                }

                return {
                    coords: [lat, lng],
                    raw: point,
                    index
                };
            })
            .filter(Boolean);
    });


    /**
     * Проверяет, используется ли кастомная иконка для маркеров
     * @returns {Boolean} true если указан путь к кастомной иконке
     */
    const hasCustomMarkerIcon = computed(() => Boolean(props.markerOptions?.imageHref));

    /**
     * Создает иконку для маркера
     * Если указана кастомная иконка, создает L.icon с настройками из props.markerOptions
     * Иначе возвращает стандартную иконку Leaflet
     * @returns {L.Icon} Объект иконки для маркера
     */
    const getMarkerIcon = () => {
        if (!L) return null;

        if (hasCustomMarkerIcon.value) {
            const size = props.markerOptions.imageSize ?? [32, 32];
            const offset = props.markerOptions.imageOffset ?? [-16, -32];
            
            // В Leaflet iconAnchor - это точка, которая будет совпадать с координатами маркера
            // offset обычно отрицательный для смещения вверх
            return L.icon({
                iconUrl: props.markerOptions.imageHref,
                iconSize: size,
                iconAnchor: [size[0] / 2 - offset[0], size[1] - offset[1]],
                popupAnchor: [0, -size[1] / 2]
            });
        }

        return new L.Icon.Default();
    };

    /**
     * Центрирует карту на точках
     * Если точка одна - устанавливает центр и зум на эту точку
     * Если точек несколько - подстраивает границы карты чтобы все точки были видны
     * @param {Array} points - Массив нормализованных точек
     */
    const focusMapOnPoints = (points) => {
        if (!mapInstance.value || !points.length) return;

        if (points.length === 1) {
            mapInstance.value.setView(points[0].coords, props.options.defaultZoom ?? 10, {
                animate: false
            });
        } else {
            if (!L) return;
            const bounds = L.latLngBounds(points.map(({ coords }) => coords));
            mapInstance.value.fitBounds(bounds, {
                padding: [20, 20],
                animate: false
            });
        }

        // Force Yandex layer to refresh by triggering a tiny zoom
        setTimeout(() => {
            if (mapInstance.value) {
                const z = mapInstance.value.getZoom();
                mapInstance.value.setZoom(z - 1, { animate: false });
                setTimeout(() => {
                    if (mapInstance.value) {
                        mapInstance.value.setZoom(z, { animate: false });
                    }
                }, 50);
            }
        }, 100);
    };

    /**
     * Отображает маркеры на карте
     * Удаляет старые маркеры и создает новые для всех переданных точек
     * Использует кастомную или стандартную иконку в зависимости от настроек
     * @param {Array} points - Массив нормализованных точек для отображения
     */
    const renderMarkers = (points) => {
        if (!mapInstance.value || !L) return;
        
        console.log('renderMarkers, points:', points.map(p => p.coords));

        if (markersLayer.value) {
            mapInstance.value.removeLayer(markersLayer.value);
            markersLayer.value = null;
        }

        if (!points.length) return;

        markersLayer.value = L.layerGroup();
        const icon = getMarkerIcon();
        if (!icon) return;

        points.forEach(({ coords }) => {
            console.log('Adding marker at:', coords);
            const marker = L.marker(coords, { icon });
            markersLayer.value.addLayer(marker);
        });

        markersLayer.value.addTo(mapInstance.value);
    };

    /**
     * Удаляет маршрут с карты
     * Очищает слой с маршрутом и routing control если они существуют
     */
    const clearRoute = () => {
        if (routingControl.value && mapInstance.value) {
            mapInstance.value.removeControl(routingControl.value);
            routingControl.value = null;
        }

        if (routeLayer.value && mapInstance.value) {
            mapInstance.value.removeLayer(routeLayer.value);
        }

        routeLayer.value = null;
    };

    /**
     * Загружает RoutingMachine.js
     * @returns {Promise} Промис, который разрешается после загрузки
     */
    const loadRoutingMachine = () => {
        return new Promise(async (resolve, reject) => {
            // Проверяем, не загружен ли уже RoutingMachine
            if (window.L && window.L.Routing && window.L.Routing.control) {
                resolve();
                return;
            }

            try {
                await import('./RoutingMachine.js');
                // Даем время RoutingMachine инициализироваться
                setTimeout(() => {
                    if (window.L && window.L.Routing && window.L.Routing.control) {
                        resolve();
                    } else {
                        reject(new Error('RoutingMachine не загружен'));
                    }
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    };

    /**
     * Строит маршрут между точками
     * Использует L.Routing.control из RoutingMachine.js для построения реального маршрута
     * При ошибке или недоступности API рисует прямую линию между точками
     * @param {Boolean} isSilent - Если true, не эмитит событие route-built
     */
    const buildRoute = async (isSilent = false) => {
        if (!mapInstance.value || !L) {
            return;
        }

        // Проверяем, включено ли построение маршрута
        if (!props.options?.enableRoute) {
            return;
        }

        if (normalizedPoints.value.length < 2) {
            if (!isSilent) {
                clearRoute();
            }
            return;
        }

        clearRoute();

        const coords = normalizedPoints.value.map(({ coords }) => coords);
        const waypoints = coords.map(coord => L.latLng(coord));
        
        try {
            // Загружаем RoutingMachine если еще не загружен
            await loadRoutingMachine();

            if (!L.Routing || !L.Routing.control) {
                throw new Error('L.Routing is not available');
            }

            // Создаем routing control
            routingControl.value = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                show: false,
                useHints: false,
                createMarker: () => null, // Отключаем создание маркеров, так как они уже есть
                lineOptions: {
                    styles: [{ 
                        color: '#3b82f6', 
                        opacity: 0.7, 
                        weight: 4 
                    }]
                },
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                })
            });

            // Обработчик успешного построения маршрута
            routingControl.value.on('routesfound', function(e) {
                const route = e.routes[0];
                if (route && route.coordinates) {
                    // RoutingMachine уже отображает маршрут, но мы можем сохранить координаты
                    // для возможного использования в других местах
                    routeLayer.value = {
                        coordinates: route.coordinates,
                        distance: route.summary?.totalDistance,
                        time: route.summary?.totalTime
                    };

                    if (!isSilent) {
                        emit('route-built', normalizedPoints.value.map(({ raw }) => raw));
                    }
                }
            });

            // Обработчик ошибки построения маршрута
            routingControl.value.on('routingerror', function() {
                console.warn('[MapFrame] Не удалось построить маршрут через RoutingMachine, используется прямая линия');
                
                // В случае ошибки рисуем прямую линию
                routeLayer.value = L.polyline(coords, {
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }).addTo(mapInstance.value);

                if (!isSilent) {
                    emit('route-built', normalizedPoints.value.map(({ raw }) => raw));
                }
            });

            // Добавляем control на карту
            routingControl.value.addTo(mapInstance.value);

        } catch (error) {
            console.warn('[MapFrame] Не удалось построить маршрут через RoutingMachine, используется прямая линия', error);
            
            // В случае ошибки рисуем прямую линию
            routeLayer.value = L.polyline(coords, {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(mapInstance.value);

            if (!isSilent) {
                emit('route-built', normalizedPoints.value.map(({ raw }) => raw));
            }
        }
    };

    /**
     * Очищает полигон выделения и временную линию рисования
     * Удаляет все слои связанные с выделением области
     */
    const clearSelectionPolygon = () => {
        if (selectionPolygon.value && mapInstance.value) {
            mapInstance.value.removeLayer(selectionPolygon.value);
        }

        if (drawingPolyline.value && mapInstance.value) {
            mapInstance.value.removeLayer(drawingPolyline.value);
        }

        selectionPolygon.value = null;
        drawingPolyline.value = null;
        selectionPath.value = [];
    };

    /**
     * Обновляет визуальное отображение выделяемой области
     * Во время рисования показывает временную пунктирную линию
     * После завершения рисования создает или обновляет полигон
     */
    const updateSelectionPolygon = () => {
        if (!mapInstance.value || !selectionPath.value.length || !L) {
            return;
        }

        // Обновляем временную линию при рисовании
        if (isDrawingPath.value && selectionPath.value.length > 1) {
            if (drawingPolyline.value) {
                drawingPolyline.value.setLatLngs(selectionPath.value);
            } else {
                drawingPolyline.value = L.polyline(selectionPath.value, {
                    color: '#3b82f6',
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '5, 5'
                }).addTo(mapInstance.value);
            }
        }

        // Обновляем полигон после завершения рисования
        if (!isDrawingPath.value && selectionPath.value.length >= 3) {
            const closedPath = [...selectionPath.value, selectionPath.value[0]];
            
            if (selectionPolygon.value) {
                selectionPolygon.value.setLatLngs([closedPath]);
            } else {
                selectionPolygon.value = L.polygon([closedPath], {
                    fillColor: '#3b82f6',
                    fillOpacity: 0.2,
                    color: '#3b82f6',
                    weight: 2,
                    opacity: 0.7
                }).addTo(mapInstance.value);
            }
        }
    };

    /**
     * Останавливает режим выделения области
     * Восстанавливает стандартный курсор и включает перетаскивание карты
     * Удаляет обработчики событий мыши
     * @param {Boolean} keepPolygon - Если false, удаляет нарисованный полигон
     */
    const stopSelectionMode = (keepPolygon = true) => {
        if (mapInstance.value) {
            mapInstance.value.getContainer().style.cursor = '';
            mapInstance.value.dragging.enable();
            mapInstance.value.doubleClickZoom.enable();
            
            if (selectionMouseDownHandler) {
                mapInstance.value.off('mousedown', selectionMouseDownHandler);
                selectionMouseDownHandler = null;
            }
        }

        if (!keepPolygon) {
            clearSelectionPolygon();
        }

        selectionActive.value = false;
        isDrawingPath.value = false;
    };

    /**
     * Завершает процесс выделения области
     * Проверяет что нарисовано минимум 3 точки для создания полигона
     * Вычисляет какие точки из normalizedPoints попадают внутрь выделенной области
     * Эмитит событие getSelectedPoints с массивом точек внутри области
     */
    const finishSelection = () => {
        if (!isDrawingPath.value) {
            return;
        }

        isDrawingPath.value = false;

        if (drawingPolyline.value && mapInstance.value) {
            mapInstance.value.removeLayer(drawingPolyline.value);
            drawingPolyline.value = null;
        }

        if (selectionPath.value.length < 3) {
            clearSelectionPolygon();
            stopSelectionMode(false);
            return;
        }

        updateSelectionPolygon();

        if (selectionPolygon.value) {
            const polygonBounds = selectionPolygon.value.getBounds();
            const polygonLatLngs = selectionPolygon.value.getLatLngs()[0];
            
            /**
             * Проверяет находится ли точка внутри полигона
             * Использует алгоритм ray casting для определения принадлежности точки полигону
             * @param {Array} point - Координаты точки [lat, lng]
             * @param {Array} polygon - Массив координат вершин полигона
             * @returns {Boolean} true если точка внутри полигона
             */
            const isPointInPolygon = (point, polygon) => {
                if (!L) return false;
                
                const latlng = L.latLng(point[0], point[1]);
                
                // Сначала проверяем bounding box для быстрой фильтрации
                if (!polygonBounds.contains(latlng)) {
                    return false;
                }
                
                // Проверка точки внутри полигона (ray casting algorithm)
                let inside = false;
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    const xi = polygon[i].lng;
                    const yi = polygon[i].lat;
                    const xj = polygon[j].lng;
                    const yj = polygon[j].lat;
                    
                    const intersect = ((yi > latlng.lat) !== (yj > latlng.lat)) &&
                        (latlng.lng < (xj - xi) * (latlng.lat - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                
                return inside;
            };
            
            const insidePoints = normalizedPoints.value
                .filter(({ coords }) => isPointInPolygon(coords, polygonLatLngs))
                .map(({ raw }) => raw);

            emit('getSelectedPoints', {value: insidePoints, state: true});
        }

        stopSelectionMode(true);
    };

    /**
     * Начинает процесс рисования пути для выделения области
     * Устанавливает обработчики событий мыши для отслеживания движения и отпускания
     * @param {Array} startCoords - Начальные координаты [lat, lng] где началось рисование
     */
    const startDrawingPath = (startCoords) => {
        if (!mapInstance.value) {
            return;
        }

        selectionPath.value = [startCoords];
        isDrawingPath.value = true;

        const mouseMoveHandler = (e) => {
            if (!isDrawingPath.value) return;
            
            const coords = [e.latlng.lat, e.latlng.lng];
            selectionPath.value = [...selectionPath.value, coords];
            updateSelectionPolygon();
        };

        const mouseUpHandler = () => {
            if (!isDrawingPath.value) return;
            
            mapInstance.value.off('mousemove', mouseMoveHandler);
            mapInstance.value.off('mouseup', mouseUpHandler);
            
            finishSelection();
        };

        mapInstance.value.on('mousemove', mouseMoveHandler);
        mapInstance.value.on('mouseup', mouseUpHandler);
    };

    /**
     * Переключает режим выделения области
     * При включении: меняет курсор на crosshair, отключает перетаскивание карты
     * При выключении: восстанавливает стандартное поведение карты
     * Устанавливает обработчик mousedown для начала рисования области
     */
    const toggleSelectionMode = () => {
        if (!props.options.enableSelection || !mapInstance.value) {
            return;
        }

        if (selectionActive.value) {
            emit('getSelectedPoints', {value: [], state: false});
            stopSelectionMode(false);
            return;
        }

        clearSelectionPolygon();
        selectionActive.value = true;
        
        mapInstance.value.getContainer().style.cursor = 'crosshair';
        mapInstance.value.dragging.disable();
        mapInstance.value.doubleClickZoom.disable();

        selectionMouseDownHandler = (e) => {
            if (!selectionActive.value) {
                return;
            }

            const originalEvent = e.originalEvent;
            if (originalEvent.button !== 0) {
                return;
            }

            originalEvent.preventDefault();
            originalEvent.stopPropagation();

            const coords = [e.latlng.lat, e.latlng.lng];
            startDrawingPath(coords);
        };

        mapInstance.value.on('mousedown', selectionMouseDownHandler);
    };

    /**
     * Создает функцию throttle для ограничения частоты вызовов
     * @param {Function} func - Функция для троттлинга
     * @param {Number} delay - Задержка в миллисекундах
     * @returns {Function} Троттлированная функция
     */
    const throttle = (func, delay) => {
        let timeoutId = null;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    };

    /**
     * Обработчик передвижения карты с троттлингом
     * Вызывается при перетаскивании карты для оптимизации производительности
     */
    const handleMapMove = () => {
        // Здесь можно добавить логику, которая должна выполняться при передвижении карты
        // Например, обновление координат, эмит событий и т.д.
    };

    /**
     * Синхронизирует отображение точек на карте
     * Обновляет маркеры, центрирует карту на точках
     * Перестраивает маршрут если он был построен ранее
     */
    const syncPointsOnMap = () => {
        if (!mapInstance.value || !L) return;

        const points = normalizedPoints.value;
        if (!points.length) return;

        renderMarkers(points);

        if (points.length === 1) {
            mapInstance.value.setView(points[0].coords, props.options.defaultZoom ?? 10, { animate: false });
        } else {
            const bounds = L.latLngBounds(points.map(({ coords }) => coords));
            mapInstance.value.fitBounds(bounds, { padding: [20, 20], animate: false });
        }

        // Yandex tile-плагин не перерисовывает тайлы на чистый pan (setView без смены зума) —
        // слушает только zoomend. Дёргаем зум на -1 и обратно, чтобы триггернуть redraw.
        const z = mapInstance.value.getZoom();
        mapInstance.value.setZoom(z - 1, { animate: false });
        setTimeout(() => {
            if (mapInstance.value) {
                mapInstance.value.setZoom(z, { animate: false });
            }
        }, 50);

        if (props.options?.enableRoute) {
            clearRoute();
            buildRoute(true);
        }
    };

    /**
     * Инициализирует карту Leaflet
     * Настраивает пути к иконкам по умолчанию через CDN
     * Создает экземпляр карты с тайлами CartoDB Voyager
     * Эмитит событие map-ready после успешной инициализации
     */
    const initMap = async () => {
        if (typeof window === 'undefined') {
            return;
        }

        // Ждем монтирования DOM
        await nextTick();

        if (!mapContainer.value) {
            console.warn('[MapFrame] Контейнер карты не найден');
            return;
        }

        // Убеждаемся что контейнер имеет высоту
        if (mapContainer.value.offsetHeight === 0) {
            console.warn('[MapFrame] Контейнер карты не имеет высоты, устанавливаем минимальную');
            mapContainer.value.style.height = '360px';
        }

        // Динамически загружаем Leaflet только на клиенте
        if (!L) {
            try {
                const leafletModule = await import('leaflet');
                L = leafletModule.default;
                await import('leaflet/dist/leaflet.css');
                
                // Убеждаемся, что L доступен глобально для RoutingMachine
                if (typeof window !== 'undefined') {
                    window.L = L;
                }
                
                // Загружаем Yandex Maps API перед загрузкой плагина
                await loadYandexMapsAPI();
                
                // Загружаем плагин Yandex для Leaflet только после загрузки API
                await import('./Yandex.js');
            } catch (error) {
                console.error('[MapFrame] Не удалось загрузить Leaflet', error);
                return;
            }
        }

        try {
            // Исправляем пути к иконкам Leaflet по умолчанию
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            mapInstance.value = L.map(mapContainer.value, {
                center: props.defaultCenter,
                zoom: props.options.defaultZoom ?? 10,
                zoomControl: true,
                zoomControlOptions: {
                    position: 'topright'
                }
            });

            // Используем цветные тайлы CartoDB Voyager - визуально похожи на Яндекс.Карты
            // И используют стандартную проекцию Leaflet, что обеспечивает корректное отображение координат
            // const mapLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            //     subdomains: 'abcd',
            //     maxZoom: 19
            // });
            
            L.yandex().addTo(mapInstance.value);
            // mapLayer.addTo(mapInstance.value);

            // Принудительно обновляем размер карты после инициализации
            setTimeout(() => {
                if (mapInstance.value) {
                    mapInstance.value.invalidateSize();
                }
            }, 100);

            // Добавляем троттлинг на события передвижения карты
            // Троттлинг с задержкой 100мс для плавной работы без излишней нагрузки
            throttledMoveHandler = throttle(handleMapMove, 100);
            mapInstance.value.on('move', throttledMoveHandler);

            emit('map-ready', mapInstance.value);
            syncPointsOnMap();
        } catch (error) {
            console.error('[MapFrame] Не удалось инициализировать карту', error);
        }
    };

    /**
     * Загружает API Яндекс карт
     * @returns {Promise} Промис, который разрешается после загрузки API
     */
     const loadYandexMapsAPI = () => {
        return new Promise((resolve, reject) => {
            // Проверяем, не загружен ли уже API
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
                resolve();
                return;
            }

            // Проверяем, не загружается ли уже API
            if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
                // Ждем пока API загрузится
                const checkInterval = setInterval(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                // Таймаут на случай если API не загрузится
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (window.ymaps && typeof window.ymaps.ready === 'function') {
                        resolve();
                    } else {
                        reject(new Error('Yandex Maps API loading timeout'));
                    }
                }, 10000);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://api-maps.yandex.ru/2.1/?apikey=10946c08-3ea9-4fac-95d1-c833ee44dd6b&suggest_apikey=ac70b70c-5e2e-4a1e-9d90-a66aa3b11ddd&lang=ru_RU';
            script.onload = () => {
                // Даем время API инициализироваться
                setTimeout(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') {
                        resolve();
                    } else {
                        reject(new Error('Yandex Maps API loaded but ymaps is not available'));
                    }
                }, 100);
            };
            script.onerror = () => {
                reject(new Error('Failed to load Yandex Maps API'));
            };
            document.head.appendChild(script);
        });
    };

    watch(normalizedPoints, () => {
        if (!mapInstance.value) {
            return;
        }

        syncPointsOnMap();
    }, {
        deep: true
    });

    watch(() => props.options?.enableRoute, (isEnabled) => {
        if (isEnabled && normalizedPoints.value.length >= 2) {
            buildRoute(true);
        } else {
            clearRoute();
        }
    });



    onMounted(async () => {
        await initMap();   
        syncPointsOnMap();
    });

    onBeforeUnmount(() => {
        stopSelectionMode(false);
        clearSelectionPolygon();
        clearRoute();

        // Удаляем обработчик события move перед размонтированием
        if (mapInstance.value && throttledMoveHandler) {
            mapInstance.value.off('move', throttledMoveHandler);
            throttledMoveHandler = null;
        }
    });
</script>
