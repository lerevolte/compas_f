<template>
    <div class="form__item form__item_geoposition geoposition">
        <span class="blank__title geoposition__label">Геопозиция</span>

        <MapFrame
            :points="coords ? [coords] : []"
            :markerContent="markerHtml"
            :options="{ defaultZoom: 14 }"
        />
    </div>
</template>

<script setup>
    import './Geoposition.scss';
    import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
    import MapFrame from '@AppComponents/Inputs/Map/Frame.vue'

    const props = defineProps({
        options: {
            default: () => ({}),
            type: Object
        }
    })

    const now = ref(Date.now())
    let timer = null

    onMounted(() => {
        timer = setInterval(() => {
            now.value = Date.now()
        }, 60000)
    })

    onBeforeUnmount(() => {
        if (timer) {
            clearInterval(timer)
        }
    })

    const value = computed(() => {
        let raw = props.options?.value
        if (typeof raw == 'string' && raw.length) {
            try {
                raw = JSON.parse(raw)
            } catch (e) {
                raw = null
            }
        }
        return raw && typeof raw == 'object' && raw.lat != null && raw.lng != null ? raw : null
    })

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
        const color = isOnline.value ? '#27AE60' : '#B3B3B3'
        const time = timeText.value ? `<span class="geo-popup__time">${timeText.value}</span>` : ''
        return `<div class="geo-popup"><div class="geo-popup__main"><span class="geo-popup__counter"></span><span class="geo-popup__status" style="background: ${color}"></span>${time}</div></div>`
    })
</script>
