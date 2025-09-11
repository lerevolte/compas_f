<template>
    <div class="table__header">
        <div class="table__row" ref="headerRowRef">
            <div 
                v-for="(column, idx) in table.visibleColumns" 
                class="table__cell" 
                :key="column.key" 
                :style="`--cell-size: ${column.width}`"
                :data-idx="idx"
            >
                <AppCheckbox 
                    v-if="column.key == 'isChoose'"
                    v-model="column.value"
                    @update:model-value="table.chooseAll(column.value)"
                />

                <span v-else>
                    {{ column.title }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Header.scss';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'

    const table = inject('table')
</script>