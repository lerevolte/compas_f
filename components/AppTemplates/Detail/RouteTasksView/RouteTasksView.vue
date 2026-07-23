<template>
    <div class="route-tasks-view" :class="{ 'route-tasks-view_solo': props.isExternal }">
        <div v-if="!props.isExternal" class="route-tasks-view__col route-tasks-view__col_fields">
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

            <AppPopup class="route-tasks-view__add" :isPreventBottom="true" v-if="userStore.user?.is_admin">
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
                            v-for="field in fieldsForTask(task)"
                            :key="field.key"
                            class="route-tasks-view__task-line"
                        ><span class="route-tasks-view__task-label">{{ field.title }}: </span><span v-if="field.key === 'products'" class="route-tasks-view__task-value" :style="field.set_color && field.color ? { color: field.color } : null" v-html="formatProductsHtml(task[field.key]) || '—'"></span><span v-else class="route-tasks-view__task-value" :style="field.set_color && field.color ? { color: field.color } : null">{{ formatValue(task, field) }}</span> <AppButton
                            v-if="field.type === 'address' && hasValue(task, field)"
                            class="button_text button_copy route-tasks-view__copy"
                            title="Скопировать адрес"
                            @click="event => copyAddress(task, field, event.target)"
                        /></div>
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
    import routes from '@/helpers/routes.js'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconDragDotted from '@AppIcons/Actions/DragDotted.vue'
    import IconLoader from '@AppIcons/Loader.vue'
    import { format } from 'date-fns'
    import { Common } from '@/helpers/classes.js'
    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()
    const common = new Common()

    const props = defineProps({
        routeId: { default: null, type: [Number, String] },
        // Во внешней ссылке routeId = токен, а данные грузятся через
        // неавторизованный token-эндпоинт.
        isExternal: { default: false, type: Boolean }
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

    const hasValue = (task, field) => {
        const formatted = formatValue(task, field)
        return formatted !== '—' && formatted !== '' && formatted !== null && formatted !== undefined
    }

    const fieldsForTask = (task) => selectedFields.value.filter(field => field.visible_always === 1 || hasValue(task, field))

    const copyAddress = (task, field, buttonRef) => {
        buttonRef.classList.add('button_copy_active')
        common.copyText(formatValue(task, field))

        setTimeout(() => {
            buttonRef.classList.remove('button_copy_active')
        }, 3000)
    }

    // Конфиг полей хранится на бэке (один общий на портал), чтобы переживал
    // перезагрузку и показывался идентично во внешней ссылке (8579).
    const persist = async () => {
        if (props.isExternal) return // внешняя ссылка — только просмотр
        try {
            const data = allFields.value.map(f => ({ key: f.key, enabled: !!f.enabled, sort: f.sort }))
            await api.callMethod('PUT', routes.logistic.tasksViewFields, { fields: data })
        } catch (e) {}
    }

    const loadSavedConfig = async () => {
        try {
            const resp = await api.callMethod('GET', routes.logistic.tasksViewFields)
            return resp.data?.fields ?? []
        } catch (e) {
            return []
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

    // Конфиг колонок logistic_tasks -> список доступных для отображения полей.
    // savedConfig — общий конфиг с бэка [{key, enabled, sort}].
    const buildFieldsFromTable = (table, savedConfig) => {
        const hasConfig = Array.isArray(savedConfig) && savedConfig.length > 0
        const fields = (table ?? [])
            .filter(col => col && col.key && !TECHNICAL_KEYS.has(col.key))
            .map((col, i) => {
                const saved = hasConfig ? savedConfig.find(s => s.key === col.key) : null
                return {
                    key: col.key,
                    title: col.title || col.key,
                    type: col.type,
                    options: col.options || [],
                    is_plural: col.is_plural || false,
                    related_table: col.related_table || null,
                    color: col.color || null,
                    set_color: col.set_color || 0,
                    visible_always: Number(col.visible_always ?? 0),
                    sort: saved ? (saved.sort ?? i) : i,
                    enabled: saved ? !!saved.enabled : (hasConfig ? false : ['name', 'address'].includes(col.key))
                }
            })

        allFields.value = fields
    }

    const loadFields = async (savedConfig) => {
        // Берём конфиг таблицы logistic_tasks — там есть весь набор колонок,
        // включая отключённые.
        try {
            const response = await api.callMethod('GET', '/objects/logistic_tasks/compose?per_page=1')
            buildFieldsFromTable(response.data?.table, savedConfig)
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

    // Внешняя ссылка: один token-вызов отдаёт и колонки (table), и задачи
    // маршрута (list.data, scoping по route_id на сервере). routeId = токен.
    const loadExternal = async () => {
        if (!props.routeId) return
        loading.value = true
        try {
            const route = routes.external_link.table
                .replace('${token}', props.routeId)
                .replace('${slug}', 'logistic_tasks')
            const response = await api.callMethod('GET', route)
            // Конфиг полей приходит из того же ответа (route_tasks_view) —
            // тот же набор/порядок колонок, что настроен внутри портала.
            buildFieldsFromTable(response.data?.table, response.data?.route_tasks_view)
            tasks.value = response.data?.list?.data || []
        } catch (e) {
            console.error('Не удалось загрузить задачи маршрута (внешняя ссылка):', e)
            tasks.value = []
        } finally {
            loading.value = false
        }
    }

    const reload = () => props.isExternal ? loadExternal() : loadTasks()

    const htmlToText = (html) => String(html ?? '')
        .replace(/<br\s*\/?>/gi, '; ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/\s*;\s*$/, '')
        .trim()

    const formatProductsHtml = (raw) => {
        if (raw === null || raw === undefined || raw === '') return ''
        let products = raw
        if (typeof products === 'string') {
            try {
                products = JSON.parse(products)
            } catch (e) {
                return ''
            }
        }
        if (!Array.isArray(products) || products.length === 0) return ''
        return products.map(p => {
            if (!p) return ''
            let name = p.name
            if (typeof name === 'object' && name !== null) {
                name = name.value ?? name.text ?? ''
            }
            if (Array.isArray(name)) name = name[0] ?? ''
            return `${name}, <b> ${p.count} шт.</b>`
        }).join(', ')
    }

    const formatValue = (task, field) => {
        const raw = task[field.key]
        if (raw === null || raw === undefined || raw === '') return '—'

        if (field.key === 'products') {
            return htmlToText(formatProductsHtml(raw)) || '—'
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

    watch(() => props.routeId, () => reload(), { immediate: false })

    onMounted(async () => {
        if (props.isExternal) {
            await loadExternal()
        } else {
            const savedConfig = await loadSavedConfig()
            await loadFields(savedConfig)
            await loadTasks()
        }
    })
</script>
