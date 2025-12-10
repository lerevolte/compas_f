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
    const selectionPolygon = ref(null);
    const selectionActive = ref(false);
    const isDrawingPath = ref(false);
    const selectionPath = ref([]);
    const drawingPolyline = ref(null);
    let selectionMouseDownHandler = null;

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
        if (!mapInstance.value || !points.length) {
            return;
        }

        if (points.length === 1) {
            mapInstance.value.setView(points[0].coords, props.options.defaultZoom ?? 10, {
                animate: true
            });
            return;
        }

        if (!L) return;
        
        const bounds = L.latLngBounds(points.map(({ coords }) => coords));
        mapInstance.value.fitBounds(bounds, {
            padding: [20, 20],
            animate: true
        });
    };

    /**
     * Отображает маркеры на карте
     * Удаляет старые маркеры и создает новые для всех переданных точек
     * Использует кастомную или стандартную иконку в зависимости от настроек
     * @param {Array} points - Массив нормализованных точек для отображения
     */
    const renderMarkers = (points) => {
        if (!mapInstance.value || !L) {
            return;
        }

        if (markersLayer.value) {
            mapInstance.value.removeLayer(markersLayer.value);
            markersLayer.value = null;
        }

        if (!points.length) {
            return;
        }

        markersLayer.value = L.layerGroup();
        const icon = getMarkerIcon();
        if (!icon) return;

        points.forEach(({ coords }) => {
            const marker = L.marker(coords, { icon });
            markersLayer.value.addLayer(marker);
        });

        markersLayer.value.addTo(mapInstance.value);
    };

    /**
     * Удаляет маршрут с карты
     * Очищает слой с маршрутом если он существует
     */
    const clearRoute = () => {
        if (routeLayer.value && mapInstance.value) {
            mapInstance.value.removeLayer(routeLayer.value);
        }

        routeLayer.value = null;
    };

    /**
     * Строит маршрут между точками
     * Использует OSRM API для построения реального маршрута
     * При ошибке или недоступности API рисует прямую линию между точками
     * @param {Boolean} isSilent - Если true, не эмитит событие route-built
     */
    const buildRoute = async (isSilent = false) => {
        if (!mapInstance.value || !L) {
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
        
        try {
            // Используем OSRM API для построения маршрута
            const coordinates = coords.map(c => `${c[1]},${c[0]}`).join(';');
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
            );
            
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                routeLayer.value = L.polyline(routeCoordinates, {
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.7
                }).addTo(mapInstance.value);

                if (!isSilent) {
                    emit('route-built', normalizedPoints.value.map(({ raw }) => raw));
                }
            } else {
                // Если OSRM не доступен, рисуем прямую линию между точками
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
        } catch (error) {
            console.warn('[MapFrame] Не удалось построить маршрут через OSRM, используется прямая линия', error);
            
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
     * Синхронизирует отображение точек на карте
     * Обновляет маркеры, центрирует карту на точках
     * Перестраивает маршрут если он был построен ранее
     */
    const syncPointsOnMap = () => {
        renderMarkers(normalizedPoints.value);
        focusMapOnPoints(normalizedPoints.value);

        if (routeLayer.value || props.options) {
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
            const mapLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            });

            mapLayer.addTo(mapInstance.value);

            // Принудительно обновляем размер карты после инициализации
            setTimeout(() => {
                if (mapInstance.value) {
                    mapInstance.value.invalidateSize();
                }
            }, 100);

            emit('map-ready', mapInstance.value);
            syncPointsOnMap();
        } catch (error) {
            console.error('[MapFrame] Не удалось инициализировать карту', error);
        }
    };

    watch(normalizedPoints, () => {
        if (!mapInstance.value) {
            return;
        }

        syncPointsOnMap();
    }, {
        deep: true
    });

    watch(() => props.options.enableRoute, (isEnabled) => {
        if (!isEnabled) {
            clearRoute();
        }
    });

    onMounted(() => {
        initMap();
    });

    onBeforeUnmount(() => {
        stopSelectionMode(false);
        clearSelectionPolygon();
        clearRoute();

        if (mapInstance.value) {
            mapInstance.value.remove();
            mapInstance.value = null;
        }
    });
</script>
