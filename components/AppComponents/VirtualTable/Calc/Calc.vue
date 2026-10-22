<template>
    <div class="table-calc">
        <AppPopup
            class="table-calc__actions"
            v-if="canEdit && rowActions.length"
            :isPreventBottom="true"
        >
            <template #header>
                <AppButton class="button_fill button_small table-calc__actions-button" aria-label="Действия со строками">
                    <IconTriangle />
                </AppButton>
            </template>
            <template #content>
                <div class="popup__option" @click="table.addLocalRow()">
                    Добавить строку
                </div>
                <div
                    class="popup__option"
                    v-for="action in rowActions"
                    :key="action.key"
                    @click="action.handler()"
                >
                    {{ action.title }}
                </div>
            </template>
        </AppPopup>
        <AppButton class="button_fill button_small" v-else-if="canEdit" @click="table.addLocalRow()">
            <AppIconPlus />
            Добавить строку
        </AppButton>
        <div class="table-calc__group">
            <div class="table-calc__item">
                <span class="table-calc__label">
                    Количество:
                </span>
                <strong class="table-calc__value">
                    {{ formatCount(calculateContent.count) }}
                </strong>
            </div>
            <div class="table-calc__item">
                <span class="table-calc__label">
                    Общий вес:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.weight, 0) }}
                </strong>
            </div>
            <div class="table-calc__item">
                <span class="table-calc__label">
                    Общий объем:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.volume, 0) }}
                </strong>
            </div>
            <div class="table-calc__item" v-if="hasPrices">
                <span class="table-calc__label">
                    Сумма:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.sum, 2) }}
                </strong>
            </div>
            <div class="table-calc__item" v-if="hasPrices && calculateContent.vat > 0">
                <span class="table-calc__label">
                    Сумма НДС:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.vat, 2) }}
                </strong>
            </div>
            <div class="table-calc__item" v-if="hasPrices">
                <span class="table-calc__label">
                    Всего:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.total, 2) }}
                </strong>
            </div>
            <div class="table-calc__item" v-if="hasShipped">
                <span class="table-calc__label">
                    Фактическое кол-во:
                </span>
                <strong class="table-calc__value">
                    {{ formatCount(calculateContent.shipped) }}
                </strong>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Calc.scss';
    
    import AppButton from '@AppComponents/Button/Button.vue';
	import AppIconPlus from '@AppIcons/Plus.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import {Common} from '@AppHelpers/classes.js'

    const table = inject('table')
    const common = new Common()

    const hasShipped = computed(() => (table.value.header || []).some(c => c.key === 'product_shipped'))
    const hasPrices = computed(() => (table.value.header || []).some(c => ['product_price', 'product_sum'].includes(c.key)))

    const rowActions = computed(() => (Array.isArray(table.value.options?.rowActions) ? table.value.options.rowActions : []).filter(action => typeof action?.handler === 'function'))

    const canEdit = computed(() => {
        const cols = (table.value.header || []).filter(c => !['actions', 'isChoose', 'clicked', 'iconDrag', 'iconDelete'].includes(c.key))
        return cols.length == 0 || cols.some(c => !c.read_only)
    })

    const formatCount = (value) => {
        const number = Math.round(Number(value || 0) * 1000) / 1000
        const digits = Number.isInteger(number) ? 0 : String(number).split('.')[1].length
        return common.transformPrice(number, digits)
    }

    const calculateContent = computed({
        get() {
            return {
                count: table.value.body.reduce((count, row) => count + Number(row.product_count || 0), 0),
                shipped: table.value.body.reduce((shipped, row) => shipped + Number(row.product_shipped || 0), 0),
                weight: table.value.body.reduce((weight, row) => weight + (Number(row.product_count || 0) * Number(row.product_weight || 0)), 0),
                volume: table.value.body.reduce((volume, row) => volume + (Number(row.product_count || 0) * Number(row.product_volume || 0)), 0),
                sum: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).sum, 0),
                vat: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).vat, 0),
                total: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).gross, 0)
            }
        }
    })
</script>

