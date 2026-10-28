<template>
    <section class="section-table day-timeline">
        <div class="section-table__top">
            <div class="section-table__top-group section-table__top-title day-timeline__title">
                Распределённые задачи
                <span v-if="props.day?.shift" class="day-timeline__subtitle">
                    {{ props.day.shift.employee?.name || props.day.shift.name }}
                </span>
            </div>
            <div class="section-table__top-group">
                <AppShowMore
                    v-if="props.day?.shift"
                    :options="[{ name: 'Добавить задачу', action: 'add', enabled: true }]"
                    :isPreventBottom="true"
                    @initClick="addAtFreeSlot"
                />
            </div>
        </div>

        <div v-if="!props.day?.shift" class="day-timeline__empty">
            {{ props.loading ? 'Загрузка...' : 'Выберите рабочую смену' }}
        </div>

        <template v-else>
            <div class="day-timeline__head">
                <div class="day-timeline__head-time">Время</div>
                <div class="day-timeline__head-col">Задачи склада</div>
            </div>
            <div v-if="untimedTasks.length" class="day-timeline__untimed">
                <span class="day-timeline__untimed-label">Без времени:</span>
                <span
                    v-for="task in untimedTasks"
                    :key="task.id"
                    class="day-timeline__untimed-item"
                    @dblclick="emit('open', task.id)"
                >{{ task.name }}</span>
            </div>
            <div class="day-timeline__scroll" ref="scrollRef">
                <div class="day-timeline__body" :style="{ height: `${gridHeight}px` }">
                    <div class="day-timeline__hours">
                        <div
                            v-for="hour in hours"
                            :key="hour"
                            class="day-timeline__hour"
                            :style="{ top: `${(hour - rangeStart) * props.hourHeight}px` }"
                        >{{ String(hour).padStart(2, '0') }}:00</div>
                    </div>
                    <div
                        class="day-timeline__grid"
                        ref="gridRef"
                        :class="{ 'day-timeline__grid_dragging': !!drag }"
                        @dblclick.self="onGridDblClick"
                    >
                        <div
                            v-for="hour in hours"
                            :key="'line' + hour"
                            class="day-timeline__line"
                            :style="{ top: `${(hour - rangeStart) * props.hourHeight}px` }"
                        />
                        <div
                            v-for="hour in hours.slice(0, -1)"
                            :key="'half' + hour"
                            class="day-timeline__line day-timeline__line_half"
                            :style="{ top: `${(hour - rangeStart + 0.5) * props.hourHeight}px` }"
                        />
                        <div
                            v-for="(zone, index) in offZones"
                            :key="'off' + index"
                            class="day-timeline__off"
                            :style="zoneStyle(zone.start, zone.end)"
                        />
                        <div
                            v-if="breakZone"
                            class="day-timeline__break"
                            :style="zoneStyle(breakZone.start, breakZone.end)"
                        >
                            <span>Обед</span>
                            <span class="day-timeline__break-time">{{ toTime(breakZone.start) }}–{{ toTime(breakZone.end) }}</span>
                        </div>
                        <div
                            v-if="nowMinutes !== null"
                            class="day-timeline__now"
                            :style="{ top: `${toY(nowMinutes)}px` }"
                        />
                        <div
                            v-if="props.externalPreview"
                            class="day-timeline__preview"
                            :style="zoneStyle(props.externalPreview.start, props.externalPreview.start + props.externalPreview.duration)"
                        >
                            {{ toTime(props.externalPreview.start) }}–{{ toTime(props.externalPreview.start + props.externalPreview.duration) }}
                        </div>
                        <div
                            v-for="item in layout"
                            :key="item.task.id"
                            class="day-timeline__task"
                            :class="{
                                'day-timeline__task_active': item.task.id === activeId,
                                'day-timeline__task_dragging': drag?.id === item.task.id,
                                'day-timeline__task_short': item.end - item.start <= 30
                            }"
                            :style="taskStyle(item)"
                            :data-id="item.task.id"
                            @pointerdown="event => onTaskPointerDown(event, item, 'move')"
                            @dblclick.stop="emit('open', item.task.id)"
                        >
                            <div class="day-timeline__handle day-timeline__handle_top" @pointerdown.stop="event => onTaskPointerDown(event, item, 'start')" />
                            <div class="day-timeline__task-content">
                                <div class="day-timeline__task-name">{{ item.task.name }}</div>
                                <div class="day-timeline__task-time">{{ toTime(item.start) }}–{{ toTime(item.end) }}</div>
                            </div>
                            <AppShowMore
                                class="day-timeline__task-more"
                                :options="taskActions"
                                :isPreventBottom="true"
                                @initClick="action => onTaskAction(action, item.task)"
                            />
                            <div class="day-timeline__handle day-timeline__handle_bottom" @pointerdown.stop="event => onTaskPointerDown(event, item, 'end')" />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </section>
</template>

