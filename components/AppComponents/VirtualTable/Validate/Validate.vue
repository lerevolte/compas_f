<template>
    <div class="table-validate">
        <p class="warning__text">
            Необходимо заполнить обязательные поля
        </p>

        <div class="table-validate__row" v-for="error in table.validateBuffer.errors" :key="error.id">
            <p class="table-validate__id text">
                ID: <strong>{{ error.id }}</strong>
            </p>

            <template v-for="column in error.columns" :key="`${error.id}_${column.key}`">
                <AppInput
                    v-if="['text', 'number'].includes(column.type)"
                    :model-value="cellModel(error.id, column).value"
                    @update:model-value="val => cellModel(error.id, column).value = val"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        title: column.title,
                        type: column.type,
                        name: column.key,
                        placeholder: null,
                        mask: column.mask ?? null
                    }"
                />

                <AppSelect
                    v-else-if="column.type == 'select_dropdown'"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        title: column.title,
                        type: column.type,
                        list: column.options,
                        name: column.key,
                        relation: null,
                        edit: true,
                        searchable: false,
                        required: true,
                        isHaveNull: true,
                        multiple: column.is_plural,
                        placeholder: ''
                    }"
                    v-model="cellModel(error.id, column).value"
                />

                <AppDate
                    v-else-if="column.type == 'date'"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        title: column.title,
                        type: 'date',
                        name: 'date',
                        multiple: false,
                        placeholder: ''
                    }"
                    v-model="cellModel(error.id, column).value"
                />

                <AppStatus
                    v-else-if="column.type == 'status'"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        field_id: column.id,
                        title: column.title,
                        type: column.type,
                        list: column.options,
                        name: column.key,
                        relation: null,
                        edit: true,
                        required: true,
                        isHaveNull: true,
                        isCanCreate: column.can_create ?? false,
                        placeholder: ''
                    }"
                    v-model="cellModel(error.id, column).value"
                />

                <AppSelect
                    v-else-if="column.type == 'address'"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        title: column.title,
                        type: column.type,
                        list: column.options,
                        name: column.key,
                        relation: null,
                        edit: true,
                        searchable: true,
                        required: true,
                        isHaveNull: true,
                        multiple: false,
                        placeholder: ''
                    }"
                    v-model="cellModel(error.id, column).value"
                />

                <AppRelation
                    v-else-if="column.type == 'relation'"
                    :options="{
                        id: `validate_${error.id}_${column.key}`,
                        title: column.title,
                        edit: true,
                        type: column.type,
                        list: column.options,
                        slug: column.related_table,
                        name: column.key,
                        relation: column.id,
                        searchable: true,
                        required: true,
                        isHaveNull: true,
                        multiple: column.is_plural,
                        visibleCount: 5,
                        placeholder: ''
                    }"
                    v-model="cellModel(error.id, column).value"
                />

                <p class="table-validate__fallback text" v-else>
                    {{ column.title }} — заполните поле в таблице
                </p>
            </template>
        </div>
    </div>
</template>

<script setup>
    import './Validate.scss'

    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue'
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'

    const table = inject('table')

    // Модель ячейки по id строки: пишет значение прямо в table.body, поэтому
    // после «Сохранить» обычный table.save() видит заполненные поля.
    // Формы значений — те же, что в Body.vue useCellModel.
    const _cache = new Map()
    const cellModel = (rowId, column) => {
        const cacheKey = `${rowId}__${column.key}`
        if (_cache.has(cacheKey)) return _cache.get(cacheKey)

        const c = computed({
            get() {
                const row = table.value.body.find(r => r.id == rowId)
                if (!row) return null
                const cell = row[column.key]

                if (column.type == 'address') return cell
                if (Array.isArray(cell)) return cell
                if (column.type == 'relation') return cell ?? null
                return typeof cell === 'object' && cell !== null ? cell.value : cell
            },
            set(val) {
                const row = table.value.body.find(r => r.id == rowId)
                if (!row) return
                const cell = row[column.key]

                if (column.type == 'address' || column.type == 'relation') {
                    row[column.key] = val
                } else if (typeof cell === 'object' && cell !== null && 'value' in cell) {
                    cell.value = val
                } else {
                    row[column.key] = val
                }
            }
        })
        _cache.set(cacheKey, c)
        return c
    }
</script>
