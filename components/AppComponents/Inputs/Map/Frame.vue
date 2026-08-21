<template>
    <div class="map__frame">
        <div class="map__frame-header" v-if="props.options?.enableHeader">
            <div class="map__frame-title">
                Карта
            </div>
        </div>

        <div ref="mapContainer" class="map__frame-map"></div>
    </div>
</template>

<script setup>
    import './Map.scss';

    const emit = defineEmits([
        'map-ready',
        'route-built',
        'getSelectedPoints',
        'map-click'
    ]);

    const props = defineProps({
        points: {
            default: () => [],
            type: Array
        },
        options: {
            default: () => ({
                enableRoute: false,
                enableSelection: false,
                defaultZoom: 10
            })
        },
        markerOptions: {
            default: () => ({
                imageHref: '',
                imageSize: [32, 32],
                imageOffset: [-16, -32]
            }),
            type: Object
        },
        markerContent: {
            default: '',
            type: String
        },
        defaultCenter: {
            default: () => [55.755864, 37.617698],
            type: Array
        }
    });

    const mapContainer = ref(null);
    let yMap = null;
    let placemark = null;
    let resizeObserver = null;

    const normalizedPoints = computed(() => {
        if (!Array.isArray(props.points)) return [];
        return props.points
            .map((point) => {
                if (!Array.isArray(point) || point.length < 2) return null;
                const lat = Number(point[0]);
                const lng = Number(point[1]);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return [lat, lng];
            })
            .filter(Boolean);
    });

    const loadYandexMapsAPI = () => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('window is undefined'));
                return;
            }
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
                resolve();
                return;
            }
            const existing = document.querySelector('script[src*="api-maps.yandex.ru"]');
            if (existing) {
                const interval = setInterval(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(interval);
                    if (window.ymaps) resolve();
                    else reject(new Error('Yandex Maps API loading timeout'));
                }, 10000);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://api-maps.yandex.ru/2.1/?apikey=10946c08-3ea9-4fac-95d1-c833ee44dd6b&suggest_apikey=ac70b70c-5e2e-4a1e-9d90-a66aa3b11ddd&lang=ru_RU';
            script.onload = () => {
                setTimeout(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') resolve();
                    else reject(new Error('Yandex Maps API loaded but ymaps unavailable'));
                }, 100);
            };
            script.onerror = () => reject(new Error('Failed to load Yandex Maps API'));
            document.head.appendChild(script);
        });
    };

    const placemarkOptions = computed(() => {
        const opts = { hideIconOnBalloonOpen: false };
        if (props.markerContent && window.ymaps?.templateLayoutFactory) {
            opts.iconLayout = window.ymaps.templateLayoutFactory.createClass(props.markerContent);
            opts.iconOffset = [-9, -9];
            return opts;
        }
        if (props.markerOptions?.imageHref) {
            const size = props.markerOptions.imageSize ?? [32, 32];
            const offset = props.markerOptions.imageOffset ?? [-16, -32];
            opts.iconLayout = 'default#image';
            opts.iconImageHref = props.markerOptions.imageHref;
            opts.iconImageSize = size;
            opts.iconImageOffset = offset;
        } else {
            opts.preset = 'islands#redDotIcon';
        }
        return opts;
    });

    const isPointVisible = (coords) => {
        const bounds = typeof yMap.getBounds === 'function' ? yMap.getBounds() : null;
        if (!bounds) return false;
        const [[minLat, minLng], [maxLat, maxLng]] = bounds;
        return coords[0] >= minLat && coords[0] <= maxLat
            && coords[1] >= minLng && coords[1] <= maxLng;
    };

    const renderPoints = () => {
        if (!yMap || !window.ymaps) return;
        const points = normalizedPoints.value;

        // Один маркер — простой кейс адресного поля.
        if (points.length === 0) {
            if (placemark) {
                yMap.geoObjects.remove(placemark);
                placemark = null;
            }
            return;
        }

        if (points.length === 1) {
            const coords = points[0];
            if (!placemark) {
                placemark = new window.ymaps.Placemark(coords, {}, placemarkOptions.value);
                yMap.geoObjects.add(placemark);
            } else {
                placemark.geometry.setCoordinates(coords);
                placemark.options.set(placemarkOptions.value);
            }
            if (!isPointVisible(coords)) {
                yMap.setCenter(coords, yMap.getZoom(), { duration: 0 });
            }
            return;
        }

        // Несколько точек — чистим старое, добавляем по placemark, fit bounds.
        yMap.geoObjects.removeAll();
        placemark = null;
        const collection = new window.ymaps.GeoObjectCollection();
        points.forEach(coords => {
            collection.add(new window.ymaps.Placemark(coords, {}, placemarkOptions.value));
        });
        yMap.geoObjects.add(collection);
        const bounds = collection.getBounds();
        if (bounds) {
            yMap.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30, duration: 0 });
        }
    };

    const initMap = async () => {
        if (typeof window === 'undefined') return;
        await nextTick();
        if (!mapContainer.value) return;

        if (mapContainer.value.offsetHeight === 0) {
            mapContainer.value.style.height = '360px';
        }

        try {
            await loadYandexMapsAPI();
            await new Promise(resolve => window.ymaps.ready(resolve));

            const initialCenter = normalizedPoints.value[0] || props.defaultCenter;
            const initialZoom = props.options.defaultZoom ?? 10;

            yMap = new window.ymaps.Map(mapContainer.value, {
                center: initialCenter,
                zoom: initialZoom,
                // Стандартный zoomControl садится в верхний-левый угол. Нам нужен
                // зум по центру по вертикали слева — поэтому не добавляем его
                // здесь, а создаём ниже с вычисленной позицией top.
                controls: [],
                behaviors: ['drag', 'scrollZoom', 'multiTouch', 'dblClickZoom']
            }, {
                suppressMapOpenBlock: true,
                yandexMapDisablePoiInteractivity: true,
            });

            yMap.events.add('click', (event) => {
                emit('map-click', event.get('coords'));
            });

            // Контрол зума по центру по вертикали (слева). Yandex позиционирует
            // контролы абсолютным top/left, «центра» у него нет — считаем top
            // от высоты контейнера карты (примерная высота контрола ~80px).
            try {
                const containerH = mapContainer.value.offsetHeight || 360;
                const zoomControl = new window.ymaps.control.ZoomControl({
                    options: {
                        position: { left: 10, top: Math.max(10, Math.round((containerH - 70) / 2)) }
                    }
                });
                yMap.controls.add(zoomControl);
            } catch (e) {}

            // Подстраховка на ресайз контейнера (например модалка).
            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(() => {
                    if (yMap && yMap.container && typeof yMap.container.fitToViewport === 'function') {
                        yMap.container.fitToViewport();
                    }
                });
                resizeObserver.observe(mapContainer.value);
            }

            renderPoints();
            emit('map-ready', yMap);
        } catch (error) {
            console.error('[MapFrame] Не удалось инициализировать Яндекс карту', error);
        }
    };

    watch(normalizedPoints, () => {
        if (!yMap) return;
        renderPoints();
    }, { deep: true });

    onMounted(() => {
        initMap();
    });

    onBeforeUnmount(() => {
        if (resizeObserver) {
            try { resizeObserver.disconnect(); } catch (e) {}
            resizeObserver = null;
        }
        if (yMap) {
            try { yMap.destroy(); } catch (e) {}
            yMap = null;
            placemark = null;
        }
    });
</script>
