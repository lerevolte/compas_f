<template>
    <div class="form__item form__item_date" ref="dateRef" :class="{'error': props.error.state, 'form__item_date_range': props.options.multiple}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }} 
        </label>
        <VueDatePicker
            :class="{'dp__main_bottom': props.isPreventBottom}"
            :id="props.options.id"
            :model-value="modelValue"
			:no-swipe="false"
			:auto-apply="!props.options.multiple"
			:enable-time-picker="false"
			:max-time="{ hours: 0, minutes: 0, seconds: 0 }"
			:month-change-on-scroll="true"
			:multi-calendars="props.options.multiple"
			:range="props.options.multiple"
			locale="ru"
			ref="datepicker"
			position="left"
			hide-offset-dates
			format="dd.MM.yyyy"
			:placeholder="'__.__.____'"
			:teleport="true"
			:menu-class-name="props.options.multiple ? 'datepicker__menu datepicker__menu_range' : 'datepicker__menu'"
            @update:modelValue="emit('update:modelValue',  $event ? props.options.multiple ? [format($event[0], `yyyy-MM-dd'T'00:00:00.000000'Z'`), format($event[1], `yyyy-MM-dd'T'00:00:00.000000'Z'`)] : format($event, `yyyy-MM-dd'T'00:00:00.000000'Z'`) : null)"
            @open="datepickerField.open()"
            @range-start="onRangeStart"
            @range-end="onRangeEnd"
        >
            <template #right-sidebar>
				<div class="datapicker__preset-days">
					<div
						class="datapicker__preset-item"
						v-for="day in datepickerField.preset[props.options.multiple ? 'multiple' : 'default']"
                        :class="{'datapicker__preset-item_active': isEqual(day.day, props.modelValue)}"
                        :key="day.id"
                        @click="emit('update:modelValue', day.day); datepicker?.closeMenu()"
					>
						{{ day.title }}
					</div>
				</div>
			</template>
            <template
                #left-sidebar
                v-if="props.options.multiple"
			>
				<div class="datapicker__footer">
					<div class="datepicker__inputs">
						<AppInput
							:options="{
                                id: 0,
                                title: null,
                                type: 'text',
                                name: 'date',
                                focus: false,
                                placeholder: '__.__.____',
                                mask: '##.##.####',
                                required: false
							}"
                            v-model="datepickerField.inputRange.start"
                            @blur="datepickerField.setInputsValue()"
						/>
						—
						<AppInput
							:options="{
                                id: 0,
                                title: null,
                                type: 'text',
                                name: 'date',
                                focus: false,
                                placeholder: '__.__.____',
                                mask: '##.##.####',
                                required: false
							}"
                            v-model="datepickerField.inputRange.end"
                            @blur="datepickerField.setInputsValue()"
						/>
					</div>

					<AppButton class="button_fill" @click="datepickerField.apply()">
						Применить
					</AppButton>
				</div>
			</template>
    
        </VueDatePicker>
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
    </div>
</template>

