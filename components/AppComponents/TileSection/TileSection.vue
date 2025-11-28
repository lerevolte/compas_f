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
        </div>

        <draggable
            tag="div"
            group="sections"
            v-model="props.section.fields" 
            :forceFallback="true"
            :fallbackOnBody="true"
            :item-key="String(props.section.id)" 
            handle=".icon_drag-field"
            class="tile-section__body"
            drag-class="draggable-drag"
            ghost-class="draggable-ghost"
            fallback-class="draggable-fallback"
            @start="event => fieldObject.dragStart(event)"
            @end="event => fieldObject.dragEnd(event)"
            @change="emit('action', {
                action: 'changeOrder',
                value: section.fields
            })"
        >
            <template #item="{ element: field }">
                <div 
                    class="group-field" 
                    :class="{ 
                        'group-field_hidden': !field.edit && fieldObject.checkVisible(field),
                        'group-field_static': !field.can_edit,
                        'blank_required': field.required
                    }"
                    @click="e => fieldObject.initChangeField(field, e.target)"
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
                        v-model="fieldObject.setFieldValue(field).value"
                    />

                    <AppFile 
                        v-else-if="field.type == 'file'"
                        :error="field.error"
                        :options="{
                            ...field,
                            multiple: true,
                            edit: field.edit,
                            isDraggable: true,
                            query: {
                                field_id: field.id,
                                page_id: props.pageId ?? null
                            }
                        }"
                        v-model="field.value"
                        @update:model-value="fieldObject.initChangeFieldOption(field)"
                    />

                    <AppRelation  
                        v-else-if="field.type == 'relation'"
                        :parentContainer="sectionRef"
                        :error="field.error"
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

                    <AppMap 
                        v-else-if="field.type == 'address'"
                        :options="field"
                        :error="field.error"
                        v-model="field.value"
                    />

                    <template v-if="field.edit">
                        <AppDate 
                            v-if="field.type == 'date'"
                            :options="field"
                            :error="field.error"
                            v-model="field.value"
                        />
                        <AppTextarea 
                            v-else-if="field.type == 'text' && field.is_plural"
                            :options="field"
                            :error="field.error"
                            v-model="field.value"
                        />

                        <div class="section__field-group" v-else-if="field.type == 'text'">
                            <AppInput 
                                :options="field"
                                :error="field.error"
                                v-model="fieldObject.setFieldValue(field, 'value').value"
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
                            :error="field.error"
                            v-model="field.value"
                        />

                        <AppSelect 
                            v-else-if="field.type == 'select_dropdown'"
                            :error="field.error"
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
                                text: fieldObject.getSelectValue(field).value
                            }"
                        />
                    </template>
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
                    <div class="popup__option popup__option_empty" v-if="props.hidden.length == 0"></div>
                    <div 
                        class="popup__option" 
                        v-for="field in props.hidden"
                        v-else
                        :key="field.id"
                        @click="emit('actionField', {
                            action: 'show',
                            value: field
                        })"
                    >
                        {{ field.title }}
                    </div>
                </template>
            </AppPopup>
            <AppButton class="button_text" @click="emit('actionField', {
                action: 'initCreate',
                value: null
            })">
                Создать поле
            </AppButton>
        </div>
    </div>
</template>

<script setup>
    import './TileSection.scss';
    
    import draggable from 'vuedraggable'; 
    import IconEdit from '@AppIcons/Actions/Edit.vue';
	import AppH3 from '@AppComponents/Headers/H3/H3.vue';
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import IconSettings from '@AppIcons/Actions/Settings.vue'
    import IconDragDotted from '@AppIcons/Actions/DragDotted.vue'
    import GroupField from '@AppComponents/GroupField/GroupField.vue'
    
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import { Validator, Field } from '@AppHelpers/classes.js'

    import { format } from 'date-fns'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'
    import AppMap from '@AppComponents/Inputs/Map/Map.vue'


    const emit = defineEmits([
        'update:hidden',
        'action',
        'actionField',
        'actionSection'
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
        sectionClass: {
            default: null,
            type: Object
        },
        hidden: {
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
                isDisableFooter: false,
                isGlobalEdit: false,
                modal: {
                    state: false,
                    section: null
                }
            },
            type: Object
        },
        edit: {
            default: {
                action: 'cancel',
                state: false,
                backups: [],
                fields: []
            },
            type: Object
        }
    })

    const textareaRef = ref(null)
    const sectionRef = ref(null)
    const headerRef = ref(null)
    
    class TileSection {
        constructor() {
            this.id = 0
            this.name = ''
            this.is_short = 0
            this.isLocalShort = 0
            this.editTitle = false
            this.fields = computed(() => props.section.fields)
            this.validator = new Validator()
        }

        // Получение секции
        async get() {
            const response = props.section
            this.id = response.id
            this.name = response.name
            this.is_short = response.is_short
            this.isLocalShort = response.is_short
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

            emit('actionSection', {action: 'update', value: {
                name: this.name,
                is_short: this.is_short ?? false,
                id: this.id
            }})
        }

        // Обновление секции
        hideSection() {
            this.isLocalShort = this.is_short
            emit('actionSection', {action: 'update', value: {
                name: this.name,
                is_short: this.is_short ?? false,
                id: this.id
            }})
        }

        // Установка локального состояния
        setLocalShort(state) {
            this.isLocalShort = state
        }

        // Проверка полей
        checkFields() {
            const fields = section.value.fields.list.filter(field => field.edit)
            section.value.validator.check(fields)

            for (let field of this.list) {
                field.error = {
                    state: section.value.validator.errors[field.key] ?? false,
                    text: section.value.validator.errors[field.key] ?? null
                }
            }

            emit('action', {action: 'getSectionValidate', value: {
                section_id: section.value.id,
                fields: fields,
                state: section.value.validator.state
            }})
        }
    }

    const section = ref(new TileSection())
    const fieldObject = ref(new Field(props.sectionClass, emit))

    // Проверка клика вне заголовка при его редактировании
    const checkClick = (e) => {
        if (!headerRef.value.contains(e.target)) {
            document.removeEventListener('click', checkClick);
            section.value.setTitle(e)
        } 
    }

    onMounted(async () => {
        await section.value.get()
    })
</script>
