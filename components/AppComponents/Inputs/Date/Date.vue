<template>
    <div class="form__item form__item_date" ref="dateRef">
        <label :for="props.options.id" v-if="props.options.title && props.options.title != ''">
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
            @update:modelValue="emit('update:modelValue', props.options.multiple ? [format($event[0], `yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'`), format($event[1], `yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'`)] : format($event, `yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'`))"
            @open="datepickerField.open()"
            />
    </div>
</template>

<script setup>
    import './Date.scss';
    
    import VueDatePicker from '@vuepic/vue-datepicker';
    import '@vuepic/vue-datepicker/dist/main.css'
    import { format } from 'date-fns'

    const dateRef = ref(null)

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

    const emit = defineEmits([
        'update:modelValue',
        'open'
    ])

    class Datepicker {
        constructor() {

        }

        // Открытие датапикера
        open() {
            document.querySelectorAll('.popup_open').forEach(el => el.classList.remove('popup_open'))
            document.querySelectorAll('.status_open').forEach(el => el.classList.remove('status_open'))
            document.querySelectorAll('.select_open').forEach(el => el.classList.remove('select_open'))
            emit('open', dateRef.value)
        }
    }

    const datepickerField = ref(new Datepicker())
</script>
