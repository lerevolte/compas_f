<template>
    <div class="route-tasks-view">
        <div class="route-tasks-view__col route-tasks-view__col_fields">
            <div class="route-tasks-view__col-title">Поля задачи</div>
            <draggable
                tag="div"
                class="route-tasks-view__fields"
                v-model="visibleFields"
                :forceFallback="true"
                :fallbackOnBody="true"
                handle=".route-tasks-view__field-drag"
                item-key="key"
                drag-class="draggable-drag"
                ghost-class="draggable-ghost"
                fallback-class="draggable-fallback"
                @end="persist"
            >
                <template #item="{ element: field }">
                    <div class="route-tasks-view__field">
                        <figure class="icon_drag route-tasks-view__field-drag">
                            <IconDragDotted />
                        </figure>
                        <AppCheckbox
                            v-model="field.enabled"
                            :options="{ title: field.title }"
                            @update:model-value="persist"
                        />
                    </div>
                </template>
            </draggable>

            <AppPopup class="route-tasks-view__add" :isPreventBottom="true">
                <template #header>
                    <AppButton class="button_text">
                        Добавить поле
                    </AppButton>
                </template>
                <template #content>
                    <div
                        v-if="hiddenFields.length === 0"
                        class="popup__option popup__option_empty"
                    ></div>
                    <div
                        v-else
                        v-for="field in hiddenFields"
                        :key="field.key"
                        class="popup__option"
                        @click="showField(field)"
                    >
                        {{ field.title }}
                    </div>
                </template>
            </AppPopup>
        </div>

        <div class="route-tasks-view__col route-tasks-view__col_tasks">
            <div class="route-tasks-view__col-title">
                Задачи маршрута
                <span class="route-tasks-view__count" v-if="tasks.length">({{ tasks.length }})</span>
            </div>
            <IconLoader v-if="loading" class="route-tasks-view__loader" />
            <div v-else-if="!tasks.length" class="route-tasks-view__empty">
                Нет задач в маршруте
            </div>
            <div v-else class="route-tasks-view__tasks">
                <div
                    v-for="(task, idx) in tasks"
                    :key="task.id"
                    class="route-tasks-view__task"
                >
                    <div class="route-tasks-view__task-index">{{ idx + 1 }}</div>
                    <div class="route-tasks-view__task-body">
                        <div
                            v-for="field in selectedFields"
                            :key="field.key"
                            class="route-tasks-view__task-line"
                        >
                            <span class="route-tasks-view__task-label">{{ field.title }}:</span>
                            <span class="route-tasks-view__task-value">
                                {{ formatValue(task, field) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './RouteTasksView.scss'

    import draggable from 'vuedraggable'
    import api from '@/helpers/api.js'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconDragDotted from '@AppIcons/Actions/DragDotted.vue'
    import IconLoader from '@AppIcons/Loader.vue'
    import { format } from 'date-fns'

    const props = defineProps({
        routeId: { default: null, type: [Number, String] }
    })

    const allFields = ref([])    // [{key, title, type, options, enabled, sort}]
    const tasks = ref([])
    const loading = ref(false)

    const visibleFields = computed({
        get: () => allFields.value.filter(f => f.enabled).sort((a, b) => a.sort - b.sort),
        set: (newList) => {
            // Сохраняем новый порядок только для отображаемых полей.
            newList.forEach((f, i) => {
                const original = allFields.value.find(orig => orig.key === f.key)
                if (original) original.sort = i
            })
        }
    })

    const hiddenFields = computed(() => allFields.value.filter(f => !f.enabled))

    const selectedFields = computed(() => visibleFields.value)

    const storageKey = computed(() => `route-tasks-view:${props.routeId || 'all'}`)

    const persist = () => {
        if (typeof localStorage === 'undefined') return
        try {
            const data = allFields.value.map(f => ({ key: f.key, enabled: !!f.enabled, sort: f.sort }))
            localStorage.setItem(storageKey.value, JSON.stringify(data))
        } catch (e) {}
    }

    const restore = () => {
        if (typeof localStorage === 'undefined') return null
        try {
            const raw = localStorage.getItem(storageKey.value)
            return raw ? JSON.parse(raw) : null
        } catch (e) {
            return null
        }
    }

    const showField = (field) => {
        const target = allFields.value.find(f => f.key === field.key)
        if (!target) return
        target.enabled = true
        // Помещаем новое поле в конец видимого списка.
        const maxSort = Math.max(0, ...allFields.value.filter(f => f.enabled).map(f => f.sort))
        target.sort = maxSort + 1
        persist()
    }

    const TECHNICAL_KEYS = new Set([
        'id', 'isChoose', 'actions', 'clicked', 'iconDrag', 'iconDelete',
        'created_at', 'updated_at', 'deleted_at'
    ])

    const loadFields = async () => {
        // Берём конфиг таблицы logistic_tasks — там есть весь набор колонок,
        // включая отключённые. Из них и строим список доступных полей.
        try {
            const response = await api.callMethod('GET', '/objects/logistic_tasks/compose?per_page=1')
            const table = response.data?.table ?? []
            const fields = table
                .filter(col => col && col.key && !TECHNICAL_KEYS.has(col.key))
                .map((col, i) => ({
                    key: col.key,
                    title: col.title || col.key,
                    type: col.type,
                    options: col.options || [],
                    is_plural: col.is_plural || false,
                    related_table: col.related_table || null,
                    sort: i,
                    // По умолчанию включаем «Название» и «Адрес», если они есть.
                    enabled: ['name', 'address'].includes(col.key)
                }))

            // Применяем сохранённые пользовательские настройки.
            const saved = restore()
            if (saved && Array.isArray(saved)) {
                fields.forEach(f => {
                    const found = saved.find(s => s.key === f.key)
                    if (found) {
                        f.enabled = !!found.enabled
                        f.sort = found.sort ?? f.sort
                    }
                })
            }

            allFields.value = fields
        } catch (e) {
            console.error('Не удалось получить поля logistic_tasks:', e)
        }
    }

    const loadTasks = async () => {
        if (!props.routeId) return
        loading.value = true
        try {
            const response = await api.callMethod('GET', `/routes/${props.routeId}/tasks`)
            tasks.value = response.data?.data || []
        } catch (e) {
            console.error('Не удалось получить задачи маршрута:', e)
            tasks.value = []
        } finally {
            loading.value = false
        }
    }

    const formatValue = (task, field) => {
        const raw = task[field.key]
        if (raw === null || raw === undefined || raw === '') return '—'

        // products хранится JSON-строкой и не декодируется на бэке (поле явно
        // исключено). Рендерим как "Название × количество" через запятую.
        if (field.key === 'products') {
            let products = raw
            if (typeof products === 'string') {
                try { products = JSON.parse(products) } catch (e) { return raw }
            }
            if (!Array.isArray(products) || products.length === 0) return '—'
            return products.map(p => {
                let name = p?.name
                if (typeof name === 'object' && name !== null) {
                    name = name.value ?? name.text ?? ''
                }
                if (Array.isArray(name)) name = name[0] ?? ''
                name = String(name || 'Товар').trim()
                const count = p?.count ?? 1
                return `${name} × ${count}`
            }).join('; ')
        }

        if (field.type === 'address') {
            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw)
                    return parsed?.text ?? raw
                } catch (e) {
                    return raw
                }
            }
            return raw?.text ?? '—'
        }

        if (field.type === 'date') {
            try {
                return format(new Date(raw), 'dd.MM.yyyy')
            } catch (e) {
                return String(raw)
            }
        }

        if (field.type === 'relation') {
            if (Array.isArray(raw)) {
                return raw.map(v => (typeof v === 'object' ? (v?.label?.text ?? v?.label ?? v?.value ?? '') : v))
                    .filter(Boolean)
                    .join(', ') || '—'
            }
            if (typeof raw === 'object') {
                return raw?.label?.text ?? raw?.label ?? raw?.value ?? '—'
            }
            // По id ищем подпись в опциях.
            const opt = field.options?.find?.(o => String(o.value) === String(raw))
            return opt ? (opt.label?.text ?? opt.label ?? String(raw)) : String(raw)
        }

        if (field.type === 'select_dropdown' || field.type === 'status') {
            const list = Array.isArray(raw) ? raw : [raw]
            const labels = list.map(v => {
                const opt = field.options?.find?.(o => String(o.value) === String(v))
                if (!opt) return v
                return opt.label?.text ?? opt.label ?? v
            })
            return labels.filter(x => x !== null && x !== undefined && x !== '').join(', ') || '—'
        }

        // Если значение оказалось JSON-строкой массива/объекта — попытаемся раскрыть.
        if (typeof raw === 'string') {
            const trimmed = raw.trim()
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed)
                    if (Array.isArray(parsed)) {
                        return parsed.map(v => (typeof v === 'object'
                            ? (v?.name ?? v?.label ?? v?.text ?? v?.value ?? '')
                            : v)
                        ).filter(Boolean).join(', ') || '—'
                    }
                    if (parsed && typeof parsed === 'object') {
                        return parsed.value ?? parsed.text ?? parsed.name ?? JSON.stringify(parsed)
                    }
                } catch (e) { /* not JSON */ }
            }
            return raw
        }

        if (Array.isArray(raw)) {
            return raw.map(v => (typeof v === 'object'
                ? (v?.name ?? v?.label ?? v?.text ?? v?.value ?? '')
                : v)
            ).filter(Boolean).join(', ') || '—'
        }

        if (typeof raw === 'object') {
            return raw?.value ?? raw?.text ?? raw?.name ?? JSON.stringify(raw)
        }

        return String(raw)
    }

    watch(() => props.routeId, () => loadTasks(), { immediate: false })

    onMounted(async () => {
        await loadFields()
        await loadTasks()
    })
</script>
