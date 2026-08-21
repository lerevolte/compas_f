<template>
    <div class="form__item form__item_geoposition geoposition">
        <div class="geoposition__status">
            <span class="geoposition__indicator" :class="isOnline ? 'geoposition__indicator_online' : 'geoposition__indicator_offline'"></span>
            <span class="geoposition__text">{{ statusText }}</span>
        </div>

        <MapFrame
            v-if="coords"
            :points="[coords]"
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

    const statusText = computed(() => {
        if (!value.value) {
            return 'Геопозиция не передавалась'
        }
        if (!lastTime.value) {
            return 'Последняя геопозиция получена'
        }
        const date = new Date(lastTime.value)
        const pad = n => String(n).padStart(2, '0')
        const text = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
        return `Последняя геопозиция: ${text}`
    })
</script>
