<template>
    <div class="logistic">
        <div class="logistic__column">
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'logistic_tasks'"
                    :key="'logistic_tasks'"
                    :options="{
                        title: 'Задачи логистики',
                        isHaveQuery: true,
                        query: {
                            route_id: null
                        },
                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: 0
                    }"
                    @openModal="item => emit('openModal', item)"
                />
            </AppResize>
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'routes'"
                    :key="'routes'"
                    :options="{
                        title: 'Маршруты',
                        isHaveQuery: true,
                        query: {
                            date: '2025-08-04'
                        },
                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: 0
                    }"
                    @openModal="item => emit('openModal', item)"
                />
            </AppResize>
        </div>
        <div class="logistic__column">
            <AppResize :options="{height: '525px', width: '100%'}">
                <AppVirtualTable 
                    :slug="'logistic_tasks'"
                    :key="'logistic_tasks'"
                    :options="{
                        title: 'Задачи в машине',
                        isHaveQuery: true,
                        query: {
                            route_id: 83,
                            delivery_date: '2025-08-04'
                        },

                        isHaveFilter: false,
                        isPermanentEdit: false,
                        isTrash: false,
                        isHaveTopHeader: true,
                        isHaveFooter: true,
                        updatingCount: 0
                    }"
                    @openModal="item => emit('openModal', item)"
                />
            </AppResize>
        </div>
    </div>
</template>

<script setup>
    import './Logistic.scss';
    import AppResize from '@AppComponents/Resize/Resize.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    
    const emit = defineEmits([
        'openModal'
    ])

    class Logistic {
        constructor() {}
    }
</script>
