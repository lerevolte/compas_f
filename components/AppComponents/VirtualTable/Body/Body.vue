<template>
    <div class="table__body" v-if="table.rowVirtualizer">
        <div 
            v-for="(row, index) in table.rowVirtualizer.getVirtualItems()" 
            :key="row.key" 
            class="table__row"
            :ref="el => el && table.rowVirtualizer.measureElement(el)" 
            :data-index="row.index"
            :style="`--row-start: ${row.start}px; --color-row: ${row.index % 2 === 0  ? '#f7fbff' : 'transparent'}`"
        >
            <div v-for="column in table.visibleColumns" class="table__cell" :data-column-key="column.key" :key="column.key + (column.isPlaceholder ? '-ph' : '')" :style="`--cell-size: ${column.width}`">
                <AppCheckbox 
                    v-if="column.key == 'isChoose'"
                    v-model="table.body[row.index].isChoose"
                />
                <AppShowMore 
                    v-else-if="column.key == 'actions'"
                    :options="table.body[row.index].edit ? actions.edit : actions.default"
                    @initClick="action => table[action](table.body[row.index])"
                />


                
                <AppInput v-else-if="!column.isPlaceholder && table.body[row.index].edit" v-model="table.body[row.index][column.key]" />
                <span v-else-if="!column.isPlaceholder">
                    {{ table.body[row.index][column.key] }} {{ table.body[row.index].edit }}
                </span>
                <span v-else class="is-placeholder"></span>

            </div>
        </div>
    </div>
</template>

<script setup>
    import './Body.scss';

    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'

    const table = inject('table')

    const actions = {
        default: [
            {
                name: 'Открыть',
                action: 'open'
            },    
            {
                name: 'Редактировать',
                action: 'edit'
            },
            {
                name: 'Скопировать',
                action: 'copy'
            },
            {
                name: 'Удалить',
                action: 'delete'
            }
        ],
        edit: [
            {
                name: 'Сохранить',
                action: 'save'
            },
            {
                name: 'Отмена',
                action: 'cancel'
            },
            {
                name: 'Удалить',
                action: 'delete'
            }
        ]
    }
</script>