<template>
    <div class="form__item form__item_geoposition geoposition">
        <span class="blank__title geoposition__label">Геопозиция</span>

        <MapFrame
            :points="coords ? [coords] : []"
            :markerContent="markerHtml"
            :markerOffset="[-22, -22]"
            :options="{ defaultZoom: 14 }"
        />
    </div>
</template>

<script setup>
    import './Geoposition.scss';
    import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
    import MapFrame from '@AppComponents/Inputs/Map/Frame.vue'
    import api from '@/helpers/api.js'

    const props = defineProps({
        options: {
            default: () => ({}),
            type: Object
        },
        pageId: {
            default: null
        }
    })

    const POLL_INTERVAL = 30000

    const now = ref(Date.now())
    const live = ref(null)
    let timer = null
    let pollTimer = null
    let polling = false

    const parse = raw => {
        if (typeof raw == 'string' && raw.length) {
            try {
                raw = JSON.parse(raw)
            } catch (e) {
                raw = null
            }
        }
        return raw && typeof raw == 'object' && raw.lat != null && raw.lng != null ? raw : null
    }

    const poll = async () => {
        if (polling || !props.pageId || typeof document != 'undefined' && document.hidden) {
            return
        }
        polling = true
        try {
            const response = await api.callMethod('GET', `/users/${props.pageId}/geoposition`)
            const next = parse(response.data?.geoposition)
            if (next && (!live.value || Number(next.time) != Number(live.value.time) || next.lat != live.value.lat || next.lng != live.value.lng)) {
                live.value = next
            }
            now.value = Date.now()
        } catch (e) {
            console.log('geoposition', e)
        } finally {
            polling = false
        }
    }

    const onVisibility = () => {
        if (typeof document != 'undefined' && !document.hidden) {
            poll()
        }
    }

    onMounted(() => {
        timer = setInterval(() => {
            now.value = Date.now()
        }, 60000)
        pollTimer = setInterval(poll, POLL_INTERVAL)
        if (typeof document != 'undefined') {
            document.addEventListener('visibilitychange', onVisibility)
        }
    })

    onBeforeUnmount(() => {
        if (timer) {
            clearInterval(timer)
        }
        if (pollTimer) {
            clearInterval(pollTimer)
        }
        if (typeof document != 'undefined') {
            document.removeEventListener('visibilitychange', onVisibility)
        }
    })

    const value = computed(() => live.value || parse(props.options?.value))

    const coords = computed(() => value.value ? [Number(value.value.lat), Number(value.value.lng)] : null)

    const lastTime = computed(() => {
        const time = Number(value.value?.time)
        return Number.isFinite(time) && time > 0 ? time : null
    })

    const isOnline = computed(() => lastTime.value != null && now.value - lastTime.value <= 5 * 60 * 1000)

    const timeText = computed(() => {
        if (!lastTime.value) {
            return ''
        }
        const date = new Date(lastTime.value)
        const pad = n => String(n).padStart(2, '0')
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    })

    const markerHtml = computed(() => {
        if (!coords.value) {
            return ''
        }
        const state = isOnline.value ? 'current-geo-marker_online' : 'current-geo-marker_offline'
        const time = timeText.value ? `<span class="current-geo-marker__time">${timeText.value}</span>` : ''
        return `<div class="current-geo-marker ${state}"><div class="current-geo-marker__pulse"></div><div class="current-geo-marker__dot"></div>${time}</div>`
    })
</script>
