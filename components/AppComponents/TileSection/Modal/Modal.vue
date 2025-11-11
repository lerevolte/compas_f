<template>
    <teleport to="#menu__overlay" v-if="modal.body.state">
        <AppModalWarning 
            :options="{
                title: modal.body.title,
                action: modal.body.action,
                actionTitle: modal.body.actionTitle,
                template: 'slot'
            }"
            :loading="modal.body.loading"
            @delete="emit('delete', modal.body.content.id)"
            @create="modal.save()"
            @update="modal.save()"
            @close="modal.body.state = false"
        >
            <template v-if="modal.body.action == 'delete'">
                <p class="warning__text">
                    {{ modal.body.text }}
                </p>
            </template>
            <div class="modal__fields" v-else-if="['update', 'create'].includes(modal.body.action)">
                <AppBlank 
                    v-if="modal.body.action == 'update'"
                    :item="{
                        title: 'Тип поля',
                        text: modal.types[modal.field.type]
                    }"
                /> 
                <AppSelect 
                    v-else-if="modal.body.action == 'create'"
                    :isPreventBottom="true"
                    :options="{
                        title: 'Тип поля',
                        isHaveNull: false,
                        list: Object.keys(modal.types).map(p => {
                            return {
                                value: p,
                                label: modal.types[p]
                            }
                        })
                    }"
                    v-model="modal.field.type"
                    @update:modelValue="modal.changeType()"
                />
                <AppSelect 
                    :isPreventBottom="true"
                    :options="{
                        title: 'Раздел',
                        isHaveNull: false,
                        list: props.listSection
                    }"
                    v-model="modal.field.section_id"
                />
                <AppInput 
                    :options="{
                        title: 'Название поля',
                        required: true,
                    }"
                    :error="{
                        state: modal.validator.state,
                        text: modal.validator.errors?.title
                    }"
                    v-model="modal.field.title"
                />
                <AppInput 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].unit != 'undefined'"
                    :options="{
                        title: 'Единица измерения'
                    }"
                    v-model="modal.field.unit"
                />

                <div class="modal__field-group" v-if="['select_dropdown', 'status'].includes(modal.field.type)">
                    <span class="blank__title">
                        Сохраненные элементы
                    </span>
                    <draggable
                        tag="div"
                        group="modal-options"
                        v-model="modal.field.options" 
                        :forceFallback="true"
                        :fallbackOnBody="true"
                        item-key="modal-options" 
                        handle=".icon_drag"
                        class="modal__options"
                        drag-class="draggable-drag"
                        ghost-class="draggable-ghost"
                        fallback-class="draggable-fallback"
                    >
                        <template #item="{ element: option, index  }">
                            <div class="modal__option">
                                <IconDrag 
                                    class="icon_drag-field"
                                />
    
                                <div class="modal__option-field">
                                    <template v-if="modal.field.type == 'status'">
                                        <AppColorPicker v-model="option.color">
                                            <template #icon>
                                                <IconPipette />
                                            </template>
                                        </AppColorPicker>
                                        <AppFile 
                                            class="modal__file_icon"
                                            :options="{
                                                id: 0,
                                                multiple: false,
                                                edit: true,
                                                isDraggable: false,
                                                query: {
                                                    field_id: null,
                                                    page_id: null
                                                }
                                            }"
                                            v-model="option.file"
                                        />
                                    </template>
                                    <AppInput 
                                        :options="{
                                            title: null
                                        }"
                                        v-model="option.label"
                                    />
                                </div>
                                <IconClose 
                                    @click="modal.removeOption(option)"
                                />
                            </div>
                        </template>
                    </draggable> 

                    <AppButton class="button_text" @click="modal.addOption()">
                        Добавить
                    </AppButton>
                </div>

                <AppCheckbox 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].is_plural != 'undefined'"
                    v-model="modal.field.is_plural"
                    :options="{
                        disabled: modal.body.action == 'update',
                        title: 'Множественное',
                    }"
                />
                <AppCheckbox 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].is_external_link != 'undefined'"
                    v-model="modal.field.is_external_link"
                    :options="{
                        title: 'Внешняя ссылка',
                    }"
                />
                <AppCheckbox 
                    v-model="modal.field.required"
                    :options="{
                        title: 'Обязательное поле',
                    }"
                />
                <AppCheckbox 
                    v-model="modal.field.visible_always"
                    :options="{
                        title: 'Показывать всегда',
                    }"
                />
                <AppCheckbox 
                    v-model="modal.field.has_roles_read"
                    :options="{
                        title: 'Ограничить видимость поля',
                    }"
                />
                <AppSelect 
                    v-show="modal.field.has_roles_read"
                    v-model="modal.field.roles_read"
                    :isPreventBottom="true"
                    :options="{
                        title: 'Роли',
                        list: userStore.roles.map(p => {
                            return {
                                value: p.id,
                                label: p.label
                            }
                        }),
                        multiple: true
                    }"
                />
                <AppCheckbox 
                    v-model="modal.field.has_roles_write"
                    :options="{
                        title: 'Ограничить редактирование поля',
                    }"
                />
                <AppSelect 
                    v-show="modal.field.has_roles_write"
                    v-model="modal.field.roles_write"
                    :isPreventBottom="true"
                    :options="{
                        title: 'Роли',
                        list: userStore.roles.map(p => {
                            return {
                                value: p.id,
                                label: p.label
                            }
                        }),
                        multiple: true
                    }"
                />
            </div>
        </AppModalWarning>
    </teleport>