<script setup>
    import './Date.scss';
    
    import isEqual from 'lodash/isEqual'
    import VueDatePicker from '@vuepic/vue-datepicker';
    import '@vuepic/vue-datepicker/dist/main.css'
    import { 
        format, 
        subDays, 
        addDays, 
        startOfMonth, 
        endOfMonth, 
        startOfQuarter, 
        endOfQuarter, 
        startOfYear, 
        endOfYear, 
        subMonths, 
        subQuarters, 
        subYears,
        parseISO,
        compareAsc
    } from 'date-fns'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppError from '@AppComponents/Error/Error.vue'
    import AppButton from '@AppComponents/Button/Button.vue'

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
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        modelValue: [String, Date, Array],
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        }
    })

    const datepicker = ref(null)

    const emit = defineEmits([
        'update:modelValue',
        'open'
    ])

    class Datepicker {
        constructor() {
            this.inputRange = {
                start: null,
                end: null
            }
            const now = new Date()
            this.preset = {
                default: [
                    {
                        id: 0,
                        title: "Вчера",
                        day: format(subDays(now, 1), 'yyyy-MM-dd'),
                    },
                    {
                        id: 1,
                        title: "Сегодня",
                        day: format(now, 'yyyy-MM-dd'),
                    },
                    {
                        id: 2,
                        title: "Завтра",
                        day: format(addDays(now, 1), 'yyyy-MM-dd'),
                    },
                    {
                        id: 3,
                        title: "Послезавтра",
                        day: format(addDays(now, 2), 'yyyy-MM-dd'),
                    },
                ],
                multiple: [
                    {
                        id: 0,
                        title: "Сегодня",
                        day: [format(now, 'yyyy-MM.dd'), format(now, 'yyyy-MM.dd')],
                    },
                    {
                        id: 1,
                        title: "Завтра",
                        day: [format(addDays(now, 1), 'yyyy-MM.dd'), format(addDays(now, 1), 'yyyy-MM.dd')],
                    },
                    {
                        id: 2,
                        title: "Текущий месяц",
                        day: [format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')],
                    },
                    {
                        id: 3,
                        title: "Прошлый месяц",
                        day: [format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')],
                    },
                    {
                        id: 4,
                        title: "Текущий квартал",
                        day: [format(startOfQuarter(now), 'yyyy-MM-dd'),format(endOfQuarter(now), 'yyyy-MM-dd')],
                    },
                    {
                        id: 5,
                        title: "Прошлый квартал",
                        day: [format(startOfQuarter(subQuarters(now, 1)), 'yyyy-MM-dd'), format(endOfQuarter(subQuarters(now, 1)), 'yyyy-MM-dd')],
                    },
                    {
                        id: 5,
                        title: "Текущий год",
                        day: [format(startOfYear(now), 'yyyy-MM-dd'),  format(endOfYear(now), 'yyyy-MM-dd')],
                    },
                    {
                        id: 6,
                        title: "Прошлый год",
                        day: [format(startOfYear(subYears(now, 1)), 'yyyy-MM-dd'), format(endOfYear(subYears(now, 1)), 'yyyy-MM-dd')],
                    },
                ]
            }
        }

        ownPopups() {
            const owners = new Set()
            let node = dateRef.value
            while (node) {
                const content = node.closest?.('.popup__content')
                const ownerId = content?.dataset?.popupOwner
                if (!ownerId) break
                const root = document.querySelector(`.popup[data-popup-id="${ownerId}"]`)
                if (!root || owners.has(root)) break
                owners.add(root)
                node = root.parentElement
            }
            return owners
        }

        open() {
            const owners = this.ownPopups()
            document.querySelectorAll('.popup_open').forEach(el => {
                if (owners.has(el)) return
                el.classList.remove('popup_open')
            })
            document.querySelectorAll('.status_open').forEach(el => el.classList.remove('status_open'))
            document.querySelectorAll('.select_open').forEach(el => el.classList.remove('select_open'))
            emit('open', dateRef.value)
        }
        getInputsValue(value) {
            if (props.options.multiple) {
                if (value) {
                    if (Array.isArray(value)) {
                        this.inputRange.start = format(value[0], 'dd.MM.yyyy')
                        this.inputRange.end = format(value[1], 'dd.MM.yyyy')
                    } else {
                        if (value) {
                            this.inputRange.start = format(value, 'dd.MM.yyyy')
                            this.inputRange.end = format(value, 'dd.MM.yyyy')
                        }
                    }

                }
            }
        }
        setInputsValue() {
            const checkDate = (value) => {
                if (value.split('.').length == 3) {
                    return {
                        state: true,
                        value: value.split('.').reverse().join('-')
                    }
                } else {
                    return {
                        state: false,
                        value: value.split('.').reverse().join('-')
                    }
                }
            }

            const start = checkDate(this.inputRange.start)
            const end = checkDate(this.inputRange.end)

            if (start.state && end.state) {
                emit('update:modelValue', [start.value, end.value])
            }
        }
        apply() {
            datepicker.value?.selectDate()
            datepicker.value?.closeMenu()
        }
    }

    const datepickerField = ref(new Datepicker())
    const range = ref([])

    const onRangeStart = (value) => {
        range.value = []
        range.value.push(value)
    }

    const onRangeEnd = (value) => {
        range.value.push(value)
        const request = range.value.map(p => new Date(p).getTime()).sort((a, b) => a - b).map(p => format(p, 'yyyy-MM-dd'))
        datepickerField.value.getInputsValue(request)
    }

    onMounted(() => {
        nextTick(() => {
            if (props.options?.focus) {
                if (datepicker.value) {
                    datepicker.value.openMenu();
                }
            }
        });
        datepickerField.value.open()
        datepickerField.value.getInputsValue(props.modelValue)
    })

    watch(() => props.modelValue, () => {
        datepickerField.value.getInputsValue(props.modelValue)
    })
</script>
