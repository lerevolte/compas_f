<template>
    <div class="form__item form__item_select">
        <label :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div 
            v-for="(selectItem, index) in normalizedModelValue.value"
            :key="index"
            class="select select_icon select-container" 
            :ref="el => setSelectRef(el, index)"
            :class="{ 
                'select_open': selectInstances[index]?.state.isOpen, 
                'select_disabled': props.options.edit == false, 
                'select_empty': getActiveOption(index) == undefined 
            }"
        >
            <div class="select__content" @click="event => selectInstances[index]?.toggleOptions(event)">
                <IconWarning v-if="props.options.required && !getActiveOption(index)"/>

                <AppInput 
                    :options="{
                        id: `${props.options.id}_search_${index}`,
                        title: '',
                        type: 'text',
                        name: '',
                        mask: null,
                        autocomplete: 'off',
                        placeholder: ''
                    }"
                    @update:modelValue="(value) => selectInstances[index]?.filterOptions(value)"
                    :model-value="selectInstances[index]?.state?.search || ''"
                    @update:model-value="(value) => selectInstances[index]?.state && (selectInstances[index].state.search = value)"
                />
    
                <div class="select__value select__value_single" :class="{ 'select__value_typing': (selectInstances[index]?.state?.search?.length || 0) > 0 }">
                    <figure class='select__value-icon' v-if="getActiveOption(index)">
                        <img 
                            v-if="typeof getActiveOption(index).label?.file == 'string' && getActiveOption(index).label?.file != ''" :src='getActiveOption(index).label?.file' alt=''
                            @click="emit('clickLink', getActiveOption(index).value)" 
                        >
                        <div 
                            v-else 
                            class="img-text" 
                            :style="{ 
                                '--bgColor': getActiveOption(index).label?.color == '' || !getActiveOption(index).label?.color? '#a6b7d4' : getActiveOption(index).label?.color 
                            }"
                            @click="emit('clickLink', getActiveOption(index).value)" 
                        >
                            {{ getActiveOption(index).value ? getActiveOption(index).label?.text.slice(0, 1) : 'Н' }}
                        </div>
                        <figcaption>
                            <span class="value__text value__text_link" @click="emit('clickLink', getActiveOption(index).value)">
                                {{ getActiveOption(index).label?.text }}  
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
                </div>
    
                <IconSelectArrow />
            </div>
            <div class="select__options">
                <div class="select__option" :value="null" @click="selectInstances[index]?.changeValue({ value: null }, index)">
                    Не выбрано
                </div>
                <div 
                    class="select__option" 
                    v-for="option in selectInstances[index]?.state?.list || []" 
                    :class="{ 'select__option_active': normalizedModelValue.value[index] == option.value }" 
                    :value="option.value" 
                    @click="selectInstances[index]?.changeValue(option, index)"
                >
                    <span class="value__text">
                        {{ option.label.text || option.label.text == null ? option.label.text : option.label }} 
                    </span>
                    <span class="value__text value__text_subtext">
                        ID: {{ option.value }}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Кнопка добавления нового селекта -->
        <div v-if="props.options.edit !== false" class="add-select-button">
            <button 
                type="button" 
                @click="addNewSelect"
                class="btn-add-select"
                :disabled="props.options.edit === false"
            >
                + Добавить еще
            </button>
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

    const selectRefs = ref([])
    const selectInstances = ref([])

    const emit = defineEmits([
        'update:modelValue',
        'clickLink'
    ])

    class Select {
        constructor(index) {
            this.index = index;
            this.selectRef = null;

            this.state = reactive({
                list: [],
                search: '',
                isOpen: false
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                if (this.selectRef && !this.selectRef.contains(event.target)) {
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

        // Изменение значения
        changeValue(option, selectIndex) {
            this.toggleOptions()
            updateModelValue(option.value, option, selectIndex);
        }

        // Открытие/закрытие опций
        toggleOptions(event) {
            if (props.options.edit == false) return
            
            // Закрываем все другие селекты
            selectInstances.value.forEach((instance, idx) => {
                if (idx !== this.index && instance.state.isOpen) {
                    instance.state.isOpen = false;
                    instance.state.search = '';
                    instance.setOptions();
                    document.removeEventListener('click', instance.closeOptions);
                }
            });

            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
            } else {
                this.state.search = ''
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                }
                if (this.selectRef) {
                    const input = this.selectRef.querySelector('input');
                    if (input) input.blur();
                }
                document.removeEventListener('click', this.closeOptions);
            }
        }
        
        setOptions() {
            this.state.list = props.options.list ?? []
        }
    }

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
                isHaveNull: false,
                multiple: false,
                type: 'select',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null
    })

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
    }, { deep: true });

    watch(() => props.options.list, () => {
        selectInstances.value.forEach(instance => instance.setOptions());
    });

    onBeforeUnmount(() => {
        selectInstances.value.forEach(instance => {
            document.removeEventListener('click', instance.closeOptions);
        });
    });
</script>
