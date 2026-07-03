<template>
    <div class="form__item form__item_route-statuses">
        <span class="blank__title" v-if="props.options?.title && props.options.title != ''">
            {{ props.options.title }}
        </span>

        <div class="route-statuses" v-if="tasks.length > 0">
            <div
                class="route-statuses__segment"
                v-for="task in tasks"
                :key="task.id"
                :style="{ background: task.statusColor || '#cccccc' }"
                :title="taskTitle(task)"
            ></div>
        </div>
        <div class="route-statuses" v-else>
            <div class="route-statuses__segment" :title="loading ? 'Загрузка…' : 'Нет задач'"></div>
        </div>
    </div>
</template>

<script setup>
    import './RouteStatuses.scss'

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

    const tasks = ref([])
    const loading = ref(false)

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

    const load = async () => {
        if (!props.routeId) return
        loading.value = true
        try {
            const response = await api.callMethod('GET', `/routes/${props.routeId}/tasks`)
            tasks.value = response.data?.data || []
        } catch (e) {
            console.log('route-statuses', e)
            tasks.value = []
        } finally {
            loading.value = false
        }
    }

    onMounted(load)
    watch(() => props.routeId, load)
</script>
