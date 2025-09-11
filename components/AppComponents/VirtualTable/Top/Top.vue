<template>
    <div class="section-table__top">
        <AppSave 
            v-show="table.isChanched" 
            @save="(role) => table.save(role)"
        />
        <AppShowMore 
            :options="showMore"
            @initClick="action => table[action]()"
        />
        <AppSettings 
            v-model:list="table.header"
            :options="{
                isCheck: {
                    state: true,
                    name: 'Отображение'
                },
                isDrag: {
                    state: true,
                    name: 'Порядок'
                },
                isHaveDefault: true
            }"
            @reset="table.reset()"
            @isChanched="table.isChanched = true"
            @update:modelValue="(val) => {table.header = val; table.isChanched = true}"
        />
    </div>
</template>

<script setup>
    import './Top.scss';
    
    import AppSettings from '@AppComponents/Settings/Settings.vue'
    import AppSave from '@AppComponents/Save/Save.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'

    const table = inject('table')

    const showMore = [
        {
            name: 'Создать',
            action: 'create'
        },
        {
            name: 'Скачать Excel',
            action: 'downloadExcel'
        }
    ]

</script>
