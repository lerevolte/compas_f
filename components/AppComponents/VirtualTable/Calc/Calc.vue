<template>
    <div class="table-calc">
        <AppButton class="button_fill button_small" v-if="canEdit" @click="table.addLocalRow()">
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
            <div class="table-calc__item">
                <span class="table-calc__label">
                    Сумма:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.sum, 2) }}
                </strong>
            </div>
            <div class="table-calc__item" v-if="calculateContent.vat > 0">
                <span class="table-calc__label">
                    Сумма НДС:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.vat, 2) }}
                </strong>
            </div>
            <div class="table-calc__item">
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
    import {Common} from '@AppHelpers/classes.js'

    const table = inject('table')
    const common = new Common()

    const hasShipped = computed(() => (table.value.header || []).some(c => c.key === 'product_shipped'))

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
                sum: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).net, 0),
                vat: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).vat, 0),
                total: table.value.body.reduce((sum, row) => sum + common.productLineParts(row, table.value.options?.parentSlug).gross, 0)
            }
        }
    })
</script>

