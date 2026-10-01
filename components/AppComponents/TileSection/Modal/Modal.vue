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
                    list: Object.keys(modal.types).filter(p => p != 'relation' && p != 'redactor' && p != 'deal_stages').map(p => {
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

            <div class="modal__field-group" v-if="['select_dropdown', 'status', 'deal_stages'].includes(modal.field.type)">
                <span class="blank__title">
                    {{ modal.field.type == 'deal_stages' ? 'Стадии' : 'Сохраненные элементы' }}
                </span>
                <draggable
                    tag="div"
                    group="modal-options"
                    v-model="modal.field.options" 
                    :forceFallback="true"
                    :fallbackOnBody="true"
                    item-key="modal-options" 
                    handle=".icon_drag"
                    :disabled="modal.field.type == 'deal_stages'"
                    class="modal__options"
                    drag-class="draggable-drag"
                    ghost-class="draggable-ghost"
                    fallback-class="draggable-fallback"
                >
                    <template #item="{ element: option, index  }">
                        <div class="modal__option">
                            <IconDrag 
                                v-if="modal.field.type != 'deal_stages'"
                                class="icon_drag-field"
                            />

                            <div class="modal__option-field">
                                <template v-if="['status', 'deal_stages'].includes(modal.field.type)">
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
                                        title: null,
                                        placeholder: option.b24_label ?? ''
                                    }"
                                    v-model="option.label"
                                />
                                <span class="modal__option-hint" v-if="modal.field.type == 'deal_stages'" :title="option.b24_label">
                                    ({{ option.b24_label }})
                                </span>
                            </div>
                            <IconClose 
                                v-if="modal.field.type != 'deal_stages'"
                                @click="modal.removeOption(option)"
                            />
                        </div>
                    </template>
                </draggable> 

                <AppButton class="button_text" v-if="modal.field.type != 'deal_stages'" @click="modal.addOption()">
                    Добавить
                </AppButton>
            </div>


            <div class="modal__field-group" v-else-if="modal.field.type == 'file'">
                <AppInput 
                    :options="{
                        title: 'Название кнопки'
                    }"
                    v-model="modal.field.button_name"
                />
            </div>

            <template v-if="modal.field.type != 'text_group'">
                <AppCheckbox 
                    v-if="modal.fields[modal.field.type] && typeof modal.fields[modal.field.type].can_create != 'undefined'"
                    v-model="modal.field.can_create"
                    :options="{
                        title: 'Включить цветовую палитру',
                    }"
                />
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
                <AppColorPicker 
                    v-if="modal.fields[modal.field.type] && modal.fields[modal.field.type].set_color != undefined"
                    v-model="modal.field.color" 
                >
                    <template #icon>
                        <AppCheckbox
                            v-model="modal.field.set_color"
                            :options="{
                                title: 'Выбрать цвет',
                                noLabelClick: true,
                            }"
                        />
                    </template>
                </AppColorPicker>
                <AppCheckbox
                    v-if="modal.field.type == 'deal_stages'"
                    v-model="modal.field.show_stage_bar"
                    :options="{
                        title: 'Выводить плашку стадий сверху в карточке',
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
                <div
                    class="form__item form__item_default-value default-value-picker"
                    v-if="!FIELDS_WITHOUT_DEFAULT_VALUE.includes(modal.field.key) && !['relation','file','text_group','select_dropdown','redactor','checkbox','json','waybills','route_map','deal_stages','geoposition'].includes(modal.field.type) && !(modal.field.type == 'status' && props.modal.action == 'create')"
                >
                    <AppPopup class="default-value-picker__popup" :isPreventBottom="true" :ignoreSelectors="['default-value-picker', '.dp__menu']">
                        <template #header>
                            <div class="default-value-picker__summary">
                                <AppCheckbox
                                    v-model="modal.field.set_default"
                                    :options="{
                                        title: (modal.field.default_value != null && modal.field.default_value !== '')
                                            ? `Значение по умолчанию - ${defaultValueLabel(modal.field)}`
                                            : 'Значение по умолчанию',
                                        noLabelClick: true,
                                    }"
                                />
                            </div>
                        </template>
                        <template #content>
                            <div class="default-value-picker__content">
                                <AppStatus
                                    v-if="modal.field.type == 'status'"
                                    :isPreventBottom="true"
                                    v-model="modal.field.default_value"
                                    @update:modelValue="val => { modal.field.set_default = (val !== null && val !== '') ? 1 : 0 }"
                                    :options="{
                                        id: 0,
                                        title: 'Значение по умолчанию',
                                        name: 'default_value',
                                        type: 'status',
                                        list: statusDefaultOptions,
                                        isHaveNull: true,
                                        isCanCreate: false,
                                        edit: true
                                    }"
                                />
                                <AppSelect
                                    v-else-if="modal.field.type == 'address'"
                                    v-model="modal.field.default_value"
                                    @update:modelValue="val => { if (val && (val.text || val.coords)) modal.field.set_default = 1 }"
                                    :options="{
                                        id: 0,
                                        title: 'Значение по умолчанию',
                                        type: 'address',
                                        name: 'default_value',
                                        subtype: modal.field.subtype,
                                        searchable: true,
                                        isSaveSearch: true,
                                        edit: true
                                    }"
                                />
                                <AppDate
                                    v-else-if="modal.field.type == 'date'"
                                    v-model="modal.field.default_value"
                                    @update:modelValue="val => { if (val !== null && val !== '') modal.field.set_default = 1 }"
                                    :options="{
                                        id: 0,
                                        title: 'Значение по умолчанию',
                                        name: 'default_value'
                                    }"
                                />
                                <AppTextarea
                                    v-else-if="modal.field.type == 'text' && modal.field.is_plural"
                                    v-model="modal.field.default_value"
                                    @update:modelValue="val => { if (val !== null && val !== '') modal.field.set_default = 1 }"
                                    :options="{
                                        id: 0,
                                        title: 'Значение по умолчанию',
                                        name: 'default_value'
                                    }"
                                />
                                <AppInput
                                    v-else
                                    v-model="modal.field.default_value"
                                    @update:modelValue="val => { if (val !== null && val !== '') modal.field.set_default = 1 }"
                                    :options="{
                                        id: 0,
                                        title: 'Значение по умолчанию',
                                        type: modal.field.type == 'number' ? 'number' : 'text',
                                        name: 'default_value',
                                        mask: modal.field.mask ?? null
                                    }"
                                />
                            </div>
                        </template>
                    </AppPopup>
                </div>
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
                        id: 'roles_read',
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
                        id: 'roles_write',
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
            </template>
        </div>
    </AppModalWarning>
