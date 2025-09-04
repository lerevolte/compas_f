<template>
    <div class="form__item form__item_date">
        <label :for="props.options.id">
            {{ props.options.title }}
        </label>
        <VueDatePicker 
            :id="props.options.id"
            :model-value="modelValue"
			:no-swipe="false"
			:auto-apply="true"
			:enable-time-picker="false"
			:max-time="{ hours: 0, minutes: 0, seconds: 0 }"
			:month-change-on-scroll="true"
			:multi-calendars="props.options.multiple"
			:range="props.options.multiple"
			locale="ru"
			ref="datepicker"
			position="center"
			hide-offset-dates
			format="dd.MM.yyyy"
			:placeholder="'__.__.____'"
            @update:modelValue="emit('update:modelValue', $event)"
        />
    </div>
</template>

<script setup>
    import './Date.scss';
    
    import VueDatePicker from '@vuepic/vue-datepicker';
    import '@vuepic/vue-datepicker/dist/main.css'

    const emit = defineEmits([
        'update:modelValue'
    ])
    
    const props = defineProps({
        options: {
            default: {
                 id: 0,
                 title: '',
                 type: '',
                 name: '',
                 multiple: false,
                 placeholder: ''
            },
            type: Object
        },
        modelValue: [String, Date, Array]
    })
</script>
