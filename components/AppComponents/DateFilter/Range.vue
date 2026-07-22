<template>
    <div class="date-fitler date-fitler_range">
        <div 
            class="date-fitler__item"
            v-for="range in ranges"
            :class="{'date-fitler__item_active': isEqual(range?.value, props.modelValue)}"
            @click="emit('update:modelValue', range.value)">
            {{ range.title }}
        </div>
        
        <AppDate
            class="date-fitler__date"
            :class="{'date-fitler__date_custom': !!customLabel}"
            :style="customLabel ? { '--date-filter-label': `'${customLabel}'` } : null"
            v-model="inputDateValue"
            :options="{
                multiple: true,
                id: 0,
                title: '',
                type: '',
                name: '',
                placeholder: ''
            }"
        />
    </div>
</template>

<script setup>
    import './DateFilter.scss';
	import { format, subDays } from 'date-fns'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue'
    import isEqual from 'lodash/isEqual'

    const emit = defineEmits([
        'update:modelValue'
    ])

    const props = defineProps({
        modelValue: {
            default: null
        }
    })

    const inputDateValue = computed({
        get: () => {
            return props.modelValue
        },
        set: (value) => {
            emit('update:modelValue', value)
        }
    })

    const ranges = [
        {
            title: 'Сегодня',
            value: [format(new Date(), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        },
        {
            title: 'Вчера',
            value: [format(subDays(new Date(), 1), 'yyyy-MM-dd'), format(subDays(new Date(), 1), 'yyyy-MM-dd')]
        },
        {
            title: '7 дней',
            value: [format(subDays(new Date(), 7), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        },
        {
            title: '30 дней',
            value: [format(subDays(new Date(), 30), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        },
        {
            title: '90 дней',
            value: [format(subDays(new Date(), 90), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        },
        {
            title: '365 дней',
            value: [format(subDays(new Date(), 365), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')]
        }
    ] 

    const formatDay = (value) => {
        const day = String(value ?? '').slice(0, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
        return day.split('-').reverse().join('.')
    }

    const customLabel = computed(() => {
        const value = props.modelValue
        if (!Array.isArray(value) || value.length < 2) return null
        if (ranges.some(range => isEqual(range.value, value))) return null
        const start = formatDay(value[0])
        const end = formatDay(value[1])
        if (!start || !end) return null
        return start === end ? start : `${start} — ${end}`
    })
</script>
