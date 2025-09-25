<template>
    <div class="form__item form__item_select">
        <label :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div 
            v-for="selectItem in props.modelValue.value"
            class="select select_icon" 
            ref="selectRef" 
            :class="{ 
                'select_open': select.state.isOpen, 
                'select_disabled': props.options.edit == false, 
                'select_empty': activeOption == undefined 
            }"
        >
            <div class="select__content" @click="event => select.toggleOptions(event)">
                {{ selectItem }}
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
                    @update:modelValue="(value) => select.filterOptions(value)"
                    v-model="select.state.search"
                />
    
                <div class="select__value select__value_single" :class="{ 'select__value_typing': select.state.search.length > 0 }">
                    <template>
                        <figure class='select__value-icon' v-if="activeOption">
                            <img 
                                v-if="typeof activeOption.label?.file == 'string' && activeOption.label?.file != ''" :src='activeOption.label?.file' alt=''
                                @click="emit('clickLink', activeOption.value)" 
                            >
                            <div 
                                v-else 
                                class="img-text" 
                                :style="{ 
                                    '--bgColor': activeOption.label?.color == '' || !activeOption.label?.color? '#a6b7d4' : activeOption.label?.color 
                                }"
                                @click="emit('clickLink', activeOption.value)" 
                            >
                                {{ activeOption.label?.text.slice(0, 1) }}
                            </div>
                            <figcaption>
                                <span class="value__text value__text_link" @click="emit('clickLink', activeOption.value)">
                                    {{ activeOption.label?.text }}  
                                </span>
                                <span class="value__text">
                                    {{ activeOption.value }}
                                </span>
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
                </div>
    
                <IconSelectArrow />
            </div>
            <div class="select__options">
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
                    <span class="value__text value__text_subtext">
                        ID: {{ option.value }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Relation.scss';
    
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import IconWarning from '@AppIcons/Warning.vue';
    import api from '@/helpers/api.js'
    import throttle from 'lodash/throttle'

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
                    this.setOptions()
                    document.removeEventListener('click', this.closeOptions);
                }
            };

            // Объявляем `throttle` один раз
            this.throttledFilter = throttle(async (value) => {
                let response = null
                response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${value}`)
                this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
            }, 100);
        }

        get() {
            if (!Array.isArray(props.modelValue.value)) {
                emit('update:modelValue', [props.modelValue.value])
            }
        }

        // Получение активных опций
        getActiveOptions(value) {
            // return this.state.list ? this.state.list.find(p => p.value == value) : null
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
            this.toggleOptions()
            emit('update:modelValue', option.value)
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (props.options.edit == false) return
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
        
        setOptions() {
            this.state.list = props.options.list ?? []
        }
    }

    const select = new Select(selectRef, selectValuesRef)
    const activeOption = computed(() => select.getActiveOptions(props.modelValue))

    const props = defineProps({
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
                have_icon: false,
                isHaveNull: false,
                multiple: false,
                type: 'select',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null
    })

    onMounted(() => {
        select.get()
        select.setOptions()
    })

    watch(() => props.options.list, () => {
        select.setOptions()
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', select.closeOptions);
    });
</script>
