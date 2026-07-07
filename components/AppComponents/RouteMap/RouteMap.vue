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
    import '@AppTemplates/Logistic/Map/LogisticMap.scss'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'

    const props = defineProps({
        routeId: {
            default: null,
            type: [Number, String]
        },
        options: {
            default: () => ({}),
            type: Object
        },
        // Внешняя ссылка: routeId = токен, данные берём через публичные
        // endpoints external/{token}/route-tasks и /route-map (без auth).
        isExternal: {
            default: false,
            type: Boolean
        }
    })

    const mapContainer = ref(null)
    let L = null
    let map = null
    let baseLayer = null
    let taskMarkers = []
    let groupedMarkers = []
    let routeLines = []
    let serviceRadiusCircle = null
    let activeMarkerElement = null

    const extractValue = (raw) => {
        if (raw == null) return ''
        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return String(raw.value ?? raw.text ?? '')
        }
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw)
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return String(parsed.value ?? parsed.text ?? '')
                }
            } catch (e) {}
            return raw
        }
        return String(raw)
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
                    return { text: addr.text || '', coords: [lat, lng] }
                }
            }
        } catch (e) {}
        return null
    }

    const toStrokeColor = (color) => {
        if (!color || typeof color !== 'string') return '#b6b6b6'
        const c = color.trim()
        if (/^(#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(c)) return c
        if (/^[a-z]+$/i.test(c)) return c
        const m = c.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/i)
        return m ? m[0] : '#b6b6b6'
    }

    const toRouteColor = (color) => {
        const raw = typeof color === 'string' ? color.trim() : ''
        return /^(#|rgb|hsl|linear)/.test(raw) ? raw : '#b6b6b6'
    }

    const loadYandexMapsAPI = () => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined') { resolve(); return }
            if (window.ymaps && typeof window.ymaps.ready === 'function') { resolve(); return }
            if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
                const check = setInterval(() => {
                    if (window.ymaps && typeof window.ymaps.ready === 'function') { clearInterval(check); resolve() }
                }, 100)
                setTimeout(() => { clearInterval(check); resolve() }, 10000)
                return
            }
            const script = document.createElement('script')
            script.src = 'https://api-maps.yandex.ru/2.1/?apikey=10946c08-3ea9-4fac-95d1-c833ee44dd6b&suggest_apikey=ac70b70c-5e2e-4a1e-9d90-a66aa3b11ddd&lang=ru_RU'
            script.onload = () => setTimeout(resolve, 200)
            script.onerror = () => resolve()
            document.head.appendChild(script)
        })
    }

    const loadLeaflet = async () => {
        if (L) return
        const leafletModule = await import('leaflet')
        L = leafletModule.default
        await import('leaflet/dist/leaflet.css')
        if (typeof window !== 'undefined') window.L = L
        await loadYandexMapsAPI()
        await import('@AppComponents/Inputs/Map/Yandex.js')
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

    const handleMarkerClick = (el) => {
        const root = mapContainer.value
        if (!el || !root) return
        if (activeMarkerElement && activeMarkerElement !== el) activeMarkerElement.style.zIndex = ''
        el.style.zIndex = 1000
        activeMarkerElement = el
        root.querySelectorAll('.marker-selected').forEach(m => { if (m !== el) m.classList.remove('marker-selected') })
        el.classList.add('marker-selected')
        const ext = el.querySelector('.route-popup__extend')
        root.querySelectorAll('.route-popup__extend.active').forEach(e => { if (e !== ext) e.classList.remove('active') })
        if (ext) ext.classList.add('active')
    }

    const bindClusterEvents = (el) => {
        if (!el) return
        el.querySelectorAll('.cluster-point').forEach(ci => {
            ci.onclick = (ev) => {
                ev.stopPropagation()
                el.querySelectorAll('.cluster-point.active').forEach(i => i.classList.remove('active'))
                ci.classList.add('active')
            }
        })
    }

    const showServiceRadius = (latlng, color) => {
        if (serviceRadiusCircle) { map.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null }
        const strokeColor = toStrokeColor(color)
        serviceRadiusCircle = L.circle(latlng, {
            radius: 500,
            color: strokeColor,
            fillColor: strokeColor,
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '5,5'
        }).addTo(map)
    }

    const createTaskMarkers = (points, routeColor) => {
        points.forEach((point, index) => {
            const task = point.task
            const planTime = extractValue(task.plan_time)
            const statusColor = task.statusColor || '#ccc'
            const taskName = extractValue(task.name)
            const order = index + 1

            const html = `
                <div class="route-popup">
                    <div class="route-popup__main" style="border-color: ${routeColor}">
                        <span class="route-popup__counter" style="background: ${routeColor}; --route-color: ${routeColor}">${order}</span>
                        <span class="route-popup__status" style="background: ${statusColor}"></span>
                        <span class="route-popup__time">${planTime}</span>
                    </div>
                    <div class="route-popup__extend">
                        <div class="point-attrs">
                            <span class="point-attrs__item point-attrs__item_title"><span class="point-attrs__label">Название:</span><span class="point-attrs__val point-attrs__val_title">${taskName}</span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">Статус точки:</span><span class="point-attrs__val"><span class="route-popup__status route-popup__status_inline" style="background: ${statusColor}"></span></span></span>
                            <span class="point-attrs__item"><span class="point-attrs__label">План. время:</span><span class="point-attrs__val">${planTime}</span></span>
                        </div>
                    </div>
                </div>`

            const marker = L.marker(point.coords, {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [13, 13], popupAnchor: [0, -40] }),
                zIndexOffset: 1000
            }).addTo(map)

            marker._taskId = task.id
            marker._addrText = point.text || ''
            marker._info = { id: task.id, order, planTime, statusColor }
            marker.on('click', () => {
                const el = marker.getElement()
                if (el) handleMarkerClick(el)
                showServiceRadius(marker.getLatLng(), routeColor)
            })
            taskMarkers.push(marker)
        })
    }

    const renderClusterPoint = (info) => {
        return `<div class="cluster-point" data-task-id="${info.id}" data-type="route">
            <span class="route-popup__status route-popup__status_inline" style="background:${info.statusColor}"></span>
            <span class="cluster-point__order">${info.order}.</span>
            <span class="cluster-point__time">${info.planTime}</span>
        </div>`
    }

    const groupOverlappingMarkers = (routeColor) => {
        groupedMarkers.forEach(m => map.removeLayer(m))
        groupedMarkers = []

        const allMarkers = taskMarkers.map(m => ({
            marker: m,
            info: m._info,
            addrText: m._addrText,
            lat: m.getLatLng().lat,
            lng: m.getLatLng().lng
        }))

        const PROXIMITY_M = 50
        const normAddr = (t) => t ? String(t).trim().toLowerCase().replace(/\s+/g, ' ') : ''
        const clusters = []
        allMarkers.forEach(item => {
            const itemText = normAddr(item.addrText)
            let target = null
            for (const c of clusters) {
                const sameText = itemText && c.text && itemText === c.text
                const near = L.latLng(c.lat, c.lng).distanceTo(L.latLng(item.lat, item.lng)) <= PROXIMITY_M
                if (sameText || near) { target = c; break }
            }
            if (target) {
                target.items.push(item)
            } else {
                clusters.push({ lat: item.lat, lng: item.lng, text: itemText, items: [item] })
            }
        })

        clusters.forEach(cluster => {
            const group = cluster.items
            if (group.length <= 1) return

            group.forEach(item => map.removeLayer(item.marker))

            const extendHtml = `<div class="cluster-list">${group.map(i => renderClusterPoint(i.info)).join('')}</div>`
            const count = group.length

            const isGradient = typeof routeColor === 'string' && /gradient\(/i.test(routeColor)
            const glyph = '/img/cluster-route.svg'
            const style = isGradient
                ? `background-image: url('${glyph}'), ${routeColor}; background-size: 15%, cover; background-position: center, center; background-repeat: no-repeat, no-repeat;`
                : `background-image: url('${glyph}'); background-size: 15%; background-position: center; background-repeat: no-repeat; background-color: ${routeColor};`

            const html = `<div class="route-popup cluster-popup cluster-popup_route">
                <div class="route-popup__main cluster-marker">
                    <span class="cluster-marker__icon" style="${style}"></span>
                    <span class="cluster-marker__count">${count}</span>
                </div>
                <div class="route-popup__extend cluster-extend">${extendHtml}</div>
            </div>`

            const combined = L.marker([group[0].lat, group[0].lng], {
                icon: L.divIcon({ className: 'custom-div-icon', html, iconAnchor: [12, 12] }),
                zIndexOffset: 1100
            }).addTo(map)

            combined.on('click', () => {
                const el = combined.getElement()
                if (el) handleMarkerClick(el)
                showServiceRadius(combined.getLatLng(), routeColor)
                setTimeout(() => bindClusterEvents(el), 50)
            })

            groupedMarkers.push(combined)
        })
    }

    const clearLayers = () => {
        if (!map) return
        taskMarkers.forEach(m => map.removeLayer(m))
        taskMarkers = []
        groupedMarkers.forEach(m => map.removeLayer(m))
        groupedMarkers = []
        routeLines.forEach(l => map.removeLayer(l))
        routeLines = []
        if (serviceRadiusCircle) { map.removeLayer(serviceRadiusCircle); serviceRadiusCircle = null }
        activeMarkerElement = null
    }

    const initMap = (center) => {
        if (map) return
        map = L.map(mapContainer.value, { center, zoom: 10, zoomControl: true, minZoom: 3, maxZoom: 18, doubleClickZoom: false })

        const origAnimateZoom = L.Marker.prototype._animateZoom
        if (origAnimateZoom && !L.Marker.prototype._animateZoomPatched) {
            L.Marker.prototype._animateZoom = function(opt) {
                if (!this._map) return
                origAnimateZoom.call(this, opt)
            }
            L.Marker.prototype._animateZoomPatched = true
        }

        if (window.ymaps && L.yandex) {
            baseLayer = L.yandex({ suppressMapOpenBlock: true, suppressObsoleteBrowserNotifier: true })
            baseLayer.addTo(map)
            window.ymaps.ready(() => setTimeout(() => {
                if (baseLayer?._yandex) {
                    try {
                        baseLayer._yandex.events.add('click', (e) => e.preventDefault())
                        baseLayer._yandex.panes.get('events').getElement().style.pointerEvents = 'none'
                    } catch (e) {}
                }
            }, 500))
        } else {
            baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
            baseLayer.addTo(map)
        }
    }

    const render = async () => {
        if (!props.routeId || typeof window === 'undefined') return

        let tasks = []
        let routeColor = '#b6b6b6'
        const tasksUrl = props.isExternal
            ? routes.external_link.route_tasks.replace('${token}', props.routeId)
            : `/routes/${props.routeId}/tasks`
        const mapUrl = props.isExternal
            ? routes.external_link.route_map.replace('${token}', props.routeId)
            : `/routes/${props.routeId}/map_data`
        try {
            const response = await api.callMethod('GET', tasksUrl)
            tasks = response.data?.data || []
        } catch (e) {
            console.log('route-map tasks', e)
        }
        try {
            const response = await api.callMethod('GET', mapUrl)
            routeColor = toRouteColor(response.data?.color)
        } catch (e) {}

        const points = tasks
            .map(task => {
                const parsed = parseAddress(task.address)
                return parsed ? { task, coords: parsed.coords, text: parsed.text } : null
            })
            .filter(Boolean)

        try {
            await loadLeaflet()
        } catch (e) {
            console.log('route-map leaflet', e)
            return
        }
        if (!mapContainer.value) return

        if (window.ymaps) {
            await new Promise(resolve => window.ymaps.ready(resolve))
        }

        initMap(points[0]?.coords ?? [55.755864, 37.617698])
        clearLayers()

        if (points.length === 0) return

        if (points.length > 1) {
            const geometry = await fetchRouteGeometry(points.map(p => p.coords))
            const lineCoords = geometry ?? points.map(p => p.coords)
            routeLines.push(L.polyline(lineCoords, { color: toStrokeColor(routeColor), opacity: 0.8, weight: 5 }).addTo(map))
        }

        createTaskMarkers(points, routeColor)
        groupOverlappingMarkers(routeColor)

        const bounds = L.latLngBounds(points.map(p => p.coords))
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], animate: false, maxZoom: 16 })
        }
    }

    onMounted(render)
    watch(() => props.routeId, render)

    onBeforeUnmount(() => {
        if (map) {
            try { map.remove() } catch (e) {}
            map = null
        }
    })
</script>