</template>

<script setup>
    import './Modal.scss';
    
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    import { Validator, isImageSrc } from '@AppHelpers/classes.js'
    import draggable from 'vuedraggable'; 
    import IconClose from '@AppIcons/Close.vue'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue';
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppColorPicker from '@AppComponents/Inputs/ColorPicker/ColorPicker.vue';
    import AppPopup from '@AppComponents/Popup/Popup.vue'
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
            this.fields = {
                default: {
                    id: 0,
                    type: '',
                    section_id: '',
                    title: '',
                    required: 0,
                    visible_always: 1,
                    default_value: null,
                    set_default: 0,
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
                    can_create: false,
                    options: []
                },
                text_group: {
                    options: [],
                    subfields: []
                },
                file: {
                    button_name: null,
                    show_file_name: false,

                },
                redactor: {},
                checkbox: {}
            }
            this.types = {
                text: 'Строка',
                number: 'Число',
                select_dropdown: 'Список',
                status: 'Статус',
                file: 'Файл',
                relation: 'Программное',
                date: 'Дата',
                checkbox: 'Чекбокс',
                text_group: 'Группа полей',
                redactor: 'Редактор',
                deal_stages: 'Стадии Bitrix24',
            }

            this.field = {}
            this.validator = new Validator()
        }

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

        addOption() {
            this.field.options.push({
                label: '',
                value: this.field.options.length
            })
        }

        removeOption(option) {
            this.field.options = this.field.options.filter(p => p.value != option.value)
        }

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

        getTextGroupOptions() {
            const list = this.getFields()
            return list.map(field => {
                return {
                    label: field.title,
                    value: field.id
                }
            })
        }

        save() {
            if (this.field.has_roles_read && this.field.roles_read.length == 0) {
                this.field.has_roles_read = 0
            }
            if (this.field.has_roles_write && this.field.roles_write.length == 0) {
                this.field.has_roles_write = 0
            }
            const request = JSON.parse(JSON.stringify(this.field))

            if (this.field.type == 'status') {
                const stillExists = (request.options || []).some(o => String(o.value) === String(request.default_value))
                if (!stillExists) {
                    request.default_value = null
                    request.set_default = 0
                }
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

            if (this.field.type == 'deal_stages') {
                request.options = (request.options || []).map(option => {
                    const base = option.b24_label ?? ''
                    const custom = String(option.label ?? '').trim()
                    const isCustom = custom !== '' && custom !== base
                    return {
                        ...option,
                        label: isCustom ? `${custom} (${base})` : base,
                        custom_label: isCustom ? custom : '',
                        file: option.file ? option.file[0]?.url ?? null : null
                    }
                })
                request.show_stage_bar = request.show_stage_bar ? 1 : 0
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

    const FIELDS_WITHOUT_DEFAULT_VALUE = ['id', 'created_at', 'updated_at', 'plan_time']

    const defaultValueLabel = (field) => {
        if (field.type == 'date' && field.default_value) {
            const date = new Date(field.default_value)
            if (!isNaN(date.getTime())) return date.toLocaleDateString('ru-RU')
        }
        if (field.type == 'status') {
            const option = (field.options || []).find(o => String(o.value) === String(field.default_value))
            return option?.label ?? field.default_value
        }
        return field.default_value
    }

    const statusDefaultOptions = computed(() => (modal.value.field?.options || []).map(o => ({
        value: o.value,
        label: {
            id: o.value,
            text: o.label,
            color: o.color ?? '#B6B6B6',
            file: Array.isArray(o.file) ? (o.file[0]?.url ?? null) : null,
            is_hidden: 0
        }
    })))

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
                const groupFieldOptions = Array.isArray(props.modal.content.fields)
                    ? props.modal.content.fields.map(f => ({ label: f.title, value: f.id }))
                    : []
                modal.value.field = {
                    ...props.modal.content,
                    subfields: Array.isArray(props.modal.content.fields)
                        ? props.modal.content.fields.map(f => f.id)
                        : (props.modal.content.subfields || []),
                    options: [...groupFieldOptions, ...modal.value.getTextGroupOptions()],
                }
            } else if (props.modal.content.type == 'status') {
                const statusOptions = Array.isArray(props.modal.content.options) ? props.modal.content.options : []
                modal.value.field = {
                    ...props.modal.content,
                    options: statusOptions.filter(option => option.label && !option.label.is_hidden).map(option => {
                        return {
                            label: option.label.text,
                            value: option.label.id,
                            color: option.label.color,
                            file: isImageSrc(option.label.file) ? [{url: option.label.file}] : null
                        }
                    })
                }
            } else if (props.modal.content.type == 'deal_stages') {
                const stageOptions = Array.isArray(props.modal.content.options) ? props.modal.content.options : []
                modal.value.field = {
                    ...props.modal.content,
                    roles_write: props.modal.content.roles_write ? props.modal.content.roles_write.filter(p => userStore.roles.find(r => r.id == p))  : [],
                    roles_read: props.modal.content.roles_write ? props.modal.content.roles_read.filter(p => userStore.roles.find(r => r.id == p))  : [],
                    show_stage_bar: props.modal.content.show_stage_bar === 0 ? 0 : 1,
                    options: stageOptions.map(option => {
                        const base = option.b24_label ?? option.label ?? ''
                        return {
                            ...option,
                            label: option.custom_label || base,
                            b24_label: base,
                            file: isImageSrc(option.file) ? [{url: option.file}] : null
                        }
                    })
                }
            } else {
                modal.value.field = {
                    ...props.modal.content,
                    roles_write: props.modal.content.roles_write ? props.modal.content.roles_write.filter(p => userStore.roles.find(r => r.id == p))  : [],
                    roles_read: props.modal.content.roles_write ? props.modal.content.roles_read.filter(p => userStore.roles.find(r => r.id == p))  : [],
                }
            }
        }
    })
</script>
