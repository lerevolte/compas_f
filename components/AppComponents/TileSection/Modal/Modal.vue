<template>
    <AppModalWarning 
        :options="{
            title: props.modal.title,
            action: props.modal.action,
            actionTitle: props.modal.actionTitle,
            template: 'slot'
        }"
        :loading="props.modal.loading"
        @delete="emit('actionField', {action: 'delete', value: props.modal.content.id})"
        @create="modal.save()"
        @updateField="modal.save()"
        @close="emit('actionField', {action: 'close', value: false})"
    >
        <template v-if="props.modal.action == 'delete'">
            <p class="warning__text">
                {{ props.modal.text }}
            </p>
        </template>
        <div class="modal__fields" v-else-if="['updateField', 'create'].includes(props.modal.action)">
            <AppBlank 
                v-if="props.modal.action == 'updateField'"
                :item="{
                    title: 'Тип поля',
                    text: modal.types[modal.field.type]
                }"
            /> 
            <AppSelect 
                v-else-if="props.modal.action == 'create'"
                :isPreventBottom="true"
                :options="{
                    title: 'Тип поля',
                    isHaveNull: false,
                    list: Object.keys(modal.types).filter(p => p != 'relation').map(p => {
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
            <AppSelect 
                v-if="modal.field.type == 'text_group'"
                :isPreventBottom="true"
                :options="{
                    title: 'Поля в группе',
                    list: modal.field.options,
                    multiple: true
                }"
                v-model="modal.field.subfields"
                @update:modelValue="modal.changeSubfields()"
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
                                    <div class="modal__file-container">
                                        <figure 
                                            v-if="option.file"
                                            class="ibg icon__close" 
                                            title="Удалить иконку" 
                                            @click="option.file = null"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                                                <path fill="currentColor"
                                                    d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z">
                                                </path>
                                            </svg>
                                        </figure>
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
                                    </div>
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

            <template v-if="modal.field.type != 'text_group'">
                <AppCheckbox 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].show_file_name != 'undefined'"
                    v-model="modal.field.show_file_name"
                    :options="{
                        title: 'Показывать название',
                    }"
                />
                <AppCheckbox 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].is_plural != 'undefined'"
                    v-model="modal.field.is_plural"
                    :options="{
                        disabled: props.modal.action == 'updateField',
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
                <AppColorPicker 
                    v-model="modal.field.color" 
                    v-if="modal.fields[modal.field.type] && modal.fields[modal.field.type].set_color != undefined"
                >
                    <template #icon>
                        <AppCheckbox 
                            v-model="modal.field.set_color"
                            :options="{
                                title: 'Показывать название',
                            }"
                        />
                    </template>
                </AppColorPicker>
            </template>
        </div>
    </AppModalWarning>
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
                action: 'updateField',
                loading: false,
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
        },
        columns: {
            default: {},
            type: Object
        },
        hidden: {
            default: [],
            type: Array
        }
    })

    const emit = defineEmits([
        'actionField'
    ])

    class Modal {
        constructor() {
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
                },
                text_group: {
                    options: [],
                    subfields: []
                },
                file: {
                    show_file_name: false
                }
            }
            // Типы полей для создания и редактирования
            this.types = {
                text: 'Строка',
                number: 'Число',
                select_dropdown: 'Список',
                status: 'Статус',
                file: 'Файл',
                relation: 'Программное',
                date: 'Дата',
                text_group: 'Группа полей',
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
            } else if (this.field.type == 'text_group') {
                this.field.options = this.getTextGroupOptions()
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

        // Добавление подполей
        changeSubfields() {
            const list = this.getFields()
            let findedField = null

            for (let id of this.field.subfields) {
                findedField = list.find(f => f.id == id)
                if (findedField) {
                    this.field.fields = this.field.fields ?? []
                    this.field.fields.push(findedField)
                }
            }
        }

        // Получение полей для группы
        getTextGroupOptions() {
            const list = this.getFields()
            return list.map(field => {
                return {
                    label: field.title,
                    value: field.id
                }
            })
        }

        // Сохранение
        save() {
            if (this.field.has_roles_read && this.field.roles_read.length == 0) {
                this.field.has_roles_read = 0
            }
            if (this.field.has_roles_write && this.field.roles_write.length == 0) {
                this.field.has_roles_write = 0
            }
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
                            color: option.color ?? '#B6B6B6',
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

            if (props.modal.action == 'create') {
                delete request.id
            }

            emit('actionField', {action: props.modal.action == 'updateField' ? 'update' : 'create', value: request})
        }

        // Закрытие модального окна
        close() {
            this.field = {}
            this.validator.state = false
            this.validator.errors = {}
        }

        getFields() {
            let response = []

            for (let key in props.columns) {
                for (let section of props.columns[key]) {
                    response.push(...section.fields.filter(item => item.type != 'text_group'))
                }
            }

            return [...response, ...props.hidden]
        }
    }

    const modal = ref(new Modal())

    onMounted(() => {
        if (props.modal.action == 'create') {
            modal.value.field = {
                ...modal.value.fields.default,
                ...modal.value.fields.text,
                type: 'text',
                section_id: props.modal.content.section_id
            }
        } else if (props.modal.action == 'updateField') {
            if (props.modal.content.type == 'text_group') {
                modal.value.field = {
                ...props.modal.content,
                options: [...props.modal.content.options, ...modal.value.getTextGroupOptions()]
            }
            } else if (props.modal.content.type == 'status') {
                modal.value.field = {
                    ...props.modal.content,
                    options: props.modal.content.options.map(option => {
                        return {
                            label: option.label.text,
                            value: option.label.id,
                            color: option.label.color,
                            file: option.label.file ? [{url: option.label.file}] : null
                        }
                    })
                }
            } else {
                modal.value.field = props.modal.content
            }
        }
    })
</script>
