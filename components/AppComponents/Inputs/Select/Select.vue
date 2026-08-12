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
                'select_empty': activeOption == undefined,
                'select_multiple': props.options.multiple
            }">
            <div class="select__content" @click="event => select.toggleOptions(event)">
                <IconWarning v-if="props.options.required && !activeOption"/>

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
                    @keyup.enter="() => { const v = select.state.search; if (select.commitAddressCoords(v)) return; emit('searchEnter', v); select.state.search = ''; select.filterOptions(''); select.state.isOpen = false; }"
                />
    
                <div class="select__values" ref="selectValuesRef" v-if="props.options.multiple">
                    <div class="select__value" v-for="option in activeOption" @click="select.changeValue(option)">
                        <span class="select__dot" v-if="props.options.isShowDot && option?.color" :style="`background: ${option.color}`"></span>
                        {{ (option?.label && typeof option.label === 'object') ? (option.label.text ?? '') : option?.label }}

                        <IconClose />
                    </div>
                </div>
                <div class="select__value select__value_single" :class="{ 'select__value_typing': select.state.search.length > 0 }" :style="!props.options.isShowDot && activeOption?.color ? `color: ${activeOption.color}` : null" v-else>
                    <span class="select__dot" v-if="props.options.isShowDot && activeOption?.color" :style="`background: ${activeOption.color}`"></span>
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
                    :class="{ 'select__option_active': props.modelValue && (!Array.isArray(props.modelValue) ? props.modelValue == option.value : props.modelValue.length > 0 && props.modelValue.includes(option.value))}"
                    :value="option.value"
                    @click="select.changeValue(option)"
                >
                    <span class="value__text" :class="{'value__text_dot': props.options.isShowDot && option.color}" :style="!props.options.isShowDot && option.color ? `color: ${option.color}` : null">
                        <span class="select__dot" v-if="props.options.isShowDot && option.color" :style="`background: ${option.color}`"></span>
                        {{ (option.label && typeof option.label === 'object') ? (option.label.text ?? '') : (option.label ?? '') }}
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

    const COORD_CAPTURE = /^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/
    const parseCoords = (str) => {
        if (typeof str !== 'string') return null
        const typed = str.trim()
        const m = typed.match(COORD_CAPTURE)
        if (!m) return null
        return { text: typed, coords: [parseFloat(m[1]), parseFloat(m[2])] }
    }

    const selectRef = ref(null)
    const contentRef = ref(null)
    const selectValuesRef = ref(null)
    const searchRef = ref(null)

    const emit = defineEmits([
        'update:modelValue',
        'update:prevValue',
        'update:modelList',
        'searchEnter'
    ])

    const clonePrevValue = (value) => value === undefined ? null : JSON.parse(JSON.stringify(value))

    class Select {
        constructor() {
            this.state = reactive({
                list: [],
                visibleList: [],
                search: '',
                isOpen: false,
                lastTab: null
            });


            this.closeOptions = (event) => {
                if (!this.state.isOpen) return;
                if (this._mousedownInside) {
                    this._mousedownInside = false
                    return
                }
                if (selectRef.value && !selectRef.value.contains(event.target)) {
                    if (props.options.type == 'address' && this.state.search && this.state.search.trim()) {
                        const typed = this.state.search.trim();
                        const coords = parseCoords(typed);
                        const newValue = coords
                            ? coords
                            : { text: typed, coords: props.modelValue?.coords ?? null };

                        emit('update:modelValue', newValue);
                        
                        this.state.isOpen = false;
                        this.state.search = '';
                        this.state.isTop = false;
                        this.state.list = [{ label: typed, value: newValue }];
                        this.state.visibleList = this.state.list;
                        document.removeEventListener('click', this.closeOptions);
                        return;
                    }
                    
                    this.commitSearch();
                    this.state.isOpen = false;
                    this.state.search = '';
                    this.state.isTop = false;
                    this.setOptions();
                    document.removeEventListener('click', this.closeOptions);
                }
            };

            this.commitSearch = () => {
                if (!props.options.isCommitSearch) return;
                const typed = this.state.search.trim();
                if (typed) emit('searchEnter', typed);
            };

            this.throttledFilter = throttle(async (value) => {
                let response = null
                if (props.options.type == 'address') {
                    const coords = parseCoords(value)
                    if (coords) {
                        const opt = { label: coords.text, value: coords }
                        this.state.list = [opt]
                        this.state.visibleList = [opt]
                        return
                    }
                    const restrict = props.options.subtype ? `&restrict=${props.options.subtype}` : ''
                    response = await api.callMethod("GET", `/map/geocode?address=${value}${restrict}`)
                    this.state.list = response.data.map(p => ({ label: p.text, value: JSON.parse(JSON.stringify(p)) }))
                    this.state.visibleList = response.data.map(p => ({ label: p.text, value: JSON.parse(JSON.stringify(p)) }))
                } else {
                    if (props.options.subtype == 'map_suggest') {
                        response = await api.callMethod("GET", `/map/suggest?restrict=city&address=${value}`)
                        this.state.list = response.data.map(p => ({ label: p, value: p }))
                        this.state.visibleList = response.data.map(p => ({ label: p, value: p }))
                    } else if (props.options.entity) {
                        response = await api.callMethod("GET", `/objects/search?entity=${props.options.entity}&q=${encodeURIComponent(value)}`)
                        this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
                        this.state.visibleList = this.state.list
                    } else {
                        response = await api.callMethod("GET", `/objects/search?per_page=12&field_id=${props.options.relation}&q=${encodeURIComponent(value)}`)
                        this.state.list = response.data.map(p => ({ label: p.label, value: p.value }))
                        this.state.visibleList = response.data.map(p => ({ label: p.label, value: p.value }))
                    }
                    emit('update:modelList', this.state.list)
                }
            }, 100);
        }

        getActiveOptions(value) {
            if (props.options.multiple) {
                return value == null || value == '' ? [] : value.map(option => this.state.list.find(p => p.value == option) ?? (props.options.list ?? []).find(p => p.value == option)).filter(Boolean);
            } else if (props.options.type == 'address') {
                return this.state.list ? this.state.list.find(p => isEqual(p.value, value)) : null
            } else {
                if (value === null || value === undefined || value === '') return null
                return this.state.list ? this.state.list.find(p => String(p.value) === String(value)) : null
            }
        }

        async filterOptions(value) {
            if (props.options.searchable) {
                this.throttledFilter(value)
            } else {
                this.state.visibleList = props.options.list.filter(p => p.label.toLowerCase().includes(value.toLowerCase()))
            }
        }

        changeValue(option) {
            if (props.options.multiple) {
                if (props.modelValue == null) {
                    emit('update:prevValue', clonePrevValue(props.modelValue))
                    emit('update:modelValue', [option.value])
                } else {
                    if (props.modelValue.includes(option.value)) {
                        emit('update:prevValue', clonePrevValue(props.modelValue))
                        emit('update:modelValue', props.modelValue.filter(p => p != option.value))
                    } else {
                        emit('update:prevValue', clonePrevValue(props.modelValue))
                        emit('update:modelValue', [...props.modelValue, option.value])
                    }
                }
            } else {
                this.toggleOptions()
                emit('update:prevValue', clonePrevValue(props.modelValue))
                if (props.options?.isFullOption) {
                    emit('update:modelValue', option)
                } else {
                    emit('update:modelValue', props.options.type == 'address' ? option.value : String(option.value))
                }
            }
        }

        commitAddressCoords(value) {
            if (props.options.type != 'address') return false
            const coords = parseCoords(value)
            if (!coords) return false
            emit('update:prevValue', clonePrevValue(props.modelValue))
            emit('update:modelValue', coords)
            this.state.list = [{ label: coords.text, value: coords }]
            this.state.visibleList = this.state.list
            this.state.search = ''
            this.state.isOpen = false
            return true
        }

        toggleOptions(event) {
            if (props.options.edit == false) return
            if (props.options.multiple && this.state.isOpen && selectValuesRef.value.contains(event.target)) return


            if (this.state.isOpen && event?.target?.closest('input')) return
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                this._mousedownHandler = (e) => {
                    this._mousedownInside = !!(selectRef.value && selectRef.value.contains(e.target))
                }
                document.addEventListener('mousedown', this._mousedownHandler)
                nextTick(() => this.checkPosition());
                if (props.options.isSaveSearch) {
                    this.state.search = activeOption.value?.label ?? ''
                    this.state.visibleList = activeOption.value ? [activeOption.value] : []
                }
                if (searchRef.value.inputRef) {
                    searchRef.value.inputRef.focus();
                }
                if (props.options.searchable && props.options.entity && !this.state.visibleList.length) {
                    this.filterOptions('')
                }
            } else {
                this.commitSearch()
                this.state.search = ''
                this.state.isTop = false
                if (!props.options.searchable) {
                    this.state.list = props.options.list
                    this.state.visibleList = props.options.list
                }
                selectRef.value.querySelector('input').blur();
                document.removeEventListener('click', this.closeOptions);
                if (this._mousedownHandler) {
                    document.removeEventListener('mousedown', this._mousedownHandler)
                    this._mousedownHandler = null
                }
            }
        }
        
        setOptions() {
            if (props.options.type == 'address') {
                this.state.list = props.options.list ?? []
                this.state.visibleList = props.options.list ?? []

                if (props.modelValue && Array.isArray(this.state.list) && !this.state.list.find(p => isEqual(p.value, props.modelValue))) {
                    let option = clonePrevValue(props.modelValue)
                    if (typeof option === 'string') {
                        option = { text: option, coords: null }
                    }
                    const label = (option && typeof option === 'object') ? (option.text ?? '') : String(option ?? '')
                    this.state.list.push({label, value: option})
                }
            } else {
                this.state.list = props.options.list ?? []
                this.state.visibleList = props.options.list ?? []
            }
        }

        checkPosition() {
            if (!contentRef.value || !selectRef.value) return;

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
            const contentRect = contentRef.value.getBoundingClientRect();

            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > bottomBound;

            if (this.state.isTop) {
                contentRef.value.style.maxHeight = '';
            } else {
                const available = Math.floor(bottomBound - contentRect.top - 10);
                contentRef.value.style.maxHeight = contentRect.bottom > bottomBound && available > 0
                    ? `${Math.max(available, 100)}px`
                    : '';
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
                isSaveSearch: false,
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

    watch(() => props.modelValue, () => {
        if (props.options.type == 'address' && !select.state.isOpen) {
            select.setOptions()
        }
    })

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
    });
</script>