</template>

<script setup>
    import './Modal.scss';
    
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    import { Validator } from '@AppHelpers/classes.js'
    import draggable from 'vuedraggable'; 
    import IconClose from '@AppIcons/Close.vue'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppColorPicker from '@AppComponents/Inputs/ColorPicker/ColorPicker.vue';
    import IconPipette from '@AppIcons/Input/Pipette.vue'

    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()

    const props = defineProps({
        modal: {
            default: {
                state: false,
                title: 'Настройки поля',
                actionTitle: 'Сохранить',
                action: 'update',
                content: {
                    id: 0,
                    type: '',
                    section_id: '',
                    title: '',
                    required: 0,
                    visible_always: 0,
                    has_roles_read: 0,
                    roles_read: [],
                    has_roles_write: 0,
                    roles_write: []
                },
                text: null
            },
            type: Object
        },
        listSection: {
            default: [],
            type: Array
        }
    })

    const emit = defineEmits([
        'delete',
        'create',
        'update',
    ])

    class Modal {
        constructor() {
            this.body = {
                state: false,
                title: 'Настройки поля',
                actionTitle: 'Сохранить',
                action: 'update',
                content: {},
                text: null
            }

            // Поля для создания и редактирования
            this.fields = {
                default: {
                    id: 0,
                    type: '',
                    section_id: '',
                    title: '',
                    required: 0,
                    visible_always: 1,
                    has_roles_read: 0,
                    roles_read: [],
                    has_roles_write: 0,
                    roles_write: []
                },
                text: {
                    is_plural: false,
                    is_external_link: false,
                    color: '#000',
                    set_color: false,
                },
                number: {
                    unit: null,
                    color: '#000',
                    set_color: false,
                },
                select_dropdown: {
                    is_plural: false,
                    options: [],
                },
                status: {
                    options: [],
                }
            }
            // Типы полей для создания и редактирования
            this.types = {
                text: 'Строка',
                number: 'Число',
                select_dropdown: 'Список',
                status: 'Статус',
                file: 'Файл',
                date: 'Дата'
            }

            this.field = {}
            this.validator = new Validator()
        }

        // Изменение типа поля
        changeType() {
            this.field = Object.assign(this.field, this.fields[this.field.type])

            if (['select_dropdown', 'status'].includes(this.field.type)) {
                this.field.options = [
                    {
                        label: '',
                        value: 0
                    },
                    {
                        label: '',
                        value: 1
                    },
                    {
                        label: '',
                        value: 2
                    }
                ]
            }

            const allKeys = Object.keys(Object.assign({}, this.fields.default, this.fields[this.field.type]))

            for (let key in this.field) {
                if (!allKeys.includes(key)) {
                    delete this.field[key]
                }
            }
        }

        // Добавление опции
        addOption() {
            this.field.options.push({
                label: '',
                value: this.field.options.length
            })
        }

        // Удаление опции
        removeOption(option) {
            this.field.options = this.field.options.filter(p => p.value != option.value)
        }

        // Сохранение
        save() {
            const request = JSON.parse(JSON.stringify(this.field))

            if (this.field.type == 'status') {
                request.options = request.options.map((option, index) => {
                    return {
                        label: {
                            id: option.value,
                            sort: index,
                            file: option.file ? option.file[0]?.url ?? null : null,
                            is_hidden: 0,
                            field_id: request.id,
                            color: request.color ?? '#B6B6B6',
                            text: option.label
                        },
                        value: option.value
                    }
                })
            }

            this.validator.check([{
                title: 'Название поля',
                key: 'title',
                required: true,
                value: request.title
            }])

            if (this.validator.state) return
            if (this.body.action == 'create') {
                delete request.id
            }

            emit(this.body.action == 'create' ? 'create' : 'update', request)
        }
    }

    const modal = ref(new Modal())

    watch(() => props.modal.state, () => {
        if (props.modal.action == 'create') {
            modal.value.field = {
                ...modal.value.fields.default,
                ...modal.value.fields.text,
                type: 'text',
                section_id: props.modal.content.section_id
            }
        } else if (props.modal.action == 'update') {
            modal.value.field = {
                ...props.modal.content
            }
        }
        modal.value.body = props.modal
    })

    watch(() => props.modal.loading, () => {
        modal.value.body.loading = props.modal.loading    
    })
</script>
