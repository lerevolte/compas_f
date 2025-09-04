<template>
    <thead class="table__header">
        <tr class="table__row">
            <th 
                class="table__item" 
                v-for="th in table.header" 
                @dblclick="th.key != 'checked' ? table.sortTable(th) : ''" 
                :style="`--thWidth: ${th.width}px`" :title="th.title"
            >
                <span class="table__item-text" :class="{ 'skeleton': props.loading }">
                    {{ th.title }}
                    <IconSort v-if="th.key == table.sort.key" :class="table.sort.order == 'asc' ? 'icon_sort_asc': 'icon_sort_desc'"/>
                </span>
            </th>
        </tr>
    </thead>
</template>

<script setup>
    import './Header.scss';
    
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import IconSort from '@AppIcons/Table/Sort.vue'

    const table = inject('table')

    const props = defineProps({
        loading: {
            default: false,
            type: Boolean
        }
    })
</script>
