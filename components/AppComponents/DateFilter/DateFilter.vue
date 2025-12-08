<template>
    <div class="date-fitler">
        <div class="date-fitler__item" @click="emit('update:modelValue', subDays(props.modelValue, 1))">
            {{ format(subDays(props.modelValue, 1), 'dd.MM') }}
        </div>
        <div class="date-fitler__item date-fitler__item_active">
            {{ format(props.modelValue, 'dd.MM.yyyy') }}
        </div>
        <div class="date-fitler__item" @click="emit('update:modelValue', addDays(props.modelValue, 1))">
            {{ format(addDays(props.modelValue, 1), 'dd.MM') }}
        </div>
        
        <AppDate 
            class="date-fitler__date"
            v-model="inputDateValue"
            :options="{
                id: 0,
                title: '',
                type: '',
                name: '',
                multiple: false,
                placeholder: ''
            }"
        />
    </div>
</template>

<script setup>
    import './DateFilter.scss';
	import { format, subDays, addDays } from 'date-fns'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue'

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
</script>
