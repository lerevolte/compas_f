<template>
    <ColumnFields 
        v-if="props.tabs.active?.tab == 'order' || props.options.isModule"
        :columns="detail.columns.list"
        :slug="props.slug"
        :hidden="detail.columns.hidden"
        :options="{
            isModule: props.options.isModule,
            isDisableFooter: props.options.isGlobalEdit,
            isHaveHistory: true,
            isGlobalEdit: props.options.isGlobalEdit,
        }"
        :history="{
            fields: detail.history.events,
            loading: detail.history.loading
        }"
        :pageId="props.id"
        :headerName="props.headerName"
        @action="action => emit('action', action)"
        @showMoreHistory="page => detail.history.update(page, props.tabs.active?.tab)"
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

    <AppVirtualTable 
        v-else
        :key="props.tabs.active?.tab"
        :options="{
            isHaveQuery: true,
            query: props.tabs.queryTab,
            isHaveFilter: false
        }"
        :slug="props.tabs.active?.slug"
        @openModal="item => emit('action', {
            action: 'openModal',
            value: item
        })"
    />
</template>

<script setup>
    import './Dynamic.scss';
    
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { History, Columns } from '@/helpers/classes.js'

    import AppHistory from '@AppComponents/History/History.vue'; 
    import ColumnFields from '@AppComponents/ColumnFields/ColumnFields.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';

    const emit = defineEmits([
        'action',
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
            this.history = new History()
            this.columns = new Columns()
        }

        // Получение данных
        async get() {
            try {
                let response = null
                if (props.options.isModule) {
                    const route = routes.detail.module.replace('${slug}', props.slug).replace('${id}', props.id).replace('${tab}', props.tabs.active.tab)
                    response = await api.callMethod('GET', route)
                } else {
                    const route = routes.detail.get.replace('${slug}', props.slug).replace('${id}', props.id)
                    response = await api.callMethod('GET', `${route}${props.options.isCopy ? '?is_copy=1' : ''}`)
                    emit('action', { action: 'getTabs', value: response.data.tabs })
                    emit('action', { action: 'getTitle', value: response.data.detail.title?.name })
                    emit('action', { action: 'updateMetaHeader', value: response.data.detail.header_title })
                }
                
                this.history.get(response.data)
                this.columns.get(response.data.detail)
                
                emit('action', { action: 'getColumns', value: response.data.detail.columns })
            } catch (error) {
                console.log(error);
            } finally {
            }
        }
        openModal(item) {
            emit('openModal', item)
        }
    }

    const detail = ref(new Detail())

    watch(() => props.updateComponent, () => {
        detail.value.get()
    })
</script>
