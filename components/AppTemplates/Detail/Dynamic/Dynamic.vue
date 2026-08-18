<template>
    <IconLoader class="detail_loader" v-if="detail.loading"/>

    <div class="dynamic__forbidden" v-else-if="detail.forbidden">
        <div class="dynamic__forbidden-code">403</div>
        <p class="dynamic__forbidden-title">Доступ запрещён</p>
        <p class="dynamic__forbidden-text">У вас нет прав для просмотра этого объекта. Обратитесь к администратору портала, чтобы получить доступ.</p>
    </div>

    <template v-else>
        <ColumnFields 
            v-if="props.tabs.active?.tab == 'order' || props.options.isModule"
            :columns="detail.columns.list"
            :slug="props.slug"
            :hidden="detail.columns.hidden"
            :tabs="props.tabs"
            :options="{
                isModule: props.options.isModule || props.options.isExternal,
                isDisableFooter: props.options.isGlobalEdit || props.options.isExternal,
                isHaveHistory: true,
                isGlobalEdit: props.options.isGlobalEdit,
                isCopy: props.options.isCopy,
                isExternal: props.options.isExternal,
            }"
            :history="{
                fields: detail.history.events,
                loading: detail.history.loading
            }"
            :eventsVisibility="detail.eventsVisibility"
            :pageId="props.id"
            :headerName="props.headerName"
            @action="action => action.action == 'get' ? detail.get() : emit('action', action)"
            @showMoreHistory="page => detail.history.update(page, props.tabs.active?.tab)"
            @closeDetail="() => emit('action', {
                action: 'closeDetail',
                value: item
            })"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />
    
        <AppHistory 
            v-else-if="props.tabs.active?.tab == 'history'"
            :title="'История изменений'"
            :history="detail.history.fields"
            :loading="detail.history.loading"
            @showMoreHistory="page => detail.history.update(page, tabs.active.tab, {id: props.id, slug: props.slug})"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />
    
        <AppRelatedObjects
            v-else-if="props.tabs.active?.tab == 'relations'"
            :id="props.id"
            :slug="props.slug"
            @openModal="item => emit('action', { action: 'openModal', value: { ...item, type: 'detail' } })"
        />

        <div class="dynamin__group" v-else-if="props.tabs.active?.tab == 'products'">
            <AppVirtualTable
                :pageId="props.id"
                :options="{
                    draggableTarget: '.icon_drag',
                    isDraggable: canEditProducts,
                    isLocalTable: true,
                    isHaveQuery: false,
                    query: {},
                    isHaveFilter: false,
                    isPermanentEdit: canEditProducts,
                    isTrash: false,
                    isHaveTopHeader: true,
                    isHaveFooter: false,
                    isDisableSockets: true,
                    updatingCount: 0,
                    parentSlug: props.slug ?? 'logistic_tasks'
                }"
                :table="detail.products"
                :slug="'products'"
                @saveTable="detail.get()"
                @openModal="item => emit('action', {
                    action: 'openModal',
                    value: item
                })"
            />
        </div>

        <!--
            Список «Маршрут»: вкладка с title='Маршрут' / 'Маршрут списком' /
            'Маршрут списокм' (опечатка) в деталке маршрута. НЕ 'Маршруты' и
            не вкладка «Задачи» — там оставляем стандартную таблицу.
            \b в JS-регексах не работает с кириллицей, поэтому используем
            startsWith + явное исключение «Маршруты».
        -->
        <RouteTasksView
            v-else-if="isRouteTasksTab"
            :routeId="props.id"
            :isExternal="props.options.isExternal"
        />

        <AppVirtualTable
            v-else
            :pageId="props.id"
            :key="props.tabs.active?.tab"
            :options="{
                isHaveQuery: true,
                query: tabQuery,
                isHaveFilter: false,
                title: null,
                isCheckClicked: false,
                isLocalTable: false,
                isShort: false,
                isDisableSockets: !isTasksTab,
                isDisableSort: true,
                isDisablePull: true,
                isPermanentEdit: false,
                isTrash: false,
                isHaveTopHeader: false,
                isHaveFooter: false,
                isHaveLocalFilter: false,
                isExternal: props.options.isExternal,
                localFilter: []
            }"
            :slug="props.tabs.active?.slug"
            @openModal="item => emit('action', {
                action: 'openModal',
                value: item
            })"
        />
    </template>
</template>

