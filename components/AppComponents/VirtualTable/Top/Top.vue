<template>
    <div class="section-table__top">
        <div class="section-table__top-group section-table__top-title">
            {{ props.title }}
            <span class="section-table__top-loading" v-if="isUpdating">
                <span class="section-table__top-loading-spinner"></span>
                <span>Загрузка изменений…</span>
            </span>
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

    // Плашка "Загрузка изменений…" в заголовке таблицы.
    // Показываем во время сохранения и во время фонового перечитывания
    // (когда updatingCount был увеличен извне), но НЕ при первом наполнении
    // таблицы — иначе плашка будет каждый раз мигать на старте.
    const hasLoadedOnce = ref(false)
    watch(() => table.value?.body?.length, (len) => {
        if (len > 0) hasLoadedOnce.value = true
    }, { immediate: true })

    const isUpdating = computed(() => {
        if (!table.value) return false
        if (table.value.saving) return true
        return hasLoadedOnce.value && table.value.loading
    })

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

    const showMore = ref([
        {
            name: 'Скачать Excel',
            action: 'initDownloadExcel',
            enabled: true
        }
    ])

    onMounted(() => {
        if (props.options?.isEnableCreateOption == undefined || props.options?.isEnableCreateOption) {
            showMore.value.unshift(
                {
                    name: 'Создать',
                    action: 'create',
                    enabled: true
                }
            )
        }
        if (props.showMore && props.showMore.length > 0) {
            showMore.value = [...showMore.value, ...props.showMore]
        }
    })
</script>