<script setup>
    import './DayTimeline.scss';
    import { format } from 'date-fns'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'

    const props = defineProps({
        day: { default: null, type: Object },
        loading: { default: false, type: Boolean },
        hourHeight: { default: 72, type: Number },
        externalPreview: { default: null, type: Object },
        defaultDuration: { default: 60, type: Number }
    })

    const emit = defineEmits(['schedule', 'create', 'open', 'unassign', 'remove'])

    const STEP = 15
    const scrollRef = ref(null)
    const gridRef = ref(null)
    const activeId = ref(null)
    const drag = ref(null)
    const nowTick = ref(Date.now())
    let nowTimer = null

    const taskActions = [
        { name: 'Открыть', action: 'open', enabled: true },
        { name: 'Убрать из смены', action: 'unassign', enabled: true },
        { name: 'Удалить', action: 'remove', enabled: true }
    ]

    const toMinutes = (value) => {
        const match = typeof value === 'string' ? value.match(/^\s*(\d{1,2})[:.](\d{2})/) : null
        if (!match) return null
        const minutes = Number(match[1]) * 60 + Number(match[2])
        return minutes >= 0 && minutes <= 1440 ? minutes : null
    }

    const toTime = (minutes) => {
        const value = Math.max(0, Math.min(1440, Math.round(minutes)))
        return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
    }

    const pxPerMinute = computed(() => props.hourHeight / 60)

    const shiftStart = computed(() => toMinutes(props.day?.shift?.start_time))
    const shiftEnd = computed(() => toMinutes(props.day?.shift?.end_time))

    const tasks = computed(() => (props.day?.tasks || []).map(task => {
        if (drag.value?.id === task.id) {
            return { task, start: drag.value.start, end: drag.value.end }
        }
        const start = toMinutes(task.start_time)
        let end = toMinutes(task.end_time)
        if (start === null) return { task, start: null, end: null }
        if (end === null || end <= start) end = start + (Number(task.duration) > 0 ? Number(task.duration) : props.defaultDuration)
        return { task, start, end: Math.min(end, 1440) }
    }))

    const timedTasks = computed(() => tasks.value.filter(item => item.start !== null))
    const untimedTasks = computed(() => tasks.value.filter(item => item.start === null).map(item => item.task))

    const rangeStart = computed(() => {
        const candidates = [7 * 60]
        if (shiftStart.value !== null) candidates.push(shiftStart.value)
        timedTasks.value.forEach(item => candidates.push(item.start))
        return Math.max(0, Math.floor(Math.min(...candidates) / 60))
    })

    const rangeEnd = computed(() => {
        const candidates = [20 * 60]
        if (shiftEnd.value !== null) candidates.push(shiftEnd.value)
        timedTasks.value.forEach(item => candidates.push(item.end))
        return Math.min(24, Math.ceil(Math.max(...candidates) / 60))
    })

    const hours = computed(() => {
        const list = []
        for (let hour = rangeStart.value; hour <= rangeEnd.value; hour++) list.push(hour)
        return list
    })

    const gridHeight = computed(() => (rangeEnd.value - rangeStart.value) * props.hourHeight)

    const toY = (minutes) => (minutes - rangeStart.value * 60) * pxPerMinute.value

    const zoneStyle = (start, end) => ({
        top: `${toY(start)}px`,
        height: `${Math.max(0, (end - start) * pxPerMinute.value)}px`
    })

    const offZones = computed(() => {
        const zones = []
        const from = rangeStart.value * 60
        const to = rangeEnd.value * 60
        if (shiftStart.value !== null && shiftStart.value > from) zones.push({ start: from, end: shiftStart.value })
        if (shiftEnd.value !== null && shiftEnd.value < to) zones.push({ start: shiftEnd.value, end: to })
        return zones
    })

    const breakZone = computed(() => {
        const start = toMinutes(props.day?.shift?.break_start)
        const end = toMinutes(props.day?.shift?.break_end)
        return start !== null && end !== null && end > start ? { start, end } : null
    })

    const nowMinutes = computed(() => {
        const date = props.day?.shift?.shift_date
        if (!date) return null
        const now = new Date(nowTick.value)
        if (String(date).slice(0, 10) !== format(now, 'yyyy-MM-dd')) return null
        const minutes = now.getHours() * 60 + now.getMinutes()
        return minutes >= rangeStart.value * 60 && minutes <= rangeEnd.value * 60 ? minutes : null
    })

    const layout = computed(() => {
        const items = [...timedTasks.value].sort((a, b) => a.start - b.start || b.end - a.end || a.task.id - b.task.id)
        const result = []
        let cluster = []
        let columns = []
        let clusterEnd = -1

        const flush = () => {
            const count = columns.length || 1
            cluster.forEach(item => result.push({ ...item, columns: count }))
            cluster = []
            columns = []
            clusterEnd = -1
        }

        items.forEach(item => {
            if (cluster.length && item.start >= clusterEnd) flush()
            let column = columns.findIndex(end => end <= item.start)
            if (column === -1) {
                column = columns.length
                columns.push(item.end)
            } else {
                columns[column] = item.end
            }
            cluster.push({ ...item, column })
            clusterEnd = Math.max(clusterEnd, item.end)
        })
        flush()
        return result
    })

    const taskStyle = (item) => ({
        top: `${toY(item.start)}px`,
        height: `${Math.max(STEP * pxPerMinute.value, (item.end - item.start) * pxPerMinute.value) - 2}px`,
        left: `calc(${(item.column / item.columns) * 100}% + 2px)`,
        width: `calc(${100 / item.columns}% - 4px)`,
        '--taskColor': item.task.status?.color || '#1e88e5'
    })

    const snap = (minutes) => Math.round(minutes / STEP) * STEP

    const minutesAtClientY = (clientY) => {
        const rect = gridRef.value?.getBoundingClientRect()
        if (!rect) return null
        return rangeStart.value * 60 + (clientY - rect.top) / pxPerMinute.value
    }

    const getDropMinutes = (clientX, clientY, duration = props.defaultDuration) => {
        const scrollRect = scrollRef.value?.getBoundingClientRect()
        if (!scrollRect || !props.day?.shift) return null
        if (clientX < scrollRect.left || clientX > scrollRect.right || clientY < scrollRect.top || clientY > scrollRect.bottom) return null
        const raw = minutesAtClientY(clientY)
        if (raw === null) return null
        const start = snap(raw - STEP)
        return Math.max(rangeStart.value * 60, Math.min(start, rangeEnd.value * 60 - duration))
    }

    defineExpose({ getDropMinutes })

    const onGridDblClick = (event) => {
        const raw = minutesAtClientY(event.clientY)
        if (raw === null) return
        const start = Math.floor(raw / STEP) * STEP
        const end = Math.min(start + props.defaultDuration, 1440)
        emit('create', { start: toTime(start), end: toTime(end) })
    }

    const addAtFreeSlot = () => {
        const busyEnd = timedTasks.value.reduce((max, item) => Math.max(max, item.end), shiftStart.value ?? 9 * 60)
        const start = Math.min(busyEnd, 1440 - props.defaultDuration)
        emit('create', { start: toTime(start), end: toTime(start + props.defaultDuration) })
    }

    const onTaskAction = (action, task) => {
        if (action === 'open') emit('open', task.id)
        if (action === 'unassign') emit('unassign', task.id)
        if (action === 'remove') emit('remove', task.id)
    }

    let pointerState = null

    const onTaskPointerDown = (event, item, mode) => {
        if (event.button !== undefined && event.button !== 0) return
        if (event.target.closest('.show-more, .popup')) return
        activeId.value = item.task.id
        pointerState = {
            id: item.task.id,
            mode,
            originY: event.clientY,
            start: item.start,
            end: item.end,
            moved: false
        }
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointercancel', onPointerUp)
    }

    const onPointerMove = (event) => {
        if (!pointerState) return
        const dy = event.clientY - pointerState.originY
        if (!pointerState.moved && Math.abs(dy) < 4) return
        pointerState.moved = true
        event.preventDefault()
        const delta = snap(dy / pxPerMinute.value)
        const min = rangeStart.value * 60
        const max = rangeEnd.value * 60
        let { start, end } = pointerState
        if (pointerState.mode === 'move') {
            const length = end - start
            start = Math.max(min, Math.min(start + delta, max - length))
            end = start + length
        } else if (pointerState.mode === 'start') {
            start = Math.max(min, Math.min(start + delta, end - STEP))
        } else {
            end = Math.min(max, Math.max(end + delta, start + STEP))
        }
        drag.value = { id: pointerState.id, start, end }
    }

    const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
        const state = pointerState
        const result = drag.value
        pointerState = null
        if (!state?.moved || !result) {
            drag.value = null
            return
        }
        if (result.start === state.start && result.end === state.end) {
            drag.value = null
            return
        }
        const task = props.day?.tasks?.find(t => t.id === result.id)
        if (task) {
            task.start_time = toTime(result.start)
            task.end_time = toTime(result.end)
            task.duration = result.end - result.start
        }
        drag.value = null
        emit('schedule', { id: result.id, start: toTime(result.start), end: toTime(result.end) })
    }

    watch(() => props.day?.shift?.id, () => {
        activeId.value = null
        nextTick(() => {
            if (!scrollRef.value) return
            const target = shiftStart.value ?? 9 * 60
            scrollRef.value.scrollTop = Math.max(0, toY(target) - props.hourHeight / 2)
        })
    })

    onMounted(() => {
        nowTimer = setInterval(() => { nowTick.value = Date.now() }, 60000)
    })

    onBeforeUnmount(() => {
        clearInterval(nowTimer)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
    })
</script>
