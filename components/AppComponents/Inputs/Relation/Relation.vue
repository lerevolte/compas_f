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
                'select_hidden': isCompactReadonly || index >= ((props.options?.visibleCount ?? 5) + 1),
                'select_open': selectInstances[index]?.state.isOpen,
                'select_disabled': props.options.edit == false,
                'select_empty': !getActiveOption(index) || (!getActiveOption(index).value && !getActiveOption(index).label?.text)
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
                            v-if="isImageSrc(getActiveOption(index).label?.file)" :src='getActiveOption(index).label?.file' alt=''
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
                            {{ getActiveOption(index).value || getActiveOption(index).label?.text ? getActiveOption(index).label?.text?.slice(0, 1) : 'Н' }}
                        </div>
                        <figcaption>
                            <span class="value__text value__text_link" @click="() => clickLink(index)">
                                {{ getActiveOption(index)?.value || getActiveOption(index)?.label?.text ? getActiveOption(index).label?.text : 'Не выбрано' }}
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
                        @keyup.enter="() => props.options.relation_type == 'products' && selectInstances[index]?.commitCustom()"
                    />
    
                    <div class="select__content-abs">
                        <span class="select__content-plate">
                            <span class="value__text value__text_id" v-if="getActiveOption(index)?.value">
                                ID: {{ getActiveOption(index)?.label?.id }}
                            </span>

                            <IconSelectArrow />
                        </span>

                        <figure class='relation__arrow' v-if="props.options.slug != 'roles' && (getActiveOption(index)?.value || !getActiveOption(index))" @click="() => clickLink(index)" >
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
                        'select__option_disabled': isOptionDisabled(option)
                    }" 
                    :value="option.value" 
                    @click="!isOptionDisabled(option) && selectInstances[index]?.changeValue(option, index)"
                >
                    <span class="value__text">
                        {{ option.label.text || option.label.text == null ? option.label.text : option.label }}
                    </span>
                    <span class="value__text value__text_subtext">
                        ID: {{ option.value }}
                    </span>
                    <span class="value__text value__text_subtext" v-if="option.label?.delivery_date">
                        {{ formatDeliveryDate(option.label.delivery_date) }}
                    </span>
                </div>

                <div class="select__option select__option_create" v-if="props.options.slug != 'roles'" :value="null" @click="emit('create', {related_table: props.options.relation})">
                    Создать
                </div>
            </div>
        </div>
        
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>

        <div class="select__actions">
            <AppButton
                v-if="isCompactReadonly || normalizedModelValue.value.length > ((props.options?.visibleCount ?? 5) + 1)"
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
    import { isImageSrc } from '@AppHelpers/classes.js'
    import throttle from 'lodash/throttle'
    import AppError from '@AppComponents/Error/Error.vue'

    const selectRefs = ref([])
    const selectInstances = ref([])
    const clickedItem = ref(null)

    const isEmptyOption = (p) => {
        if (!p) return true
        const label = p.label
        if (label == null) return true
        if (typeof label === 'object') {
            const t = label.text
            return t == null || String(t).trim() === ''
        }
        return String(label).trim() === ''
    }
    const dropEmptyForProducts = (list, options) =>
        options?.relation_type === 'products'
            ? (list ?? []).filter(p => !isEmptyOption(p))
            : (list ?? [])

    const emit = defineEmits([
        'update:modelValue',
        'clickLink',
        'update:prevValue',
        'showAll',
        'create'
    ])

    const formatDeliveryDate = (d) => {
        if (!d) return ''
        const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
        return m ? `${m[3]}.${m[2]}.${m[1]}` : d
    }

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

            this.closeOptions = (event) => {
                if (this._mousedownInside) {
                    this._mousedownInside = false
                    return
                }
                if (this.selectRef && !this.selectRef.contains(event.target)) {
                    this.commitCustomIfTyped()
                    this.state.isOpen = false;
                    this.state.search = ''
                    this.state.isTop = false
                    this.setOptions()
                    this.clearFixedPosition()
                    document.removeEventListener('click', this.closeOptions);
                    if (this._mousedownHandler) {
                        document.removeEventListener('mousedown', this._mousedownHandler)
                        this._mousedownHandler = null
                    }
                }
            };

            this.throttledFilter = throttle(async (value) => {
                let response = null

                if (props.options?.relation_type) {
                    response = await api.callMethod("GET", `/objects/search?entity=${props.options?.relation_type}&q=${encodeURIComponent(value)}`)
                } else {
                    response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${encodeURIComponent(value)}`)
                }

                this.state.list = dropEmptyForProducts(response.data.map(p => ({ label: p.label, value: p.value })), props.options)
            }, 100);
        }

        setSelectRef(ref) {
            this.selectRef = ref;
        }

        getActiveOption(value, localOptions) {
            if (localOptions && localOptions[this.index]) {
                return localOptions[this.index];
            }
            return this.state.list.find(p => p.value == value) || null;
        }

        async filterOptions(value) {
            if (props.options.searchable) {
                this.throttledFilter(value)
            } else {
                this.state.list = dropEmptyForProducts(props.options.list, props.options).filter(p =>
                    p.label.text ? p.label.text.toLowerCase().includes(value.toLowerCase()) : p.label.toLowerCase().includes(value.toLowerCase())
                )
            }
        }

        getList(selectIndex) {
            const limit = (list) => this.state.search?.length > 0 ? list : list.slice(0, 10)

            if (!props.modelValue || !props.modelValue.value) {
                return limit(this.state.list ?? [])
            }

            if (this.state?.list?.length > 0) {
                return limit(this.state.list).map(p => {
                    return {
                        ...p,
                        disabled: normalizedModelValue.value.value[selectIndex] == p.value || props.modelValue.value.includes(p.value)
                    }
                })
            }

            return []
        }

        changeValue(option, selectIndex) {
            this.state.search = ''
            this.toggleOptions()
            updateModelValue(option.value, option, selectIndex);
        }

        commitCustomIfTyped() {
            if (props.options?.relation_type != 'products') return false
            const text = (this.state.search || '').trim()
            if (!text) return false
            const active = getActiveOption(this.index)
            if (active?.label?.text && String(active.label.text).trim() === text) return false
            updateModelValue(null, { value: null, label: { id: null, text } }, this.index);
            return true
        }

        commitCustom() {
            this.commitCustomIfTyped()
            this.state.search = ''
            if (this.state.isOpen) {
                this.toggleOptions()
            }
        }

        toggleOptions(event) {
            clickedItem.value = event
            if (props.options.edit == false || (event && event.target.closest('.relation__arrow'))) return
            
            if (this.state.isOpen && event?.target?.closest('input')) return
            
            selectInstances.value.forEach((instance, idx) => {
                if (idx !== this.index && instance.state.isOpen) {
                    instance.commitCustomIfTyped();
                    instance.state.isOpen = false;
                    instance.state.isTop = false
                    instance.state.search = '';
                    instance.setOptions();
                    instance.clearFixedPosition();
                    document.removeEventListener('click', instance.closeOptions);
                }
            });

            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                this._mousedownHandler = (e) => {
                    this._mousedownInside = !!(this.selectRef && this.selectRef.contains(e.target))
                }
                document.addEventListener('mousedown', this._mousedownHandler)
                nextTick(() => this.checkPosition(event));

                if (props.options?.relation_type) {
                    this.throttledFilter('')
                }

                const activeOpt = getActiveOption(this.index);
                if (activeOpt?.value) {
                    this.state.search = activeOpt.label?.text || '';
                }

                nextTick(() => {
                    if (this.selectRef) {
                        const input = this.selectRef.querySelector('input');
                        if (input) input.focus();
                    }
                });
            } else {
                this.commitCustomIfTyped()
                this.state.isTop = false;
                this.state.search = ''
                this.clearFixedPosition()
                if (!props.options.searchable) {
                    this.state.list = dropEmptyForProducts(props.options.list, props.options)
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
            let contentRef = popupRef ? popupRef.querySelector('.select__options') : null

            if (!popupRef || !contentRef) return;

            this._popupRef = popupRef
            this._contentRef = contentRef

            contentRef.style.position = ''
            contentRef.style.left = ''
            contentRef.style.width = ''
            contentRef.style.top = ''
            contentRef.style.bottom = ''
            contentRef.style.margin = ''

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

            if (popupRef.closest('.table, .table-validate')) {
                this.applyFixedPosition()

                if (!this._scrollHandler) {
                    this._scrollHandler = (e) => {
                        if (!this.state.isOpen) return
                        if (e.target && e.target.nodeType === 1 && this._contentRef && this._contentRef.contains(e.target)) return
                        if (this._repositionRaf) return
                        this._repositionRaf = requestAnimationFrame(() => {
                            this._repositionRaf = null
                            this.applyFixedPosition()
                        })
                    }
                    window.addEventListener('scroll', this._scrollHandler, true)
                }
            }
        }

        applyFixedPosition() {
            const popupRef = this._popupRef
            const contentRef = this._contentRef
            if (!popupRef || !contentRef || !this.state.isOpen) return

            const rect = popupRef.getBoundingClientRect()
            contentRef.style.position = 'fixed'
            contentRef.style.margin = '0'
            contentRef.style.bottom = 'auto'
            contentRef.style.left = '0px'
            contentRef.style.top = '0px'
            const base = contentRef.getBoundingClientRect()
            contentRef.style.left = (rect.left - base.left) + 'px'
            contentRef.style.width = rect.width + 'px'
            if (this.state.isTop) {
                contentRef.style.top = 'auto'
                contentRef.style.bottom = '0px'
                const baseBottom = contentRef.getBoundingClientRect().bottom
                contentRef.style.bottom = (baseBottom - rect.top + 5) + 'px'
            } else {
                contentRef.style.top = (rect.bottom + 5 - base.top) + 'px'
            }
        }

        clearFixedPosition() {
            if (this._scrollHandler) {
                window.removeEventListener('scroll', this._scrollHandler, true)
                this._scrollHandler = null
            }
            if (this._repositionRaf) {
                cancelAnimationFrame(this._repositionRaf)
                this._repositionRaf = null
            }
        }

        setOptions() {
            this.state.list = dropEmptyForProducts(props.options.list, props.options)
        }
    }

    const isOptionDisabled = (option) => {
        if (option.disabled) return true
        const owner = option.label?.occupied_by
        if (!owner) return false
        return String(owner) !== String(props.options.pageId ?? '')
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

    const normalizeModelValue = (modelValue) => {
        if (!modelValue || typeof modelValue !== 'object') {
            return { value: [null], localOptions: [null] };
        }

        let normalizedValue = modelValue.value;
        let normalizedLocalOptions = modelValue.localOptions || [];

        if (!Array.isArray(normalizedValue)) {
            normalizedValue = [normalizedValue];
        }

        if (!Array.isArray(normalizedLocalOptions)) {
            normalizedLocalOptions = [normalizedLocalOptions];
        }

        while (normalizedLocalOptions.length < normalizedValue.length) {
            normalizedLocalOptions.push(null);
        }

        if (normalizedLocalOptions.length > normalizedValue.length) {
            normalizedLocalOptions = normalizedLocalOptions.slice(0, normalizedValue.length);
        }

        return { value: normalizedValue, localOptions: normalizedLocalOptions };
    };

    const normalizedModelValue = ref({ value: [null], localOptions: [null] });

    const isCompactReadonly = computed(() =>
        props.options.isCompact === true
        && props.options.edit === false
        && (normalizedModelValue.value?.value?.length || 0) > 1
    );

    const updateNormalizedData = () => {
        const normalized = normalizeModelValue(props.modelValue);
        normalizedModelValue.value = normalized;
    };

    const updateModelValue = (newValue, newOption, selectIndex) => {
        const current = normalizedModelValue.value;
        
        
        const newValueArray = [...current.value];
        const newLocalOptionsArray = [...current.localOptions];
        
        newValueArray[selectIndex] = newValue;
        newLocalOptionsArray[selectIndex] = newOption;
        
        
        normalizedModelValue.value = { value: newValueArray, localOptions: newLocalOptionsArray };      
        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
        emit('update:modelValue', { 
            value: newValueArray, 
            localOptions: newLocalOptionsArray 
        });
    };

    const addNewSelect = () => {
        const current = normalizedModelValue.value;
        
        
        const newValueArray = [...current.value];
        const newLocalOptionsArray = [...current.localOptions];
        
        newValueArray.push(null);
        newLocalOptionsArray.push(null);

        
        normalizedModelValue.value = { value: newValueArray, localOptions: newLocalOptionsArray };
        emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
        emit('update:modelValue', { 
            value: newValueArray, 
            localOptions: newLocalOptionsArray 
        });
    };

    const getActiveOption = (index) => {
        const currentValue = normalizedModelValue.value.value[index];
        const localOptions = normalizedModelValue.value.localOptions;
        
        if (localOptions && localOptions[index]) {
            return localOptions[index];
        }
        
        if (props.options.list && props.options.list.length > 0) {
            return props.options.list.find(p => p.value == currentValue) || null;
        }
        
        const selectInstance = selectInstances.value[index];
        if (selectInstance && selectInstance.state.list && selectInstance.state.list.length > 0) {
            return selectInstance.state.list.find(p => p.value == currentValue) || null;
        }
        
        return null;
    };

    const setSelectRef = (el, index) => {
        if (el) {
            selectRefs.value[index] = el;
            if (selectInstances.value[index]) {
                selectInstances.value[index].setSelectRef(el);
            }
        }
    };

    const initializeSelects = () => {
        if (!normalizedModelValue.value || !normalizedModelValue.value.value) return;
        
        const currentValues = normalizedModelValue.value.value;
        
        while (selectInstances.value.length > currentValues.length) {
            const lastInstance = selectInstances.value.pop();
            if (lastInstance && lastInstance.selectRef) {
                document.removeEventListener('click', lastInstance.closeOptions);
            }
        }
        
        while (selectInstances.value.length < currentValues.length) {
            const index = selectInstances.value.length;
            const newInstance = new Select(index);
            selectInstances.value.push(newInstance);
            
            if (selectRefs.value[index]) {
                newInstance.setSelectRef(selectRefs.value[index]);
            }
            
            newInstance.setOptions();
        }

        if (props.options.isSetDefault && (normalizedModelValue.value?.value?.length ?? 0) === 0) {
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

    const clickLink = (index) => {
        const value = getActiveOption(index)?.value
        if (!value) return
        props.options.slug != 'roles' && emit('clickLink', value)
    }
    onBeforeUnmount(() => {
        selectInstances.value.forEach(instance => {
            document.removeEventListener('click', instance.closeOptions);
            if (instance._mousedownHandler) {
                document.removeEventListener('mousedown', instance._mousedownHandler)
                instance._mousedownHandler = null
            }
            instance.clearFixedPosition();
        });
    });
</script>
