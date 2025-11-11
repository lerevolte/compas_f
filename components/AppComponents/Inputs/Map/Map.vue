<template>
    <div class="form__item form__item_select" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id">
            {{ props.options.title }}
        </label>

        <div class="select" ref="selectRef" :class="{ 'select_open': select.state.isOpen, 'select_icon': props.options.have_icon }">
            <div class="select__content" @click="event => select.toggleOptions(event)">
                <IconWarning v-if="props.options.required && !select.getActiveOptions(props.modelValue)"/>

                <AppInput 
                    :options="{
                        id: 'select',
                        title: '',
                        type: 'text',
                        name: '',
                        mask: null,
                        autocomplete: 'off',
                        placeholder: ''
                    }"
                    @update:modelValue="(value) => select.filterOptions(value)"
                    v-model="select.state.search"
                />
    
                <div class="select__values" ref="selectValuesRef" v-if="props.options.multiple">
                    <div class="select__value" v-for="option in select.getActiveOptions(props.modelValue)" @click="select.changeValue(option)">
                        {{ option.label }}

                        <IconClose />
                    </div>
                </div>
                <div class="select__value select__value_single" :class="{ 'select__value_typing': select.state.search.length > 0 }" v-else>
                    <template v-if="props.options.have_icon">
                        <figure class='select__value-icon' v-if="select.getActiveOptions(props.modelValue)">
                            <img :src='select.getActiveOptions(props.modelValue).label?.attachment.thumbnail_path' alt=''>
                            <figcaption>
                                {{ select.getActiveOptions(props.modelValue).label?.name }}
                            </figcaption>
                        </figure>

                        <figure class='select__value-icon' v-else>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="20" fill="#404040"/>
                                <path d="M24.6 13H26.06V27H24.6V13ZM15.84 27H14.36V13H15.84V27ZM24.74 20.54H15.68V19.24H24.74V20.54Z" fill="white"/>
                            </svg>
                            <figcaption>
                                Не выбрано
                            </figcaption>
                        </figure>
                    </template>
                    <template v-else>
                        {{ select.getActiveOptions(props.modelValue)?.label }}
                    </template>
                </div>
    
                <IconSelectArrow />
            </div>
            <div class="select__options">
                <div class="select__option" v-if="props.isHaveNull && !props.options.multiple" :value="null" @click="select.changeValue({ value: null })">
                    Не выбрано
                </div>

                <div 
                    class="select__option" 
                    v-for="option in select.state.list" 
                    :class="{ 'select__option_active': props.modelValue && (props.modelValue == option.value || (Array.isArray(props.modelValue) && props.modelValue.includes(option.value)))}" 
                    :value="option.value" 
                    @click="select.changeValue(option)"
                >
                    {{ option.label.name ? option.label.name : option.label }}
                </div>
            </div>
        </div>

        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
    </div>
</template>

<script setup>
    import './Map.scss';
    
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import IconClose from '@AppIcons/Close.vue';
    import IconWarning from '@AppIcons/Warning.vue';
    import api from '@/helpers/api.js'
    import throttle from 'lodash/throttle'
    import AppError from '@AppComponents/Error/Error.vue'

    const selectRef = ref(null)
    const selectValuesRef = ref(null)

    const emit = defineEmits([
        'update:modelValue'
    ])

    class Select {
        constructor() {
            this.selectRef = selectRef;
            this.selectValuesRef = selectValuesRef

            this.state = reactive({
                list: [],
                search: '',
                isOpen: false
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                if (this.selectRef.value && !this.selectRef.value.contains(event.target)) {
                    this.state.isOpen = false;
                    this.state.search = ''
                    this.state.list = props.options.list
                    document.removeEventListener('click', this.closeOptions);
                }
            };

            // Объявляем `throttle` один раз
            this.throttledFilter = throttle(async (value) => {
                let response = await api.callMethod("GET", `/${props.options.relation}?filter[q]=${value}`)
                this.state.list = response.data.data.map(p => ({ label: p.name, value: p.id }))
            }, 100);
        }

        // Получение активных опций
        getActiveOptions(value) {
            if (props.options.multiple) {
                return value == null ? [] : value.map(option => this.state.list.find(p => p.value == option));
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
                emit('update:modelValue', option.value)
            }
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (props.options.multiple && this.state.isOpen && this.selectValuesRef.value.contains(event.target)) return
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
            } else {
                this.state.search = ''
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                }
                selectRef.value.querySelector('input').blur();
                document.removeEventListener('click', this.closeOptions);
            }
        }
    }

    const select = new Select(selectRef, selectValuesRef)

    const props = defineProps({
        options: {
            default: {
                id: 0,
                title: '',
                list: [],
                name: '',
                relation: null,
                searchable: false,
                required: false,
                have_icon: false,
                isHaveNull: false,
                multiple: false,
                placeholder: '' 
            },
            type: Object
        },
        isPreventBottom: {
            default: false,
            type: Boolean
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
        select.state.list = props.options.list ?? []
    })

    watch(() => props.options.list, () => {
        select.state.list = props.options.list ?? []
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', select.closeOptions);
    });
</script>
