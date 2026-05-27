<template>
    <div class="form__item form__item_select" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div 
            v-for="(selectItem, index) in normalizedModelValue.value"
            :key="index"
            class="select select_icon select-container" 
            :ref="el => setSelectRef(el, index)"
            :data-id="index"
            :class="{ 
                'select_hidden': normalizedModelValue.value.length - (props.options?.visibleCount + 1 ?? 6) >= index, 
                'select_open': selectInstances[index]?.state.isOpen, 
                'select_disabled': props.options.edit == false, 
                'select_empty': getActiveOption(index) == undefined || !getActiveOption(index).value
            }"
        >
            <div class="select__content" @click="event => selectInstances[index]?.toggleOptions(event)">
                <div 
                    class="select__value select__value_single" 
                    :class="{ 
                        'select__value_typing': (selectInstances[index]?.state?.search?.length || 0) > 0,
                        'select_value_text': props.options.slug == 'roles'
                    }"
                >
                    <figure class='select__value-icon' v-if="getActiveOption(index)">
                        <img 
                            class="select__value-img"
                            v-if="typeof getActiveOption(index).label?.file == 'string' && getActiveOption(index).label?.file != ''" :src='getActiveOption(index).label?.file' alt=''
                            @click="() => clickLink(index)" 
                        >
                        <div 
                            v-else 
                            class="img-text" 
                            :style="{ 
                                '--bgColor': getActiveOption(index).label?.color == '' || !getActiveOption(index).label?.color? '#a6b7d4' : getActiveOption(index).label?.color 
                            }"
                            @click="() => clickLink(index)" 
                        >
                            {{ getActiveOption(index).value ? getActiveOption(index).label?.text?.slice(0, 1) : 'Н' }}
                        </div>
                        <figcaption>
                            <span class="value__text value__text_link" @click="() => clickLink(index)">
                                {{ getActiveOption(index)?.value ? getActiveOption(index).label?.text : 'Не выбрано' }}  
                            </span>
                        </figcaption>
                    </figure>

                    <figure class='select__value-icon' v-else>
                        <div 
                            class="img-text" 
                            :style="{ 
                                '--bgColor': '#a6b7d4'
                            }"
                        >
                            Н
                        </div>
                        <figcaption>
                            Не выбрано
                        </figcaption>
                    </figure>
                </div>
    
                <div class="select__content-container">
                    <AppInput 
                        :options="{
                            id: `${props.options.id}_search_${index}`,
                            title: '',
                            type: 'text',
                            name: '',
                            mask: null,
                            autocomplete: 'off',
                            placeholder: props.options.placeholder,
                        }"
                        @update:modelValue="(value) => selectInstances[index]?.filterOptions(value)"
                        :model-value="selectInstances[index]?.state?.search || ''"
                        @update:model-value="(value) => selectInstances[index]?.state && (selectInstances[index].state.search = value)"
                    />
    
                    <div class="select__content-abs">
                        <span class="value__text value__text_id">
                            ID: {{ getActiveOption(index)?.label?.id }}  
                        </span>
    
                        <IconSelectArrow />
        
                        <figure class='relation__arrow' @click="() => clickLink(index)" >
                            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="3" fill="none" viewBox="0 0 4 3"><path fill="#888" d="M0 0h4L2 3z"/></svg>
                        </figure>
                    </div>
                </div>
            </div>
            <div class="select__options" :class="{ 'popup__content_top': selectInstances[index]?.state?.isTop }">
                <div class="select__option" :value="null" @click="selectInstances[index]?.changeValue({ value: null }, index)">
                    Не выбрано
                </div>
                <div 
                    class="select__option" 
                    v-for="option in selectInstances[index]?.getList(index)" 
                    :class="{ 
                        'select__option_active': normalizedModelValue.value[index] == option.value,
                        'select__option_disabled': option.disabled
                    }" 
                    :value="option.value" 
                    @click="!option.disabled && selectInstances[index]?.changeValue(option, index)"
                >
                    <span class="value__text">
                        {{ option.label.text || option.label.text == null ? option.label.text : option.label }} 
                    </span>
                    <span class="value__text value__text_subtext">
                        ID: {{ option.value }}
                    </span>
                </div>

                <div class="select__option select__option_create" :value="null" @click="emit('create', {related_table: props.options.relation})">
                    Создать
                </div>
            </div>
        </div>
        
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>

        <div class="select__actions">
            <AppButton 
                v-if="normalizedModelValue.value.length > props.options?.visibleCount + 1 ?? 6"
                class="button_text"
                data-action="show"
                @click="emit('showAll', true)"
            >
                Всего {{normalizedModelValue.value.length}}, посмотреть все
            </AppButton>
            <AppButton 
                v-if="props.options.isCanAdd && props.options.multiple"
                class="button_text"
                data-action="add"
                @click="addNewSelect"
            >
                + Добавить
            </AppButton>
        </div>
    </div>
