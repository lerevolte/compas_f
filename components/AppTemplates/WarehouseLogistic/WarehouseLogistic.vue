<template>
    <div v-if="config && !config.ready" class="warehouse-logistic__not-ready">
        Складская логистика не установлена на этом портале
    </div>
    <div v-else class="warehouse-logistic">
        <div class="warehouse-logistic__column">
            <AppResize
                :options="{ height: `${layout.timeline}px`, width: '100%' }"
                @endResize="height => saveHeight('timeline', height)"
            >
                <DayTimeline
                    ref="timelineRef"
                    :day="day"
                    :loading="dayLoading"
                    :externalPreview="dropPreview"
                    :defaultDuration="config?.default_duration || 60"
                    @schedule="onSchedule"
                    @create="onCreateTask"
                    @open="openTask"
                    @unassign="onUnassign"
                    @remove="onRemove"
                />
            </AppResize>
        </div>
        <div class="warehouse-logistic__column">
            <AppResize
                :options="{ height: `${layout.shifts}px`, width: '100%' }"
                @endResize="height => saveHeight('shifts', height)"
            >
                <AppVirtualTable
                    :ref="el => shiftsTableComp = el || null"
                    :slug="'work_shifts'"
                    :key="'work_shifts'"
                    :showMore="[{ name: 'Создать смену', action: 'initCreateRoute', enabled: true }]"
                    :options="{
                        title: 'Рабочая смена',
                        isHaveQuery: true,
                        query: { shift_date: dateKey },
                        isShort: true,
                        isEnableCreateOption: false,
                        isHaveFilter: false,
                        isDisableSockets: false,
                        isPermanentEdit: false,
                        isCheckClicked: true,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: false,
                        isDisablePull: true,
                        isDisablePut: true,
                        isDisableSort: false,
                        isCellCopy: true,
                        updatingCount: shiftsUpdating
                    }"
                    @getData="onShiftsLoaded"
                    @openModal="item => emit('openModal', item)"
                    @choseRow="row => selectShift(row?.id)"
                    @initCreateRoute="shiftModal.state = true"
                    @deletedRows="onShiftsDeleted"
                />
            </AppResize>
            <AppResize
                :options="{ height: `${layout.tasks}px`, width: '100%' }"
                @endResize="height => saveHeight('tasks', height)"
            >
                <div class="warehouse-logistic__tasks">
                    <AppVirtualTable
                        v-if="tab === 'tasks'"
                        :ref="el => tasksTableComp = el || null"
                        :slug="'warehouse_tasks'"
                        :key="'warehouse_tasks'"
                        :options="{
                            title: 'Задачи склада',
                            isHaveQuery: true,
                            query: { task_date: dateKey, work_shift_id: 'null', per_page: 500 },
                            ...dragOptions('warehouse_tasks_dnd'),
                            updatingCount: tasksUpdating
                        }"
                        @getData="scheduleDayReload"
                        @openModal="item => emit('openModal', { ...item, slug: item.slug || 'warehouse_tasks' })"
                    >
                        <template #topTitle>
                            <span class="logistic-tabs">
                                <span class="logistic-tabs__tab logistic-tabs__tab_active">Задачи склада</span>
                                <span v-if="hasWarehouses" class="logistic-tabs__tab" @click="tab = 'warehouses'">Быстрые задачи</span>
                            </span>
                        </template>
                    </AppVirtualTable>
                    <AppVirtualTable
                        v-if="tab === 'warehouses'"
                        :slug="'warehouses'"
                        :key="'warehouses'"
                        :options="{
                            title: 'Быстрые задачи',
                            ...dragOptions('warehouses_wl_dnd')
                        }"
                        @openModal="item => emit('openModal', { ...item, slug: 'warehouses' })"
                    >
                        <template #topTitle>
                            <span class="logistic-tabs">
                                <span class="logistic-tabs__tab" @click="tab = 'tasks'">Задачи склада</span>
                                <span class="logistic-tabs__tab logistic-tabs__tab_active">Быстрые задачи</span>
                            </span>
                        </template>
                    </AppVirtualTable>
                </div>
            </AppResize>
        </div>

        <teleport to="#menu__overlay" v-if="shiftModal.state">
            <ShiftModal
                :config="config"
                :loading="shiftModal.loading"
                @close="shiftModal.state = false"
                @create="createShift"
            />
        </teleport>
    </div>
</template>

