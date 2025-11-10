<template>
    <div class="tile-section" ref="sectionRef" :class="{ 'tile-section_short': section.isLocalShort }">
        <div class="tile-section__header" ref="headerRef" >
            <div class="tile-section__title">
                <IconDragDotted class="icon_drag-section" />
                <AppH3 class="textarea_title">
                    <p 
                        class="ghost_text" 
                        :class="{'ghost_text_show': !section.editTitle}" 
                        @click="() => !section.editTitle && section.setLocalShort(!section.isLocalShort)" 
                        v-html="section.name"
                    ></p>
                    <AppTextarea 
                        ref="textareaRef"
                        :options="{
                            disabled: !section.editTitle,
                            preventEnter: true
                        }"
                        @keyup.enter="e => section.setTitle(e)"
                        v-model="section.name"
                    />
                </AppH3>
                <IconEdit v-show="!section.editTitle" @click="section.initEditTitle()"/>
            </div>

            <div class="tile-section__actions" v-if="!props.isGlobalEdit">
                <AppButton class="button_text" v-if="section.fields.list.find(item => item.edit)" @click="section.fields.cancelEditAll()">
                    Отмена
                </AppButton>
                <AppButton class="button_text"  v-else @click="section.fields.editAll()">
                    Изменить
                </AppButton>
                <AppPopup :isPreventBottom="true">
                    <template #header>
                        <IconSettings />
                    </template>
                    <template #content>
                        <div class="popup__option popup__option_checkbox">
                            <AppCheckbox 
                                v-model="section.is_short"
                                :options="{
                                    title: 'Свернуть'
                                }"
                                @update:model-value="section.hideSection()"
                            />
                        </div>
                        <div class="popup__option popup__option_red" @click="emit('action', {action: 'initDelete', value: section})">
                            Удалить
                        </div>
                    </template>
                </AppPopup>
            </div>
        </div>

        <draggable
            tag="div"
            group="sections"
            v-model="section.fields.list" 
            :forceFallback="true"
            :fallbackOnBody="true"
            :item-key="String(section.id)" 
            handle=".icon_drag-field"
            class="tile-section__body"
            drag-class="draggable-drag"
            ghost-class="draggable-ghost"
            fallback-class="draggable-fallback"
            @end="event => section.fields.dragEnd(event)"
        >
            <template #item="{ element: field }">
                <div 
                    class="tile-section__field" 
                    :class="{ 
                        'tile-section__field_hidden': !field.edit && section.fields.checkVisible(field),
                        'tile-section__field_static': !field.can_edit,
                        'tile-section__field_required': field.required
                    }"
                    @click="e => section.fields.initChangeField(e.target, field)"
                >
                    <IconDrag 
                        class="icon_drag-field"
                    />

                    <AppStatus 
                        v-if="field.type == 'status'"
                        :parentContainer="sectionRef"
                        :options="{
                            ...field,
                            edit: field.edit,
                            list: field.options,
                            isHaveNull: false
                        }"
                        v-model="section.fields.setFieldValue(field).value"
                    />

                    <AppFile 
                        v-else-if="field.type == 'file'"
                        :options="{
                            ...field,
                            multiple: true,
                            edit: field.edit,
                            query: {
                                field_id: field.id,
                                page_id: props.pageId ?? null
                            }
                        }"
                        v-model="field.value"
                    />

                    <AppRelation  
                        v-else-if="field.type == 'relation'"
                        :parentContainer="sectionRef"
                        :options="{
                            id: field.id,
                            title: field.title,
                            edit: field.edit ?? false,
                            type: field.type,
                            list: field.options.filter(p => p),
                            name: field.key,
                            relation: field.id,
                            searchable: true,
                            required: false,
                            isHaveNull: true,
                            isSetDefault: true,
                            multiple: field.is_plural,
                            placeholder: '' 
                        }"
                        v-model="field.value"
                        @clickLink="id => emit('action', {
                            action: 'openModal', 
                            value: {
                                id, 
                                slug: field.related_table
                            }
                        })"
                        @create="item => emit('action', {
                            action: 'createEntity', 
                            value: {
                                item, 
                                slug: field.related_table
                            }
                        })"
                    />

                    <template v-if="field.edit">
                        <AppDate 
                            v-if="field.type == 'date'"
                            :options="field"
                            v-model="field.value"
                        />
                        <AppTextarea 
                            v-else-if="field.type == 'text' && field.is_plural"
                            :options="field"
                            v-model="field.value"
                        />

                        <div class="section__field-group" v-else-if="field.type == 'text'">
                            <AppInput 
                                :options="field"
                                v-model="section.fields.setFieldValue(field, 'value').value"
                            />
                            <AppInput 
                                v-if="field.is_external_link"
                                :options="{
                                    id: `${field.id}_external_link`,
                                    title: 'Внешняя ссылка',
                                    type: 'text',
                                    name: 'external_link'
                                }"
                                v-model="field.value.external_link"
                            />
                        </div>

                        <AppInput 
                            v-else-if="['number', 'password'].includes(field.type)"
                            :options="field"
                            v-model="field.value"
                        />

                        <AppSelect 
                            v-else-if="field.type == 'select_dropdown'"
                            :options="{
                                ...field,
                                list: field.options,
                                multiple: field.is_plural
                            }"
                            v-model="field.value"
                        />
                    </template>
                    <template v-else>
                        <AppBlank 
                            v-if="field.type == 'date'"
                            :options="{
                                isCheckEmpty: true
                            }"
                            :item="{
                                title: field.title,
                                text: field.value ? format(field.value, 'dd.MM.yyyy') : null
                            }"
                        />

                        <AppBlank 
                            v-else-if="['text', 'number'].includes(field.type)"
                            :options="{
                                isCheckEmpty: true,
                                isLink: field.is_external_link
                            }"
                            :item="{
                                title: field.title,
                                link: field.is_external_link ? field.value.external_link ?? null : null,
                                text: field.is_external_link ? field.value.value ?? field.value : field.value
                            }"
                        />

                        <AppBlank 
                            v-else-if="field.type == 'password'"
                            :options="{
                                isCheckEmpty: false,
                                isLink: false
                            }"
                            :item="{
                                title: field.title,
                                text: '••••••••••'
                            }"
                        />


                        <AppBlank 
                            v-else-if="field.type == 'select_dropdown'"
                            :options="{
                                isCheckEmpty: true
                            }"
                            :item="{
                                title: field.title,
                                text: section.fields.getSelectValue(field).value
                            }"
                        />
                    </template>

                    <AppPopup class="field__settings" :isPreventBottom="true">
                        <template #header>
                            <IconSettings />
                        </template>
                        <template #content>
                            <div class="popup__option" @click="field.edit = true">
                                Изменить
                            </div>
                            <div class="popup__option" @click="section.fields.initEdit(field)">
                                Настроить
                            </div>
                            <div class="popup__option popup__option_checkbox">
                                <AppCheckbox 
                                    v-model="field.visible_always"
                                    :options="{
                                        title: 'Показывать всегда'
                                    }"
                                    @update:model-value="section.fields.updateVisibleAlways(field)"
                                />
                            </div>
                            <div class="popup__option popup__option_red" @click="section.fields.initDelete(field)">
                                Удалить
                            </div>
                        </template>
                    </AppPopup>
                </div>
            </template>
        </draggable> 

        <div class="tile-section__footer" v-if="!props.options.isDisableFooter">
            <AppPopup :isPreventBottom="true">
                <template #header>
                    <AppButton class="button_text">
                        Добавить
                    </AppButton>
                </template>
                <template #content>
                    <div class="popup__option popup__option_empty" v-if="props.hiddenFields.length == 0"></div>
                    <div 
                        class="popup__option" 
                        v-for="field in props.hiddenFields"
                        v-else
                        :key="field.id"
                        @click="section.fields.show(field)"
                    >
                        {{ field.title }}
                    </div>
                </template>
            </AppPopup>
            <AppButton class="button_text" @click="section.fields.initCreate()">
                Создать поле
            </AppButton>
        </div>

        <SectionModal 
            :modal="section.fields.modal"
            :listSection="props.listSection"
            @delete="id => section.fields.delete(id)"
            @create="field => section.fields.create(field)"
        />
    </div>
