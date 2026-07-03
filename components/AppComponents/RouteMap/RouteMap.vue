<template>
    <div class="form__item form__item_map map form__item_route-map">
        <span class="blank__title" v-if="props.options?.title && props.options.title != ''">
            {{ props.options.title }}
        </span>

        <div class="map__frame">
            <div ref="mapContainer" class="map__frame-map"></div>
        </div>
    </div>
</template>

<script setup>
    import '@AppComponents/Inputs/Map/Map.scss'

    import api from '@/helpers/api.js'

    const props = defineProps({
        routeId: {
            default: null,
            type: [Number, String]
        },
        options: {
            default: () => ({}),
            type: Object
        }
    })

    const mapContainer = ref(null)
    let yMap = null

    const taskTitle = (task) => {
        const name = task?.name
        if (typeof name === 'string') {
            try {
                const parsed = JSON.parse(name)
                if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                    return String(parsed.value ?? '')
                }
            } catch (e) {}
            return name
        }
        if (name && typeof name === 'object' && 'value' in name) {
            return String(name.value ?? '')
        }
        return ''
    }

    const parseAddress = (address) => {
        try {
            let raw = address
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                raw = JSON.parse(JSON.stringify(raw))
            }
            const addr = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (addr && addr.coords && addr.coords.length === 2) {
                const lat = parseFloat(addr.coords[0])
                const lng = parseFloat(addr.coords[1])
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    return [lat, lng]
                }
            }
        } catch (e) {}
        return null
    }

    const loadYandexMapsAPI = () => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('window is undefined'))
                return
            }
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
                resolve()
                return
            }
            const existing = document.querySelector('script[src*="api-maps.yandex.ru"]')
            if (existing) {
                const interval = setInterval(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') {
                        clearInterval(interval)
                        resolve()
                    }
                }, 100)
                setTimeout(() => {
                    clearInterval(interval)
                    if (window.ymaps) resolve()
                    else reject(new Error('Yandex Maps API loading timeout'))
                }, 10000)
                return
            }
            const script = document.createElement('script')
            script.src = 'https://api-maps.yandex.ru/2.1/?apikey=10946c08-3ea9-4fac-95d1-c833ee44dd6b&suggest_apikey=ac70b70c-5e2e-4a1e-9d90-a66aa3b11ddd&lang=ru_RU'
            script.onload = () => {
                setTimeout(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') resolve()
                    else reject(new Error('Yandex Maps API loaded but ymaps unavailable'))
                }, 100)
            }
            script.onerror = () => reject(new Error('Failed to load Yandex Maps API'))
            document.head.appendChild(script)
        })
    }

    const fetchRouteGeometry = async (points) => {
        const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(';')
        const osrmUrl = `/route/v1/driving/${coordsStr}?overview=full&alternatives=false&steps=false&geometries=geojson`
        let response = null
        try {
            const res = await fetch(osrmUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            response = await res.json()
        } catch (e) {
            try {
                const res = await fetch(`https://opt6.compas.pro${osrmUrl}`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                response = await res.json()
            } catch (e2) {
                return null
            }
        }
        if (response?.code !== 'Ok' || !response.routes?.length) return null
        const geom = response.routes[0].geometry
        if (geom && typeof geom === 'object' && Array.isArray(geom.coordinates)) {
            return geom.coordinates.map(c => [c[1], c[0]])
        }
        return null
    }

    const render = async () => {
        if (!props.routeId || typeof window === 'undefined') return

        let tasks = []
        let routeColor = '#1253a2'
        try {
            const response = await api.callMethod('GET', `/routes/${props.routeId}/tasks`)
            tasks = response.data?.data || []
        } catch (e) {
            console.log('route-map tasks', e)
        }
        try {
            const response = await api.callMethod('GET', `/routes/${props.routeId}/map_data`)
            if (response.data?.color) routeColor = response.data.color
        } catch (e) {}

        const points = tasks
            .map(task => ({ task, coords: parseAddress(task.address) }))
            .filter(p => p.coords)

        try {
            await loadYandexMapsAPI()
            await new Promise(resolve => window.ymaps.ready(resolve))
        } catch (e) {
            console.log('route-map ymaps', e)
            return
        }
        if (!mapContainer.value) return

        if (!yMap) {
            yMap = new window.ymaps.Map(mapContainer.value, {
                center: points[0]?.coords ?? [55.755864, 37.617698],
                zoom: 10,
                controls: ['zoomControl'],
                behaviors: ['drag', 'scrollZoom', 'multiTouch', 'dblClickZoom']
            }, {
                suppressMapOpenBlock: true,
                yandexMapDisablePoiInteractivity: true
            })
        } else {
            yMap.geoObjects.removeAll()
        }

        if (points.length === 0) return

        if (points.length > 1) {
            const geometry = await fetchRouteGeometry(points.map(p => p.coords))
            const lineCoords = geometry ?? points.map(p => p.coords)
            yMap.geoObjects.add(new window.ymaps.Polyline(lineCoords, {}, {
                strokeColor: routeColor,
                strokeWidth: 4,
                strokeOpacity: 0.9
            }))
        }

        points.forEach((point, index) => {
            yMap.geoObjects.add(new window.ymaps.Placemark(point.coords, {
                iconContent: String(index + 1),
                hintContent: taskTitle(point.task)
            }, {
                preset: 'islands#circleIcon',
                iconColor: point.task.statusColor || '#b6b6b6'
            }))
        })

        const bounds = yMap.geoObjects.getBounds()
        if (bounds) {
            yMap.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40, duration: 0 })
        }
    }

    onMounted(render)
    watch(() => props.routeId, render)

    onBeforeUnmount(() => {
        if (yMap) {
            try { yMap.destroy() } catch (e) {}
            yMap = null
        }
    })
</script>
