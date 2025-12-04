<template>
    <div class="section-table__top">
        <div class="section-table__top-group section-table__top-title">
            {{ props.title }}
        </div>
        <div class="section-table__top-group">
            <AppSave 
                v-show="table.isChanged" 
                @save="(role) => table.saveSettings(role)"
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
                    isFixed: {
                        state: true,
                        name: 'Фиксированные'
                    },
                    isHaveDefault: true
                }"
                @reset="table.reset()"
                @isChanged="table.isChanged = true"
                @update:modelValue="(val) => {table.header = val; table.isChanged = true}"
            />
        </div>
    </div>
</template>

<script setup>
    import './Top.scss';
    
    import AppSettings from '@AppComponents/Settings/Settings.vue'
    import AppSave from '@AppComponents/Save/Save.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'

    const table = inject('table')

    const props = defineProps({
        title: {
            default: null,
            type: String
        }
    })

    const showMore = [
        {
            name: 'Создать',
            action: 'create'
        },
        {
            name: 'Скачать Excel',
            action: 'initDownloadExcel'
        }
    ]

</script>
