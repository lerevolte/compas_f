<template>
    <div class="table-calc">
        <AppButton class="button_fill button_small" @click="table.addLocalRow()">
            <AppIconPlus />
            Добавить строку
        </AppButton>
        <div class="table-calc__group">
            <div class="table-calc__item">
                <span class="table-calc__label">
                    Количество:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.count, 0) }}
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
                    Сумма:
                </span>
                <strong class="table-calc__value">
                    {{ common.transformPrice(calculateContent.sum, 0) }}
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

    const calculateContent = computed({
        get() {
            return {
                count: table.value.body.reduce((count, row) => count + Number(row.product_count), 0),
                weight: table.value.body.reduce((weight, row) => weight + Number(row.product_weight), 0),
                sum: table.value.body.reduce((sum, row) => sum + (Number(row.product_count) * Number(row.product_price)), 0)
            }
        }
    })
</script>