</template>

<script setup>
    import './Relation.scss';
    
    import AppButton from '@AppComponents/Button/Button.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import api from '@/helpers/api.js'
    import throttle from 'lodash/throttle'
    import AppError from '@AppComponents/Error/Error.vue'

    const selectRefs = ref([])
    const selectInstances = ref([])
    const clickedItem = ref(null)

    const emit = defineEmits([
        'update:modelValue',
        'clickLink',
        'update:prevValue',
        'showAll',
        'create'
    ])

    class Select {
        constructor(index) {
            this.index = index;
            this.selectRef = null;
            this.clickedItem = null;

            this.state = reactive({
                list: [],
                isTop: false,
                search: '',
                isOpen: false
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                // Если mousedown стартовал внутри селекта (пользователь выделяет текст
                // в инпуте и тянет мышь наружу), родившийся при отпускании click на
                // document не должен закрывать селект — иначе сбрасывается выделение.
                if (this._mousedownInside) {
                    this._mousedownInside = false
                    return
                }
                if (this.selectRef && !this.selectRef.contains(event.target)) {
                    this.state.isOpen = false;
                    this.state.search = ''
                    this.state.isTop = false
                    this.setOptions()
                    document.removeEventListener('click', this.closeOptions);
                    if (this._mousedownHandler) {
                        document.removeEventListener('mousedown', this._mousedownHandler)
                        this._mousedownHandler = null
                    }
                }
            };

            // Объявляем `throttle` один раз
            this.throttledFilter = throttle(async (value) => {
                let response = null

                if (props.options?.relation_type) {
                    response = await api.callMethod("GET", `/objects/search?entity=${props.options?.relation_type}&q=${value}`)
                } else {
                    response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${value}`)
                }

                this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
            }, 100);
        }

        setSelectRef(ref) {
            this.selectRef = ref;
        }

        // Получение активных опций
        getActiveOption(value, localOptions) {
            // Сначала проверяем localOptions из modelValue
            if (localOptions && localOptions[this.index]) {
                return localOptions[this.index];
            }
            // Затем ищем в текущем списке опций
            return this.state.list.find(p => p.value == value) || null;
        }

        // Фильтрация опций
        async filterOptions(value) {
            if (props.options.searchable) {
                this.throttledFilter(value)
            } else {
                this.state.list = props.options.list.filter(p => 
                    p.label.text ? p.label.text.toLowerCase().includes(value.toLowerCase()) : p.label.toLowerCase().includes(value.toLowerCase())
                )
            }
        }

        getList(selectIndex) {
            if (!props.modelValue || !props.modelValue.value) {
                return this.state.list ?? []
            }

            if (this.state?.list?.length > 0) {
                return this.state.list.map(p => {
                    return {
                        ...p,
                        disabled: normalizedModelValue.value.value[selectIndex] == p.value || props.modelValue.value.includes(p.value)
                    }
                })
            } 

            return []
        }

        // Изменение значения
        changeValue(option, selectIndex) {
            this.toggleOptions()
            updateModelValue(option.value, option, selectIndex);
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            clickedItem.value = event
            if (props.options.edit == false || (event && event.target.closest('.relation__arrow'))) return
            
            // Prevent closing when clicking inside input (text selection)
            if (this.state.isOpen && event?.target?.closest('input')) return
            
            // Закрываем все другие селекты
            selectInstances.value.forEach((instance, idx) => {
                if (idx !== this.index && instance.state.isOpen) {
                    instance.state.isOpen = false;
                    instance.state.isTop = false
                    instance.state.search = '';
                    instance.setOptions();
                    document.removeEventListener('click', instance.closeOptions);
                }
            });

            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                // Запоминаем где начался mousedown — если внутри селекта, не закрываем
                // на последующем click (пользователь тянет выделение наружу).
                this._mousedownHandler = (e) => {
                    this._mousedownInside = !!(this.selectRef && this.selectRef.contains(e.target))
                }
                document.addEventListener('mousedown', this._mousedownHandler)
                nextTick(() => this.checkPosition(event));

                // Fill search with current value text for editing
                const activeOpt = getActiveOption(this.index);
                if (activeOpt?.value) {
                    this.state.search = activeOpt.label?.text || '';
                }

                // Focus input
                nextTick(() => {
                    if (this.selectRef) {
                        const input = this.selectRef.querySelector('input');
                        if (input) input.focus();
                    }
                });
            } else {
                this.state.isTop = false;
                this.state.search = ''
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                }
                if (this.selectRef) {
                    const input = this.selectRef.querySelector('input');
                    if (input) input.blur();
                }
                document.removeEventListener('click', this.closeOptions);
                if (this._mousedownHandler) {
                    document.removeEventListener('mousedown', this._mousedownHandler)
                    this._mousedownHandler = null
                }
            }
        }
        
        checkPosition(event) {
            let popupRef = event.target.closest('.select')
            let contentRef = popupRef.querySelector('.select__options')

            if (!popupRef || !contentRef) return;

            let bottomBound;
            if (props.parentContainer) {
                bottomBound = props.parentContainer.getBoundingClientRect().bottom;
            } else {
                bottomBound = window.innerHeight;
                if (typeof document !== 'undefined') {
                    const massAction = document.querySelector('.mass-action');
                    if (massAction) {
                        const massRect = massAction.getBoundingClientRect();
                        if (massRect.top > 0 && massRect.top < bottomBound) {
                            bottomBound = massRect.top;
                        }
                    }
                }
            }
            const contentRect = contentRef.getBoundingClientRect();
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > bottomBound;
        }

        setOptions() {
            this.state.list = props.options.list ?? []
        }
    }

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
                isSetDefault: false,
                isHaveNull: false,
                relation_type: null,
                visibleCount: 5,
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

    // Функция нормализации modelValue
    const normalizeModelValue = (modelValue) => {
        if (!modelValue || typeof modelValue !== 'object') {
            return { value: [null], localOptions: [null] };
        }

        let normalizedValue = modelValue.value;
        let normalizedLocalOptions = modelValue.localOptions || [];

        // Если value не массив, делаем его массивом
        if (!Array.isArray(normalizedValue)) {
            normalizedValue = [normalizedValue];
        }

        // Если localOptions не массив или длина не совпадает, корректируем
        if (!Array.isArray(normalizedLocalOptions)) {
            normalizedLocalOptions = [normalizedLocalOptions];
        }

        // Дополняем localOptions до нужной длины
        while (normalizedLocalOptions.length < normalizedValue.length) {
            normalizedLocalOptions.push(null);
        }

        // Обрезаем localOptions если он длиннее
        if (normalizedLocalOptions.length > normalizedValue.length) {
            normalizedLocalOptions = normalizedLocalOptions.slice(0, normalizedValue.length);
        }

        return { value: normalizedValue, localOptions: normalizedLocalOptions };
    };

    // Реактивная нормализованная модель
    const normalizedModelValue = ref({ value: [null], localOptions: [null] });

    // Функция обновления нормализованных данных
    const updateNormalizedData = () => {
        const normalized = normalizeModelValue(props.modelValue);
        normalizedModelValue.value = normalized;
    };

    // Функция обновления modelValue
    const updateModelValue = (newValue, newOption, selectIndex) => {
        // Получаем текущие нормализованные данные
        const current = normalizedModelValue.value;
        
        
        // Создаем копии массивов
        const newValueArray = [...current.value];
        const newLocalOptionsArray = [...current.localOptions];
        
        // Обновляем только нужный индекс
        newValueArray[selectIndex] = newValue;
        newLocalOptionsArray[selectIndex] = newOption;
        
        
        // Обновляем внутренние данные
        normalizedModelValue.value = { value: newValueArray, localOptions: newLocalOptionsArray };      
        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
        emit('update:modelValue', { 
            value: newValueArray, 
            localOptions: newLocalOptionsArray 
        });
    };

    // Функция добавления нового селекта
    const addNewSelect = () => {
        // Получаем текущие нормализованные данные
        const current = normalizedModelValue.value;
        
        
        // Создаем копии массивов
        const newValueArray = [...current.value];
        const newLocalOptionsArray = [...current.localOptions];
        
        // Добавляем новые элементы
        newValueArray.push(null);
        newLocalOptionsArray.push(null);

        
        // Обновляем внутренние данные
        normalizedModelValue.value = { value: newValueArray, localOptions: newLocalOptionsArray };
        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
        emit('update:modelValue', { 
            value: newValueArray, 
            localOptions: newLocalOptionsArray 
        });
    };

    // Функция получения активной опции для конкретного селекта
    const getActiveOption = (index) => {
        const currentValue = normalizedModelValue.value.value[index];
        const localOptions = normalizedModelValue.value.localOptions;
        
        // Сначала проверяем localOptions из modelValue
        if (localOptions && localOptions[index]) {
            return localOptions[index];
        }
        
        // Затем ищем в списке опций компонента
        if (props.options.list && props.options.list.length > 0) {
            return props.options.list.find(p => p.value == currentValue) || null;
        }
        
        // Если есть экземпляр селекта, ищем в его списке
        const selectInstance = selectInstances.value[index];
        if (selectInstance && selectInstance.state.list && selectInstance.state.list.length > 0) {
            return selectInstance.state.list.find(p => p.value == currentValue) || null;
        }
        
        return null;
    };

    // Функция установки ref для селекта
    const setSelectRef = (el, index) => {
        if (el) {
            selectRefs.value[index] = el;
            if (selectInstances.value[index]) {
                selectInstances.value[index].setSelectRef(el);
            }
        }
    };

    // Инициализация экземпляров селектов
    const initializeSelects = () => {
        if (!normalizedModelValue.value || !normalizedModelValue.value.value) return;
        
        const currentValues = normalizedModelValue.value.value;
        
        // Удаляем лишние экземпляры
        while (selectInstances.value.length > currentValues.length) {
            const lastInstance = selectInstances.value.pop();
            if (lastInstance && lastInstance.selectRef) {
                document.removeEventListener('click', lastInstance.closeOptions);
            }
        }
        
        // Добавляем недостающие экземпляры
        while (selectInstances.value.length < currentValues.length) {
            const index = selectInstances.value.length;
            const newInstance = new Select(index);
            selectInstances.value.push(newInstance);
            
            // Устанавливаем ref если он уже существует
            if (selectRefs.value[index]) {
                newInstance.setSelectRef(selectRefs.value[index]);
            }
            
            newInstance.setOptions();
        }

        if (props.options.isSetDefault && (props.modelValue.value == null || props.modelValue.value.length == 0)) {
            addNewSelect()
        }
    };

    onMounted(() => {
        updateNormalizedData();
        initializeSelects();
    });

    watch(() => normalizedModelValue.value?.value?.length, () => {
        initializeSelects();
    });

    watch(() => props.modelValue, () => {
        updateNormalizedData();
        nextTick(() => {
            initializeSelects();
        });
    });

    watch(() => props.options.list, () => {
        selectInstances.value.forEach(instance => instance.setOptions());
    });

    watch(() => props.options?.edit, (next, prev) => {
        if (next) {
            if (props.options?.focus) {
                setTimeout(() => {
                    if (clickedItem.value == null) return
                    const clickedTarget = clickedItem.value.target
                    const clickedInstance = clickedTarget.closest('.select')
                    selectInstances.value[clickedInstance.getAttribute('data-id')]?.toggleOptions(clickedItem.value)
                    clickedInstance.querySelector('input')?.focus()
                }, 10);
            }
        } else {
            updateNormalizedData();
            initializeSelects();
        }
    })

    // Переход по ссылке при клике
    const clickLink = (index) => {
        props.options.slug != 'roles' && emit('clickLink', getActiveOption(index).value)
    }
    onBeforeUnmount(() => {
        selectInstances.value.forEach(instance => {
            document.removeEventListener('click', instance.closeOptions);
        });
    });
</script>