</template>

<script setup>
    import './TileSection.scss';
    
    import { format } from 'date-fns';

    import draggable from 'vuedraggable'; 
    import SectionModal from './Modal/Modal.vue'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import IconEdit from '@AppIcons/Actions/Edit.vue';
	import AppH3 from '@AppComponents/Headers/H3/H3.vue';
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import IconSettings from '@AppIcons/Actions/Settings.vue'
    import IconDragDotted from '@AppIcons/Actions/DragDotted.vue'
    
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'

    const emit = defineEmits([
        'update:hiddenFields',
        'update:fieldSettings',
        'action'
    ])

    const props = defineProps({
        section: {
            default: {
                id: 0,
                name: '',
                is_short: 0,
                fields: [],
                children: []
            },
            type: Object
        },
        hiddenFields: {
            default: [],
            type: Array
        },
        pageId: {
            default: null,
            type: [Number, String]
        },
        listSection: {
            default: [],
            type: Array
        },
        options: {
            default: {
                isDisableFooter: false
            },
            type: Object
        },
        isGlobalEdit: {
            default: false,
            type: Boolean
        }
    })

    const textareaRef = ref(null)
    const sectionRef = ref(null)
    const headerRef = ref(null)
    
    class Section {
        constructor() {
            this.id = 0
            this.name = ''
            this.is_short = 0
            this.isLocalShort = 0
            this.editTitle = false
            this.fields = new Fields()
        }

        // Получение секции
        async get() {
            const response = props.section
            this.id = response.id
            this.name = response.name
            this.is_short = response.is_short
            this.fields.list = response.fields
        }
 
        // Редактирование заголовка
        initEditTitle() {
            this.editTitle = true
            nextTick(() => {
                textareaRef.value.textareaRef.querySelector('textarea').focus()
                document.addEventListener('click', checkClick);
            })
        }

        // Установка заголовка
        setTitle(e) {
            e.preventDefault()
            this.editTitle = false
            document.removeEventListener('click', checkClick);

            nextTick(() => {
                this.name = this.name.replaceAll('\n', '')
            })
        }

        // Обновление секции
        hideSection() {
            this.isLocalShort = this.is_short
        }

        // Установка локального состояния
        setLocalShort(state) {
            this.isLocalShort = state
        }
    }

    // Класс поля
    class Fields {
        constructor() {
            this.list = []
            this.backup = []
            this.modal = {
                state: false,
                title: 'Настройки поля',
                actionTitle: 'Сохранить',
                action: 'update',
                content: {},
                text: null
            }
        }

        // Перетаскивание полей
        dragEnd(event) {
            console.log(event);
            
        }

        // Редактирование всех полей в секции
        editAll() {
            this.backup = JSON.parse(JSON.stringify(this.list.filter(field => field.can_edit).map(item => {
                return {
                    id: item.id,
                    value: item.value
                }
            })))
            this.list.filter(field => field.can_edit).forEach(element => {
                element.edit = true
            });
        }

        // Отмена редактирования всех полей
        cancelEditAll() {
            let findedField = null
            this.list.forEach((field) => {
                findedField = this.backup.find(f => f.id == field.id)
                if (findedField) {
                    field.value = findedField.value
                    field.edit = false
                }
            })
        }

        // Показать поле
        show(field) {
            section.value.fields.list.push(field)
            emit('update:hiddenFields', props.hiddenFields.filter(f => f.id != field.id))
            emit('update:visibilityField', {
                id: field.id,
                is_hidden: false,
                change_section: true,
                section_id: section.value.id
            })
        }

        // Установка значения для поля
        setFieldValue(field, slug = 'value') {
            const response = computed({
                get() {

                    if (!field.value) return null 

                    if (field.type == 'address') {
                        return field.value
                    } else if (Array.isArray(field.value)) {
                        return field.value
                    } else if (field.type == 'relation') {
                        return field ?? null
                    } else {
                        return typeof field.value === 'object' && field.value !== null ? field.value[slug] : field.value
                    }
                },
                set(val) {
                    if (field.type == 'address') {
                        field.value = val
                    }  else if (field.type == 'relation') {
                        field.value = val
                    }
                     else if (typeof field.value === 'object' && field.value !== null) {
                        if (slug in field.value) {
                            field.value[slug] = val
                        } else if ('value' in field.value) {
                            field.value.value = val
                        } else {
                            field.value = val
                        }
                    } else {
                        field.value = val
                    }
                }
            })
            return response
        }

        // Получение значений для выпадающих списков (с кэшем)
        getSelectValue(field) {
            const response = computed({
                get() {
                    // Проверяем что строка существует
                    if (!field.value) return null
                    
                    let response = null
                    if (Array.isArray(field.value)) response = field.options.filter(option => field.value.includes(option.value)).map(option => option.label)
                    else if (typeof field.value == 'object' && field.value !== null) response = field.options.filter(option => option.value == field.value).map(option => option.label)
                    else response = field.options.filter(option => option.value == field.value).map(option => option.label)
                
                    if (field.type == 'select_dropdown') {
                        return response.join(', ')
                    } 
                    return response
                }
            })
            return response
        }

        // Проверка видимости
        checkVisible(field) {
            if (field.visible_always) {
                return false
            } else {
                if (field.type == 'select_dropdown') {
                    return !(this.getSelectValue(field).value != null && this.getSelectValue(field).value.length > 0)
                } else {
                    const value = this.setFieldValue(field).value
                    if (typeof value == 'string') {
                        return !(value != null && value != '')
                    } else if (value == null) {
                        return true
                    } else if (Array.isArray(value)) {
                        return !(value.filter(v => v != null && v != '').length > 0)
                    } else if (typeof value == 'object') {
                        if (value.value) {
                            return !(value.value.value ? value.value.value.filter(p => p).length > 0 : value.value.filter(p => p).length > 0)
                        }
                        return !(value.value && value.value.value != null && value.value.value.length > 0)
                    }
                    return false
                }
            }
        }

        // Обновление видимости
        updateVisibleAlways(field) {
            emit('update:fieldSettings', {
                id: field.id,
                visible_always: field.visible_always
            })
        }

        // Инициализация редактирования
        initEdit(field) {
            this.modal = {
                state: true,
                title: 'Настройки поля',
                actionTitle: 'Сохранить',
                action: 'update',
                content: JSON.parse(JSON.stringify({
                    ...field,
                    section_id: section.value.id
                })),
                text: null
            }
        }

        // Обновление
        update(field) {
            emit('action', {action: 'updateField', value: field})
        }

        // Инициализация редактирования
        initCreate() {
            this.modal = {
                state: true,
                title: 'Создание поля',
                actionTitle: 'Создать',
                action: 'create',
                content: JSON.parse(JSON.stringify({
                    section_id: section.value.id
                })),
                text: null
            }
        }

        // Создание
        create(field) {
            emit('action', {action: 'createField', value: field})
        }

        // Инициализация удаления
        initDelete(field) {
            this.modal = {
                state: true,
                title: 'Удаление раздела',
                actionTitle: 'Удалить',
                action: 'delete',
                content: {
                    id: field.id
                },
                text: `Будет удалено поле ${field.title}. Продолжить?`
            }
        }

        // Удаление
        delete(id) {
            emit('action', {action: 'deleteField', value: id})
        }

        // Инициализация изменения поля
        initChangeField(target, field) {
            if (!field.can_edit) return 
            if (target.closest('.icon_drag') || target.closest('.field__settings') || target.closest('.blank__title')) return

            if (['text', 'number', 'date', 'select_dropdown'].includes(field.type)) {
                if (field.edit || 
                    target.classList.contains('blank__link') || 
                    (
                        target.classList.contains('blank__text') && 
                        !target.classList.contains('blank__text_empty')
                    )
                ) return
                this.backup.push(JSON.parse(JSON.stringify(field)))
                field.edit = true
            } else if (field.type == 'relation') {
                if (field.edit || (target.classList.contains('value__text_link') || target.classList.contains('select__value-img'))) return
                this.backup.push(JSON.parse(JSON.stringify(field)))
                field.edit = true
            } else if (field.type == 'status') {
                if (field.edit) return
                this.backup.push(JSON.parse(JSON.stringify(field)))
                field.edit = true
            } else if (field.type == 'file') {
                if (field.edit || (!target.classList.contains('file'))) return
                this.backup.push(JSON.parse(JSON.stringify(field)))
                field.edit = true
            }
        }
    }

    const section = ref(new Section())

    // Проверка клика вне заголовка при его редактировании
    const checkClick = (e) => {
        if (!headerRef.value.contains(e.target)) {
            section.value.editTitle = false
            document.removeEventListener('click', checkClick);
        } 
    }

    onMounted(async () => {
        await section.value.get()

        if (props.isGlobalEdit) {
            section.value.fields.editAll()
        }
    })
</script>
