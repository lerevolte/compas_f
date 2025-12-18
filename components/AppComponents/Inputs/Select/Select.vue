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
                <AppInput 
                    ref="searchRef"
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
                    <div class="select__value" v-for="option in activeOption" @click.stop="select.changeValue(option)">
                        {{ option?.label }}

                        <IconClose />
                    </div>
                </div>
                <div class="select__value select__value_single" :class="{ 'select__value_typing': select.state.search.length > 0 }" v-else>
                    {{ props.options.type == 'relation' ? activeOption?.label.text : activeOption?.label }}
                </div>

                <slot></slot>
    
                <IconSelectArrow />
            </div>
            <div class="select__options" ref="contentRef" :class="{ 'popup__content_top': select.state.isTop }">
                <div class="select__option" v-if="props.options.isHaveNull && !props.options.multiple" :value="null" @click="select.changeValue({ value: null })">
                    Не выбрано
                </div>

                <div 
                    class="select__option" 
                    v-for="option in select.state.visibleList" 
                    :class="{ 'select__option_active': props.modelValue && (Array.isArray(props.modelValue) ? (props.modelValue.length > 0 && props.modelValue.includes(option.value)) : props.modelValue == option.value)}" 
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
    import api from '@/helpers/api.js'
    import throttle from 'lodash/throttle'
    import isEqual from 'lodash/isEqual'
    import AppError from '@AppComponents/Error/Error.vue'

    const selectRef = ref(null)
    const contentRef = ref(null)
    const selectValuesRef = ref(null)
    const searchRef = ref(null)

    const emit = defineEmits([
        'update:modelValue',
        'update:prevValue',
        'update:modelList'
    ])

    class Select {
        constructor() {
            this.state = reactive({
                list: [],
                visibleList: [],
                search: '',
                isOpen: false,
                lastTab: null,
                inputPaddingLeft: 0,
                inputPaddingTop: 0
            });

            this.resizeObserver = null;
            this.mutationObserver = null;

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
                    this.state.visibleList = response.data.map(p => ({ label: p.text, value: JSON.parse(JSON.stringify(p)) }))
                } else {
                    if (props.options.subtype == 'map_suggest') {
                        response = await api.callMethod("GET", `/map/suggest?restrict=city&address=${value}`)
                        this.state.list = response.data.map(p => ({ label: p, value: p }))
                        this.state.visibleList = response.data.map(p => ({ label: p, value: p }))
                    } else {
                        response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${value}`)
                        this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
                        this.state.visibleList = response.data.map(p => ({ label: p.label, value: p.value }))
                    }
                    emit('update:modelList', this.state.list)
                }
            }, 100);
        }

        // Получение активных опций
        getActiveOptions(value) {
            if (props.options.multiple) {
                if (value == null || value == '' || (Array.isArray(value) && value.length === 0)) {
                    return [];
                }
                return value.map(option => this.state.list.find(p => p.value == option));
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
                this.state.visibleList = props.options.list.filter(p => p.label.toLowerCase().includes(value.toLowerCase()))
            }
        }

        // Изменение значения
        changeValue(option) {
            if (props.options.multiple) {
                const isRemoving = props.modelValue && props.modelValue.includes(option.value);
                
                if (props.modelValue == null) {
                    emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
                    emit('update:modelValue', [option.value])
                } else {
                    if (isRemoving) {
                        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
                        emit('update:modelValue', props.modelValue.filter(p => p != option.value))
                    } else {
                        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
                        emit('update:modelValue', [...props.modelValue, option.value])
                    }
                }
                
                // Очищаем поиск и восстанавливаем список опций
                this.state.search = '';
                this.setOptions();
                
                // Если удаляем плашку, открываем селект
                if (isRemoving) {
                    this.state.isOpen = true;
                    document.addEventListener('click', this.closeOptions);
                    nextTick(() => {
                        this.checkPosition();
                        if (searchRef.value?.inputRef) {
                            searchRef.value.inputRef.focus();
                        }
                    });
                } else {
                    // Фокус на инпут после изменения значения
                    nextTick(() => {
                        if (searchRef.value?.inputRef) {
                            searchRef.value.inputRef.focus();
                        }
                    });
                }
            } else {
                this.toggleOptions()
                emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
                if (props.options?.isFullOption) {
                    emit('update:modelValue', option)
                } else {
                    emit('update:modelValue', props.options.type == 'address' ? option.value : String(option.value))
                }
                // Очищаем поиск и восстанавливаем список опций
                this.state.search = '';
                this.setOptions();
            }
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (props.options.edit == false) return
            
            // Если клик на плашку в множественном селекте - не переключаем состояние
            if (props.options.multiple && event && event.target.closest('.select__value')) {
                return;
            }
            
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                nextTick(() => {
                    this.checkPosition();
                    if (searchRef.value?.inputRef) {
                        searchRef.value.inputRef.focus();
                    }
                });
            } else {
                this.state.search = ''
                this.state.isTop = false
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                    this.state.visibleList = props.options.list
                }
                if (selectRef.value?.querySelector('input')) {
                    selectRef.value.querySelector('input').blur();
                }
                document.removeEventListener('click', this.closeOptions);
            }
        }
        
        setOptions() {
            if (props.options.type == 'address') {
                this.state.list = props.options.list ?? []
                this.state.visibleList = props.options.list ?? []
                
                if (props.modelValue && Array.isArray(this.state.list) && !this.state.list.find(p => isEqual(p.value, props.modelValue))) {
                    const option = JSON.parse(JSON.stringify(props.modelValue))
                    this.state.list.push({label: option.text, value: option})
                }
            } else {
                this.state.list = props.options.list ?? []
                this.state.visibleList = props.options.list ?? []
            }
        }

        checkPosition() {
            if (!contentRef.value || !selectRef.value) return;

            const parentRect = props.parentContainer ? props.parentContainer.getBoundingClientRect() : {bottom: window.innerHeight};
            const contentRect = contentRef.value.getBoundingClientRect();
            
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > parentRect.bottom;
        }

        // Обновление позиции инпута относительно последней плашки
        updateInputPosition() {
            if (!props.options.multiple || !selectValuesRef.value || !selectRef.value || !searchRef.value?.inputRef) {
                this.setInputPadding(15, 10);
                return;
            }

            const values = selectValuesRef.value.querySelectorAll('.select__value');
            if (values.length === 0) {
                this.setInputPadding(15, 10);
                return;
            }

            const inputElement = searchRef.value.inputRef;
            const inputRect = inputElement.getBoundingClientRect();
            const lastValue = values[values.length - 1];
            const lastValueRect = lastValue.getBoundingClientRect();
            
            // Вычисляем padding-left: позиция последней плашки относительно инпута
            const paddingLeft = lastValueRect.right - inputRect.left + 5; // 5px - gap между плашками
            
            // Вычисляем padding-top: если плашки переносятся на новую строку
            const paddingTop = lastValueRect.top - inputRect.top;
            
            this.setInputPadding(Math.max(15, paddingLeft), Math.max(10, paddingTop));
        }

        // Установка паддингов для инпута
        setInputPadding(left, top) {
            if (!searchRef.value?.inputRef) return;
            
            const inputElement = searchRef.value.inputRef;
            this.state.inputPaddingLeft = left;
            this.state.inputPaddingTop = top;
            
            // Применяем паддинги напрямую к input элементу
            inputElement.style.paddingLeft = left + 'px';
            inputElement.style.paddingTop = top + 'px';
        }

        // Инициализация ResizeObserver и MutationObserver
        initResizeObserver() {
            if (!props.options.multiple || !selectValuesRef.value) return;

            // ResizeObserver для отслеживания изменений размера элементов
            this.resizeObserver = new ResizeObserver(() => {
                this.updateInputPosition();
            });

            this.resizeObserver.observe(selectValuesRef.value);

            // MutationObserver для отслеживания добавления/удаления плашек
            this.mutationObserver = new MutationObserver(() => {
                this.updateInputPosition();
                // Обновляем список наблюдаемых элементов
                this.observeValueElements();
            });

            this.mutationObserver.observe(selectValuesRef.value, {
                childList: true,
                subtree: true
            });

            // Начальное наблюдение за существующими элементами
            this.observeValueElements();
        }

        // Наблюдение за всеми плашками значений
        observeValueElements() {
            if (!selectValuesRef.value || !this.resizeObserver) return;

            const values = selectValuesRef.value.querySelectorAll('.select__value');
            values.forEach(value => {
                this.resizeObserver.observe(value);
            });
        }

        // Очистка всех observers
        cleanupResizeObserver() {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
                this.mutationObserver = null;
            }
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
        
        // Инициализируем observer для множественного селекта
        if (props.options.multiple) {
            nextTick(() => {
                select.initResizeObserver();
                select.updateInputPosition();
            });
        }
    })

    watch(() => props.options.list, () => {
        select.setOptions()
    })

    // Отслеживаем изменения в выбранных значениях для обновления позиции инпута
    watch(() => props.modelValue, () => {
        if (props.options.multiple) {
            nextTick(() => {
                select.updateInputPosition();
            });
        }
    }, { deep: true })

    watch(() => props.options?.edit, (next, prev) => {
        if (next) {
            if (props.options?.focus) {
                setTimeout(() => {
                    select.toggleOptions()
                }, 10);
            }
        }
    }, { immediate: true })


    onBeforeUnmount(() => {
        document.removeEventListener('click', select.closeOptions);
        select.cleanupResizeObserver();
    });
</script>
