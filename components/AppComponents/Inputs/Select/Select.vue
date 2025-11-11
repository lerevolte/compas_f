<template>
    <div class="form__item form__item_select" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div 
            class="select" 
            ref="selectRef" 
            :class="{ 
                'select_open': select.state.isOpen, 
                'select_disabled': props.options.edit == false, 
                'select_empty': activeOption == undefined 
            }">
            <div class="select__content" @click="event => select.toggleOptions(event)">
                <IconWarning v-if="props.options.required && !activeOption"/>

                <AppInput 
                    :options="{
                        id: `${props.options.id}_search`,
                        title: '',
                        type: 'text',
                        name: '',
                        mask: null,
                        autocomplete: 'off',
                        placeholder: ''
                    }"
                    :model-value="select.state.search"
                    @update:modelValue="(value) => { select.state.search = value; select.filterOptions(value); }"
                />
    
                <div class="select__values" ref="selectValuesRef" v-if="props.options.multiple">
                    <div class="select__value" v-for="option in activeOption" @click="select.changeValue(option)">
                        {{ option?.label }}

                        <IconClose />
                    </div>
                </div>
                <div class="select__value select__value_single" :class="{ 'select__value_typing': select.state.search.length > 0 }" v-else>
                    {{ props.options.type == 'relation' ? activeOption?.label.text : activeOption?.label }}
                </div>
    
                <IconSelectArrow />
            </div>
            <div class="select__options" ref="contentRef" :class="{ 'popup__content_top': select.state.isTop }">
                <div class="select__option" v-if="props.options.isHaveNull && !props.options.multiple" :value="null" @click="select.changeValue({ value: null })">
                    Не выбрано
                </div>

                <div 
                    class="select__option" 
                    v-for="option in select.state.list" 
                    :class="{ 'select__option_active': props.modelValue && (props.modelValue == option.value || (Array.isArray(props.modelValue) && props.modelValue.includes(option.value)))}" 
                    :value="option.value" 
                    @click="select.changeValue(option)"
                >
                    <span class="value__text">
                        {{ option.label.text ? option.label.text : option.label }} 
                    </span>
                </div>
            </div>
        </div>

        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
    </div>
</template>

<script setup>
    import './Select.scss';
    
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import IconClose from '@AppIcons/Close.vue';
    import IconWarning from '@AppIcons/Warning.vue';
    import api from '@/helpers/api.js'
    import throttle from 'lodash/throttle'
    import isEqual from 'lodash/isEqual'
    import AppError from '@AppComponents/Error/Error.vue'

    const selectRef = ref(null)
    const contentRef = ref(null)
    const selectValuesRef = ref(null)

    const emit = defineEmits([
        'update:modelValue',
        'update:modelList'
    ])

    class Select {
        constructor() {
            this.state = reactive({
                list: [],
                search: '',
                isOpen: false
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                if (selectRef.value && !selectRef.value.contains(event.target)) {
                    this.state.isOpen = false;
                    this.state.search = ''
                    this.state.isTop = false;
                    this.setOptions()
                    document.removeEventListener('click', this.closeOptions);
                }
            };

            // Объявляем `throttle` один раз
            this.throttledFilter = throttle(async (value) => {
                let response = null
                if (props.options.type == 'address') {
                    response = await api.callMethod("GET", `/map/geocode?address=${value}`)
                    this.state.list = response.data.map(p => ({ label: p.text, value: JSON.parse(JSON.stringify(p)) }))
                } else {
                    response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${value}`)
                    this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
                    emit('update:modelList', this.state.list)
                }
            }, 100);
        }

        // Получение активных опций
        getActiveOptions(value) {
            if (props.options.multiple) {
                return value == null || value == '' ? [] : value.map(option => this.state.list.find(p => p.value == option));
            } else if (props.options.type == 'address') {
                return this.state.list ? this.state.list.find(p => isEqual(p.value, value)) : null
            } else {
                return this.state.list ? this.state.list.find(p => p.value == value) : null
            }
        }

        // Фильтрация опций
        async filterOptions(value) {
            if (props.options.searchable) {
                this.throttledFilter(value)
            } else {
                this.state.list = props.options.list.filter(p => p.label.toLowerCase().includes(value.toLowerCase()))
            }
        }

        // Изменение значения
        changeValue(option) {
            if (props.options.multiple) {
                if (props.modelValue == null) {
                    console.log('null');
                    emit('update:modelValue', [option.value])
                } else {
                    if (props.modelValue.includes(option.value)) {
                        emit('update:modelValue', props.modelValue.filter(p => p != option.value))
                    } else {
                        emit('update:modelValue', [...props.modelValue, option.value])
                    }
                }
            } else {
                this.toggleOptions()
                emit('update:modelValue', String(option.value))
            }
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (props.options.edit == false) return
            if (props.options.multiple && this.state.isOpen && selectValuesRef.value.contains(event.target)) return
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                nextTick(() => this.checkPosition());
            } else {
                this.state.search = ''
                this.state.isTop = false
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                }
                selectRef.value.querySelector('input').blur();
                document.removeEventListener('click', this.closeOptions);
            }
        }
        
        setOptions() {
            if (props.options.type == 'address') {
                this.state.list = props.options.list ?? []
                
                if (props.modelValue && Array.isArray(this.state.list) && !this.state.list.find(p => isEqual(p.value, props.modelValue))) {
                    const option = JSON.parse(JSON.stringify(props.modelValue))
                    this.state.list.push({label: option.text, value: option})
                }
            } else {
                this.state.list = props.options.list ?? []
            }
        }

        checkPosition() {
            if (!contentRef.value || !selectRef.value) return;

            const parentRect = props.parentContainer ? props.parentContainer.getBoundingClientRect() : selectRef.value.getBoundingClientRect();
            const contentRect = contentRef.value.getBoundingClientRect();
            
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > parentRect.bottom;
        }
    }

    const select = new Select()

    const activeOption = computed(() => select.getActiveOptions(props.modelValue))

    const props = defineProps({
        parentContainer: {
            default: null
        },
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        options: {
            default: {
                id: 0,
                title: '',
                list: [],
                name: '',
                edit: true,
                relation: null,
                searchable: false,
                required: false,
                isHaveNull: false,
                multiple: false,
                type: 'select',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null,
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        }
    })

    onMounted(() => {
        select.setOptions()
    })

    watch(() => props.options.list, () => {
        select.setOptions()
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', select.closeOptions);
    });
</script>
