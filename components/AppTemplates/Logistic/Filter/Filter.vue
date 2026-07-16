<template>
    <div class="logistic-filter">
        <AppPopup v-if="hasActiveFilters" class="logistic-filter__popup" align="right">
            <template #header>
                <IconSearchActive class="filter__mobile-search"/>
            </template>
            <template #content>
                <div class="logistic-filter__input">
                    <AppInput 
                        :options="{
                            title: 'Фильтр по необработанным задачам',
                        }"
                        v-model="filter.search"
                        @keyup.enter="filter.setSearch()" 
                    />
    
                    <div class="logistic-filter__tabs">
                        <div class="logistic-filter__tab" v-for="tab in filter.tabs" @click="() => filter.update(tab)">
                            {{ tab.title }}: {{ tab.label ?? tab.value }}
                            <IconClose />
                        </div>
                    </div>
                </div>
            </template>
        </AppPopup>
    </div>
</template>
<script setup>
    import './Filter.scss';
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconSearchActive from '@AppIcons/Input/SearchActive.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import IconClose from '@AppIcons/Close.vue';
    const emit = defineEmits([
        'update:modelValue'
    ])
    const props = defineProps({
        modelValue: {
            default: [],
            type: Array
        }
    })
    class Filter {
        constructor() {
            this.search = null
            this.tabs = null
        }
        // Получение табов
        get() {
            this.tabs = computed({
                get() {
                    let response = []
                    if (!props.modelValue || props.modelValue.length == 0) return []
                    for (let tab of props.modelValue) {
                        if (Array.isArray(tab.value)) {
                            const isRange = !['car_requirements', 'employee_requirements', 'driver_requirements'].includes(tab.key)
                            response = [...response, ...tab.value.map((subvalue, index) => {
                                let label = null;
                                if (tab.labels && Array.isArray(tab.labels)) {
                                    label = tab.labels[index] ?? null;
                                }
                                // Если бэкенд прислал точные заголовки границ (titles) —
                                // используем их как есть, без дописывания «(от)»/«(до)».
                                let title;
                                if (tab.titles && Array.isArray(tab.titles) && tab.titles[index]) {
                                    title = tab.titles[index];
                                } else {
                                    title = `${tab.title}${(isRange && tab.value.length > 1) ? (index == 0 ? ' (от)' : index == tab.value.length - 1 ? ' (до)' : ' прочее') : ''}`;
                                }
                                return {
                                    ...tab,
                                    title,
                                    value: subvalue ?? null,
                                    label: label
                                }
                            })]
                        } else {
                            response.push({ ...tab })
                        }
                    }
                    return response.filter(p => p.value != null)
                }
            })
        }
        update(tab) {
            let request = JSON.parse(JSON.stringify(props.modelValue))
            for (let item of request) {
                if (Array.isArray(item.value) && item.key == tab.key) {
                    const idx = item.value.indexOf(tab.value)
                    item.value.splice(idx, 1, null)
                    // Also remove corresponding label
                    if (item.labels && Array.isArray(item.labels) && idx >= 0) {
                        item.labels.splice(idx, 1, null)
                    }
                } else if (item.key == tab.key) {
                    item.value = null
                    item.label = null
                }
            }
            emit('update:modelValue', request)
        }
        setSearch() {
            emit('update:modelValue', [
                ...props.modelValue,
                {
                    "title": "Поиск",
                    "key": "search",
                    "value": this.search
                }
            ])
            this.search = null
        }
    }
    const filter = ref(new Filter())
    const hasActiveFilters = computed(() => {
        if (!props.modelValue || props.modelValue.length == 0) return false
        return props.modelValue.some(tab => Array.isArray(tab.value) ? tab.value.some(v => v != null) : tab.value != null)
    })
    onMounted(() => {
        filter.value.get()
    })
</script>