<script setup>
    import './WarehouseLogistic.scss';
    import '@AppTemplates/Logistic/Logistic.scss';
    import { format } from 'date-fns'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common } from '@AppHelpers/classes.js'
    import { useMenuStore } from '@/stores/menuStore.js'
    import AppResize from '@AppComponents/Resize/Resize.vue'
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue'
    import DayTimeline from './DayTimeline/DayTimeline.vue'
    import ShiftModal from './ShiftModal/ShiftModal.vue'

    const props = defineProps({
        activeDate: { default: null, type: [String, Date] }
    })

    const emit = defineEmits(['openModal'])

    const LAYOUT_KEY = 'warehouse_logistic_layout'
    const common = new Common()
    const socket = inject('socket', null)
    const menuStore = useMenuStore()

    const config = ref(null)
    const day = ref(null)
    const dayLoading = ref(false)
    const selectedShiftId = ref(null)
    const shiftsUpdating = ref(0)
    const tasksUpdating = ref(0)
    const tab = ref('tasks')
    const dropPreview = ref(null)
    const timelineRef = ref(null)
    const shiftModal = reactive({ state: false, loading: false })
    let shiftsTableComp = null
    let tasksTableComp = null

    const layout = reactive({ timeline: 720, shifts: 300, tasks: 405 })

    const saveHeight = (key, height) => {
        layout[key] = height
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ ...layout })) } catch (e) {}
    }

    const dateKey = computed(() => {
        const value = props.activeDate || new Date()
        return typeof value === 'string' ? value.slice(0, 10) : format(value, 'yyyy-MM-dd')
    })

    const hasWarehouses = computed(() => {
        const scan = (items) => Array.isArray(items) && items.some(it => {
            if (!it) return false
            if (it.slug === 'warehouses') return true
            if (typeof it.link === 'string' && it.link.includes('/objects/warehouses')) return true
            return scan(it.children) || scan(it.childs) || scan(it.items)
        })
        return scan(menuStore.list)
    })

    const dragOptions = (group) => ({
        isShort: true,
        overscan: 5,
        isDraggable: true,
        draggableTarget: '.table__row',
        dragFilter: 'input, textarea, select, [contenteditable]',
        dragDelay: 150,
        dragDelayOnTouchOnly: true,
        touchStartThreshold: 15,
        isCellCopy: true,
        group,
        isDisablePut: true,
        isDisablePull: true,
        isDisableSort: true,
        isCheckClicked: true,
        isDisableSockets: false,
        isHaveFilter: false,
        isPermanentEdit: false,
        isTrash: false,
        isHaveTopHeader: true,
        isHaveFooter: false
    })

    const getTableBody = (comp) => {
        const t = comp?.table
        const inst = (t && typeof t === 'object' && 'value' in t && !Array.isArray(t.body)) ? t.value : t
        return Array.isArray(inst?.body) ? inst.body : null
    }

    const markShiftRow = (id) => {
        const body = getTableBody(shiftsTableComp)
        if (!body) return
        for (const row of body) {
            if (!row) continue
            const isMatch = id != null && Number(row.id) === Number(id)
            if (!!row.clicked !== isMatch) row.clicked = isMatch
        }
    }

    const notifyError = (response, fallback) => {
        common.showNotification({ title: 'Складская логистика', description: response?.data?.message || fallback }, 'error')
    }

    const loadConfig = async () => {
        const response = await api.callMethod('GET', routes.warehouseLogistic.config)
        config.value = response?.status == 200 ? response.data : { ready: false }
    }

    let daySeq = 0
    const loadDay = async (quiet = false) => {
        const id = selectedShiftId.value
        const seq = ++daySeq
        if (!id) {
            day.value = null
            return
        }
        if (!quiet) dayLoading.value = true
        const response = await api.callMethod('GET', routes.warehouseLogistic.shift.replace('${id}', id))
        if (seq !== daySeq) return
        dayLoading.value = false
        day.value = response?.status == 200 ? response.data : null
    }

    let reloadTimer = null
    const scheduleDayReload = () => {
        clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => loadDay(true), 300)
    }

    const selectShift = (id) => {
        const value = id ? Number(id) : null
        markShiftRow(value)
        if (value === selectedShiftId.value) return
        selectedShiftId.value = value
        loadDay()
    }

    const onShiftsLoaded = (rows) => {
        const list = Array.isArray(rows) ? rows : []
        const current = list.find(row => Number(row?.id) === Number(selectedShiftId.value))
        if (current) {
            markShiftRow(current.id)
            scheduleDayReload()
            return
        }
        selectedShiftId.value = null
        selectShift(list[0]?.id ?? null)
        if (!list.length) day.value = null
    }

    const onShiftsDeleted = (ids) => {
        if ((ids || []).map(Number).includes(Number(selectedShiftId.value))) {
            selectedShiftId.value = null
            day.value = null
        }
        shiftsUpdating.value++
    }

    const createShift = async (content) => {
        shiftModal.loading = true
        const response = await api.callMethod('POST', routes.warehouseLogistic.createShift, { ...content, date: dateKey.value })
        shiftModal.loading = false
        if (response?.status != 200) {
            notifyError(response, 'Не удалось создать смену')
            return
        }
        shiftModal.state = false
        selectedShiftId.value = null
        if (response.data?.id) selectShift(response.data.id)
        shiftsUpdating.value++
    }

    const refreshAll = () => {
        loadDay(true)
        tasksUpdating.value++
    }

    const schedule = async (id, payload) => {
        const response = await api.callMethod('PUT', routes.warehouseLogistic.scheduleTask.replace('${id}', id), payload)
        if (response?.status != 200) notifyError(response, 'Не удалось изменить задачу')
        refreshAll()
    }

    const onSchedule = ({ id, start, end }) => {
        schedule(id, { work_shift_id: selectedShiftId.value, start_time: start, end_time: end })
    }

    const onUnassign = (id) => {
        schedule(id, { work_shift_id: null, start_time: null, end_time: null })
    }

    const onRemove = async (id) => {
        await api.callMethod('DELETE', routes.table.delete.replace('${slug}', 'warehouse_tasks'), { ids: [id] })
        refreshAll()
    }

    const openTask = (id) => {
        emit('openModal', { id, slug: 'warehouse_tasks' })
    }

    const onCreateTask = async ({ start, end }) => {
        if (!selectedShiftId.value) return
        const response = await api.callMethod('POST', routes.warehouseLogistic.createTask, {
            work_shift_id: selectedShiftId.value,
            start_time: start,
            end_time: end
        })
        if (response?.status != 200) {
            notifyError(response, 'Не удалось создать задачу')
            return
        }
        await loadDay(true)
        if (response.data?.id) openTask(response.data.id)
    }

    let dragged = null

    const rowDuration = (id) => {
        const row = (getTableBody(tasksTableComp) || []).find(r => Number(r?.id) === Number(id))
        const value = Number(String(row?.duration ?? '').replace(/[^\d]/g, ''))
        return value > 0 ? Math.min(value, 12 * 60) : (config.value?.default_duration || 60)
    }

    const onGlobalDown = (e) => {
        const row = e.target?.closest?.('.warehouse-logistic__tasks .table__row')
        if (!row || row.closest('.table__header')) return
        const id = Number(row.getAttribute('data-id'))
        if (!id) return
        const source = tab.value
        dragged = { id, source, duration: source === 'tasks' ? rowDuration(id) : (config.value?.default_duration || 60) }
    }

    const onGlobalMove = (e) => {
        if (!dragged || !document.body.classList.contains('body_unselected')) return
        const start = timelineRef.value?.getDropMinutes?.(e.clientX, e.clientY, dragged.duration)
        if (start === null || start === undefined) {
            if (dropPreview.value) dropPreview.value = null
            return
        }
        if (dropPreview.value?.start !== start) dropPreview.value = { start, duration: dragged.duration }
    }

    const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

    const onGlobalUp = async () => {
        const item = dragged
        const preview = dropPreview.value
        dragged = null
        dropPreview.value = null
        if (!item || !preview || !selectedShiftId.value) return
        const start = toTime(preview.start)
        if (item.source === 'warehouses') {
            const response = await api.callMethod('POST', routes.warehouseLogistic.taskFromWarehouse, {
                warehouse_id: item.id,
                work_shift_id: selectedShiftId.value,
                start_time: start
            })
            if (response?.status != 200) notifyError(response, 'Не удалось создать задачу')
            refreshAll()
            return
        }
        schedule(item.id, {
            work_shift_id: selectedShiftId.value,
            start_time: start,
            end_time: toTime(Math.min(preview.start + preview.duration, 1440))
        })
    }

    const onTouchStart = (e) => onGlobalDown({ target: e.target })
    const onTouchMove = (e) => {
        const t = e.touches && e.touches[0]
        if (t) onGlobalMove({ clientX: t.clientX, clientY: t.clientY })
    }

    watch(() => socket?.value?.entities?.warehouse_tasks, () => scheduleDayReload(), { deep: true })
    watch(() => socket?.value?.entities?.work_shifts, () => scheduleDayReload(), { deep: true })

    watch(dateKey, () => {
        selectedShiftId.value = null
        day.value = null
    })

    onMounted(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null')
            if (saved && typeof saved === 'object') Object.assign(layout, saved)
        } catch (e) {}
        loadConfig()
        document.addEventListener('mousedown', onGlobalDown, true)
        document.addEventListener('mousemove', onGlobalMove)
        document.addEventListener('mouseup', onGlobalUp)
        document.addEventListener('touchstart', onTouchStart, true)
        document.addEventListener('touchmove', onTouchMove, { passive: true })
        document.addEventListener('touchend', onGlobalUp)
    })

    onBeforeUnmount(() => {
        clearTimeout(reloadTimer)
        document.removeEventListener('mousedown', onGlobalDown, true)
        document.removeEventListener('mousemove', onGlobalMove)
        document.removeEventListener('mouseup', onGlobalUp)
        document.removeEventListener('touchstart', onTouchStart, true)
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onGlobalUp)
    })
</script>
