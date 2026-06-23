<template>
    <div class="section-table__top">
        <div class="section-table__top-group section-table__top-title">
            <slot name="title">{{ props.title }}</slot>
        </div>
        <div class="section-table__top-group">
            <AppSave
                class="section__tab-save"
                v-if="table.isChanged"
                @save="(role) => table.saveSettings(role)"
            />
            <AppShowMore 
                :options="showMore"
                :isPreventBottom="true"
                @initClick="action => table[action]()"
            />
            <AppSettings 
                v-model:list="table.header"
                v-model:visible="table.header"
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
                @update:modelVisible="(val) => {table.header = val; table.isChanged = true}"
                @update:modelList="(val) => {table.header = val; table.isChanged = true}"
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
        },
        options: {
            default: {
                isEnableCreateOption: false
            }
        },
        showMore: {
            default: null,
            type: Array
        }
    })

    const showMore = computed(() => {
        const list = []
        const canCreate = table?.value?.permissions?.create_p !== 'N'
        if ((props.options?.isEnableCreateOption == undefined || props.options?.isEnableCreateOption) && canCreate) {
            list.push({ name: 'Создать', action: 'create', enabled: true })
        }
        list.push({ name: 'Скачать Excel', action: 'initDownloadExcel', enabled: true })
        if (props.showMore && props.showMore.length > 0) {
            list.push(...props.showMore)
        }
        return list
    })
</script>
