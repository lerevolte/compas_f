<template>
    <div class="form__item form__item_status" :class="{ 'form__item_status_disabled': !props.options.edit }">
        <span class="form__item-title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </span>

        <div class="status" ref="statusRef" :class="{ 'status_open': status.state.isOpen }">
            <div class="status__content" @click="event => status.toggleOptions(event)">
                <figure class="status__value">
                    <div class="status__rect">
                        <div class="status__rect-container" :style="`--bgColor: ${activeOption?.label?.color}`">
                            <img class="status__value-rect" v-if="activeOption?.label?.file != '' && activeOption?.label?.file != null" :src="activeOption?.label?.file" />
                            <div class="status__value-rect" v-else ></div>
                        </div>
                        <figure class='status__arrow'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="3" fill="none" viewBox="0 0 4 3"><path fill="#888" d="M0 0h4L2 3z"/></svg>
                        </figure>
                    </div>

                    <figcaption class="status__value-text">
                        {{ activeOption?.label.text }}
                    </figcaption>
                </figure>
            </div>
            <div class="status__options" ref="contentRef" :class="{ 'popup__content_top': status.state.isTop }" v-show="!status.state.colorpicker?.isActive">
                <div class="status__option" v-if="props.options.isHaveNull" :value="null" @click="status.changeValue({ value: null })">
                    Не выбрано
                </div>

                <div 
                    class="status__option" 
                    v-for="option in status.state.list.filter(p => !p.label.is_hidden)"
                    :class="{ 'status__option_active': props.modelValue && (props.modelValue == option.value || (Array.isArray(props.modelValue) && props.modelValue.includes(option.value)))}" 
                    :value="option.value" 
                    @click="status.changeValue(option)"
                >
                    <figure class="status__value">
                        <div class="status__rect">
                            <div class="status__rect-container" :style="`--bgColor: ${option.label.color}`">
                                <img class="status__value-rect" v-if="option.label.file != '' && option.label.file != null" :src="option.label.file" />
                                <div class="status__value-rect" v-else ></div>
                            </div>
                        </div>
                    </figure>

                    <span class="value__text">
                        {{ option.label?.text }} 
                    </span>
                </div>

                <div class="settings__item popup__option" v-if="props.options?.isCanCreate" @click="status.toogleColorpicker(true)">
                    Палитра цветов
                    <SelectArrowSubmenu /> 
                </div>
            </div>

            <div class="status__options colorpicker"  v-if="props.options?.isCanCreate" v-show="status.state.colorpicker?.isActive">
                <div class="settings__item popup__option settings__item_back" @click="status.toogleColorpicker(false)">
                    Палитра цветов
                    <SelectArrowSubmenu /> 
                </div>
                <div class="colorpicker__content">
                    <div class="colorpicker__preview" :style="`--colorValue: ${status.state.colorpicker.color}`"></div>
                    <ColorPicker
                        :key="status.state.colorpicker.openId"
                        :color="status.state.colorpicker.color"
                        default-format="hex"
                        :visible-formats="['hex']"
                        @color-change="(eventData) => status.state.colorpicker.color = eventData.cssColor"
                    />
                    <AppButton class="button_fill" :class="{'skeleton': status.state.colorpicker.loading}" @click="status.createOption()">
                        Применить
                    </AppButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Status.scss';
    import 'vue-accessible-color-picker/styles'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import AppButton from '@AppComponents/Button/Button.vue'
    import { ColorPicker } from 'vue-accessible-color-picker'
    import SelectArrowSubmenu from '@AppIcons/Input/SelectArrowSubmenu.vue';
    
    const statusRef = ref(null)
    const contentRef = ref(null)

    const emit = defineEmits([
        'update:modelValue'
    ])

    class Status {
        constructor() {
            this.state = reactive({
                list: [],
                isTop: false,
                isOpen: false,
                colorpicker: {
                    color: '#b6b6b6',
                    isActive: false,
                    loading: false,
                    openId: 0
                }
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                if (statusRef.value && !statusRef.value.contains(event.target)) {
                    this.state.isOpen = false;
                    this.state.isTop = false;
                    this.state.list = props.options.list
                    this.toogleColorpicker(false)
                    document.removeEventListener('click', this.closeOptions);
                }
            };
        }

        // Получение активных опций
        getActiveOptions(value) {
            return this.state.list ? this.state.list.find(p => p.value == value) ?? this.state.list[0] : this.state.list[0]
        }

        // Изменение значения
        changeValue(option) {
            this.toggleOptions()
            emit('update:modelValue', option.value)
        }

        // Открытие/закрытие опций
        toggleOptions() {
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
                nextTick(() => this.checkPosition());
            } else {
                this.state.isTop = false
                this.state.list = props.options.list
                document.removeEventListener('click', this.closeOptions);
            }
        }

        checkPosition() {
            if (!contentRef.value || !statusRef.value) return;

            const parentRect = props.parentContainer ? props.parentContainer.getBoundingClientRect() : {bottom: window.innerHeight};
            const contentRect = contentRef.value.getBoundingClientRect();
            
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > parentRect.bottom;
        }

        toogleColorpicker(state) {
            // При открытии палитры подставляем цвет текущего значения статуса,
            // иначе всегда показывался дефолтный #b6b6b6.
            if (state) {
                const current = activeOption.value?.label?.color
                if (current) this.state.colorpicker.color = current
                this.state.colorpicker.openId += 1
            }
            this.state.colorpicker.isActive = state
        }

        async createOption() {
            try {
                this.state.colorpicker.loading = true
                // В списке (Body.vue) options.id — это DOM-уникальный ключ вида `${rowIdx}_${columnKey}`,
                // а реальный числовой field_id передаётся отдельно. В деталке (TileSection)
                // options содержит spread поля, и options.id уже числовой — используем его как fallback.
                const fieldId = props.options.field_id ?? props.options.id
                const response = await api.callMethod('POST', routes.status.create, {
                    field_id: fieldId,
                    color: this.state.colorpicker.color
                })
                this.state.list.push(response.data)
                emit('update:modelValue', response.data?.value)
                this.state.colorpicker.isActive = false
            } 
            catch (error) {
                console.log(error);
            } 
            finally {
                this.state.colorpicker.loading = false
            } 
        }
    }

    const status = new Status(statusRef.value, contentRef.value)
    const activeOption = computed(() => status.getActiveOptions(props.modelValue))

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
                focus: false,
                edit: true,
                required: false,
                isHaveNull: false,
                isCanCreate: false,
                type: 'status',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null
    })

    onMounted(() => {
        status.state.list = props.options.list ?? []
    })

    watch(() => props.options.list, () => {
        status.state.list = props.options.list ?? []
    })

    watch(() => props.options.edit, (next, prev) => {
        if (next) {
            if (props.options?.focus) {
                setTimeout(() => {
                    status.toggleOptions()
                }, 10);
            }
        }
    }, { immediate: true })

    onBeforeUnmount(() => {
        document.removeEventListener('click', status.closeOptions);
    });
</script>