<script setup>
    import './Dynamic.scss';
    
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue'
    import { History, Columns } from '@/helpers/classes.js'
    import AppHistory from '@AppComponents/History/History.vue';
    import ColumnFields from '@AppComponents/ColumnFields/ColumnFields.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import RouteTasksView from '@AppTemplates/Detail/RouteTasksView/RouteTasksView.vue';
    import AppRelatedObjects from '@AppComponents/RelatedObjects/RelatedObjects.vue';

    const isRouteTasksTab = computed(() => {
        // В external-режиме slug не передаётся (null) — разрешаем проверку по title.
        if (props.slug !== 'routes' && !(props.options?.isExternal && props.slug == null)) return false
        const active = props.tabs?.active
        if (!active) return false
        if (['order', 'history', 'products'].includes(active.tab)) return false
        const title = (typeof active.title === 'string' ? active.title : '').trim()
        if (!title) return false
        // Исключаем стандартные «Маршруты»/«Задачи».
        if (title === 'Маршруты' || /Задач/i.test(title)) return false
        // Подходят: 'Маршрут', 'Маршрут списком', 'Маршрут списокм' и др.
        return title === 'Маршрут' || title.startsWith('Маршрут ')
    })

    // Для деталки маршрута: вкладки, ссылающиеся на logistic_tasks (Задачи),
    // не имеют автогенерируемого relation-поля на стороне Route (связь обратная
    // через task.route_id). Стандартный queryTab из Detail.Tabs.set() в этом
    // случае получается пустой («?is_slug=true») и не возвращает задач.
    // Filter.get сам оборачивает ключи в filter[...], поэтому передаём
    // имя поля без префикса — иначе получится filter[filter[route_id]]=...
    const tabQuery = computed(() => {
        const base = props.tabs?.queryTab || {}
        if (props.slug === 'routes' && props.tabs?.active?.slug === 'logistic_tasks') {
            return {
                ...base,
                route_id: props.id
            }
        }
        if (props.slug === 'cars' && props.tabs?.active?.slug === 'routes') {
            return {
                ...base,
                id: null,
                car_id: props.id
            }
        }
        return base
    })

    // Вкладка «Задачи» (logistic_tasks) внутри деталки маршрута: включаем сокеты,
    // чтобы после редактирования задачи (в т.ч. во вложенной модалке) таблица
    // показывала плашку обновления, как и обычные таблицы. У остальных вкладок
    // сокеты остаются выключенными.
    const isTasksTab = computed(() => props.tabs?.active?.slug === 'logistic_tasks')

    const emit = defineEmits([
        'action',
        'closeDetail',
        'openModal'
    ])

    const props = defineProps({
        id: {
            default: null,
            type: [String, Number, Object]
        },
        slug: {
            default: null,
            type: [String, Number, Object]
        },
        route_id: {
            default: null,
            type: [String, Number]
        },
        defaults: {
            default: null,
            type: Object
        },
        tabs: {
            default: {
                active: {
                    tab: "order"
                },
                is_module: false,
                queryTab: {},
                list: []
            },
            type: Object
        },
        options: {
            default: {
                isModule: false,
                isCopy: false,
                isGlobalEdit: false
            }
        },
        updateComponent: {
            default: 0,
            type: Number
        },
        headerName: {
            default: '',
            type: String
        }
    })

    class Detail {
        constructor() {
            this.loading = false
            this.forbidden = false
            this.products = {
                table: [],
                list: []
            }
            this.socket = null
            this.history = new History()
            this.columns = new Columns()
            this.eventsVisibility = {
                visible: true,
                has_roles_read: false,
                roles_read: []
            }
        }

        // Получение данных
        async get() {
            try {
                let response = null
                this.loading = true
                this.forbidden = false
                emit('action', { action: 'setForbidden', value: false })


                if (props.options.isExternal && props.options.isModule) {
                    const route = routes.external_link.module.replace('${token}', props.id).replace('${tab}', props.tabs.active.tab)
                    response = await api.callMethod('GET', route)
                } else if (props.options.isExternal) {
                    const route = routes.detail.external.replace('${token}', props.id)
                    response = await api.callMethod('GET', route)
                } else if (props.options.isModule) {
                    const route = routes.detail.module.replace('${slug}', props.slug).replace('${id}', props.id).replace('${tab}', props.tabs.active.tab)
                    response = await api.callMethod('GET', route)
                } else {
                    const route = routes.detail.get.replace('${slug}', props.slug).replace('${id}', props.id)
                    const query = []
                    if (props.options.isCopy) query.push('is_copy=1')
                    if (props.route_id) query.push(`route_id=${props.route_id}`)
                    const queryString = query.length ? `?${query.join('&')}` : ''
                    response = await api.callMethod('GET', `${route}${queryString}`)
                    socket.value.set({slug: props.slug, id: props.id})
                    this.socket = socket.value.entities[props.slug]?.details[props.id]
                }

                if (response?.status == 403) {
                    this.forbidden = true
                    emit('action', { action: 'setForbidden', value: true })
                    return
                }

                if (!props.options.isModule) {
                    emit('action', { action: 'getTabs', value: response.data.tabs })
                    emit('action', { action: 'getTitle', value: response.data.detail.title?.name })
                    emit('action', {action: 'checkIsTrash', value: Boolean(response.data.detail.deleted_at)})
                    emit('action', {
                        action: 'updateMetaHeader', value: {
                            title: response.data.detail.header_title || '',
                            href: {
                                slug: props.slug,
                                id: props.id
                            }
                        }
                    })
                }

                // При копировании бэкенд отдаёт title.name (имя источника), но в самих
                // колонках поле name приходит пустым — модалка создания показывает
                // пустое «Название». Подкладываем имя источника, чтобы пользователь
                // мог сразу отредактировать его.
                if (props.options.isCopy && response.data.detail?.title?.name && response.data.detail?.columns) {
                    const sourceName = response.data.detail.title.name
                    for (const colKey in response.data.detail.columns) {
                        for (const section of response.data.detail.columns[colKey]) {
                            for (const field of section.fields) {
                                if (field.key === 'name') {
                                    if (field.value && typeof field.value === 'object') {
                                        if (field.value.value == null || field.value.value === '') {
                                            field.value.value = sourceName
                                        }
                                    } else if (field.value == null || field.value === '') {
                                        field.value = sourceName
                                    }
                                }
                            }
                        }
                    }
                }

                // Префилл формы создания значениями по умолчанию (например, при
                // «Создать задачу» из «Библиотеки задач» — поля берутся из адреса).
                if (props.defaults && props.options.isGlobalEdit && response.data.detail?.columns) {
                    const applyDefault = (field) => {
                        if (!(field.key in props.defaults)) return
                        const def = props.defaults[field.key]
                        if (field.value && typeof field.value === 'object' && !Array.isArray(field.value) && 'value' in field.value) {
                            field.value.value = (def && typeof def === 'object' && 'value' in def) ? def.value : def
                        } else {
                            field.value = def
                        }
                    }
                    for (const colKey in response.data.detail.columns) {
                        for (const section of response.data.detail.columns[colKey]) {
                            for (const field of section.fields) {
                                if (field.type === 'text_group' && Array.isArray(field.fields)) {
                                    field.fields.forEach(applyDefault)
                                } else {
                                    applyDefault(field)
                                }
                            }
                        }
                    }
                }

                this.products.table = response.data.table.tableKeys
                this.products.list = response.data.table.tableBody
                this.history.get(response.data)
                this.eventsVisibility = response.data.events_visibility ?? {
                    visible: true,
                    has_roles_read: false,
                    roles_read: []
                }
                this.columns.get(response.data.detail)
                emit('action', { action: 'getColumns', value: response.data.detail.columns })
                emit('action', { action: 'getHiddenFields', value: response.data.detail.hidden_fields ?? [] })
                emit('action', { action: 'setPermissions', value: { permissions: response.data.permissions || {}, readonly: !!response.data.detail?.readonly } })
            } catch (error) {
                console.log(error);
            } finally {
                this.loading = false
            }
        }
        openModal(item) {
            emit('openModal', item)
        }
    }

    const detail = ref(new Detail())
    const canEditProducts = computed(() => {
        const keys = detail.value?.products?.table || []
        if (!keys.length) return true
        return keys.some(c => !c.read_only)
    })
    const socket = inject('socket')

    watch(() => props.updateComponent, () => {
        detail.value.get()
    })

    watch(() => detail.value.socket, () => {
        if (detail.value.socket?.history?.fields && detail.value.socket?.history?.fields?.length > 0) {
            detail.value.history.fields.data.unshift(detail.value.socket.history.fields.pop())
        }
        if (detail.value.socket?.history?.events && detail.value.socket?.history?.events?.length > 0) {
            detail.value.history.events.data.unshift(detail.value.socket.history.fields.pop())
        }
    }, {deep: true})

    onUnmounted(() => {
        socket.value.remove({slug: props.slug, id: props.id})
    })
</script>
