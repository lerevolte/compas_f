<template>
    <div 
        class="tile-section"
        ref="sectionRef"
        :class="{
            'tile-section_editting': section.fields.find(item => item.edit || (item.type == 'text_group' && item.fields.find(item => item.edit))),
            // 'tile-section_short' временно отключён — UI сворачивания скрыт, данные всегда развёрнуты.
            // 'tile-section_short': section.isLocalShort,
            'tile-section_field': props.options.type == 'field'
        }">
        <div class="tile-section__header" ref="headerRef" >
            <span class="blank__title" v-if="props.options.type == 'field'">
                {{ section.name }}
            </span>

            <div class="tile-section__title" v-else>
                <IconDragDotted class="icon_drag-section" v-if="!props.options?.isModule" />
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
                <IconEdit v-if="!props.options?.isModule" v-show="!section.editTitle" @click="section.initEditTitle()"/>
            </div>

            <div class="tile-section__actions" v-if="!props.options.isGlobalEdit && props.options.type != 'field' && !props.options.isModule">
                <AppButton class="button_text" v-if="section.fields.find(item => item.edit || (item.type == 'text_group' && item.fields.find(item => item.edit)))" @click="fieldObject.section.cancelEditAll(props.section)">
                    Отмена
                </AppButton>
                <AppButton class="button_text" v-else-if="section.fields.some(item => item.can_edit || (item.type == 'text_group' && item.fields && item.fields.some(sf => sf.can_edit)))" @click="editAll()">
                    Изменить
                </AppButton>
                <AppPopup v-if="!props.options.isModule && userStore.user?.is_admin" :isPreventBottom="true">
                    <template #header>
                        <IconSettings />
                    </template>
                    <template #content>
                        <div class="popup__option popup__option_checkbox" v-if="false">
                            <AppCheckbox
                                v-model="section.is_short"
                                :options="{
                                    title: 'Свернуть'
                                }"
                                @update:model-value="section.hideSection()"
                            />
                        </div>
                        <div class="popup__option popup__option_red" @click="emit('actionSection', {action: 'initDelete', value: section})">
                            Удалить
                        </div>
                    </template>
                </AppPopup>
            </div>
        </div>

        <draggable
            tag="div"
            :group="{
                name: props.options.type == 'field' ? 'tile-group-fields' : 'tile-section-fields',
                pull: true,
                put: true
            }"
            v-model="props.section.fields"
            :forceFallback="true"
            :fallbackOnBody="true"
            :item-key="String(props.section.id)"
            handle=".icon_drag-field"
            class="tile-section__body"
            :data-tile-type="props.options.type == 'field' ? 'field' : 'section'"
            :data-tile-id="String(props.section.id)"
            drag-class="draggable-drag"
            ghost-class="draggable-ghost"
            fallback-class="draggable-fallback"
            @change="event => fieldObject.dragChange(event, {type: props.options.type}, props.section)"
            @start="event => fieldObject.dragStart(event)"
            @end="event => fieldObject.dragEnd(event, {type: props.options.type})"
        >
            <template #item="{ element: field }">
                <div 
                    class="field" 
                    :class="{ 
                        'field_hidden': !props.options.isModule && !field.edit && fieldObject.checkVisible(field, true),
                        'field_empty': !field.edit && fieldObject.checkVisible(field, false),
                        'field_static': !field.can_edit,
                        'blank_required': field.required
                    }"
                    @click="e => fieldObject.initChangeField(field, e.target)"
                >
                    <IconDrag 
                        v-if="!props.options?.isModule"
                        class="icon_drag-field"
                    />

                    <AppStatus 
                        v-if="field.type == 'status'"
                        :options="{
                            ...field,
                            focus: !localGlobalEdit,
                            edit: field.edit,
                            isCanCreate: field.can_create ?? false,
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
                                slug: props.sectionClass.slug,
                                page_id: props.pageId ?? null
                            }
                        }"
                        v-model="field.value"
                        @update:model-value="fieldObject.initChangeField(field, null, 'option')"
                        @update-file-info="value => field.value = value"
                    />

                    <AppRelation  
                        v-else-if="field.type == 'relation'"
                        :error="field.error"
                        :options="{
                            id: field.id,
                            title: field.title,
                            edit: field.edit ?? false,
                            type: field.type,
                            slug: field.related_table,
                            list: field.options ? field.options.filter(p => p) : [],
                            name: field.key,
                            relation: field.id,
                            focus: !localGlobalEdit,
                            searchable: true,
                            required: false,
                            isHaveNull: true,
                            visibleCount: 5,
                            isSetDefault: true,
                            isCanAdd: !props.options.isModule && (field.can_create ?? true),
                            multiple: field.is_plural,
                            placeholder: '' 
                        }"
                        v-model="field.value"
                        @showAll="() => props.tabs.set({tab: props.tabs.list.find(p => p.slug == field.related_table), is_module: false})"
                        @create="item =>  emit('action', {
                            action: 'openModal', 
                            value: {
                                id: 0, 
                                type: 'create',
                                slug: field.related_table
                            }
                        })"
                        @clickLink="id => emit('action', {
                            action: 'openModal', 
                            value: {
                                id, 
                                slug: field.related_table
                            }
                        })"
                    />

                    <AppMap
                        v-else-if="field.type == 'address'"
                        :options="{
                            ...field,
                            focus: !localGlobalEdit
                        }"
                        :error="field.error"
                        v-model="field.value"
                    />

                    <AppRedactor
                        v-else-if="field.type == 'redactor'"
                        :options="{
                            id: field.id,
                            title: field.title,
                            name: field.key
                        }"
                        v-model="field.value"
                        @update:model-value="!field.edit && fieldObject.initChangeField(field, null, 'option')"
                    />

                    <TileSectionComponent 
                        v-else-if="field.type == 'text_group'"
                        class="column-fields__item column-section"
                        :section="{
                            id: field.id,
                            name: field.title,
                            is_short: false,
                            fields: field.fields
                        }"
                        :options="{
                            type: 'field',
                            isDisableFooter: true,
                            localGlobalEdit: localGlobalEdit,
                            isGlobalEdit: props.options.isGlobalEdit,
                        }"
                        :sectionClass="props.sectionClass"
                        :listSection="props.listSection"
                        :pageId="props.pageId"
                        :hidden="props.hidden"
                        @action="action => emit('action', action)"
                        @actionField="action => emit('actionField', action)"
                        @update:hidden="fields => emit('update:hidden', fields)"
                        @actionSection="action => emit('actionSection', action)"
                    />

                    <template v-if="field.edit">
                        <AppDate 
                            v-if="field.type == 'date'"
                            :options="{
                                ...field,
                                focus: !localGlobalEdit    
                            }"
                            :error="field.error"
                            v-model="field.value"
                        />
                        <AppTextarea 
                            v-else-if="field.type == 'text' && field.is_plural"
                            :options="{
                                ...field,
                                focus: !localGlobalEdit
                            }"
                            :error="field.error"
                            v-model="field.value"
                        />

                        <div class="section__field-group" v-else-if="field.type == 'text'">
                            <AppInput 
                                :options="{
                                    ...field,
                                    focus: !localGlobalEdit
                                }"
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
                                v-model="fieldObject.setFieldValue(field, 'external_link').value"
                            />
                        </div>

                        <AppInput 
                            v-else-if="['number', 'password'].includes(field.type)"
                            :options="{
                                ...field,
                                focus: !localGlobalEdit    
                            }"
                            :error="field.error"
                            v-model="field.value"
                        />

                        <AppSelect
                            v-else-if="field.type == 'select_dropdown'"
                            :error="field.error"
                            :options="{
                                ...field,
                                focus: !localGlobalEdit,
                                list: field.options,
                                multiple: field.is_plural,
                                isHaveNull: !field.required
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
                            :class="{'blank_pre': field.is_plural}"
                            :options="{
                                color: field.set_color ? field.color : '#000',
                                isCheckEmpty: true,
                                isLink: field.is_external_link
                            }"
                            :item="{
                                title: field.title,
                                link: field.is_external_link && field.value ? field.value.external_link ?? null : null,
                                text: field.is_external_link && field.value ? field.value.value ?? field.value : field.value,
                                unit: field.unit ?? null
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

                        <div class="blank" v-else-if="field.type == 'json'">
                            <span class="blank__title">
                                {{ field.title }}
                            </span>
                            <p 
                                class="blank__text" 
                                :class="{'blank__text_empty': !fieldObject.setFieldValue(field).value}" 
                                v-html="fieldObject.setFieldValue(field).value"></p>
                        </div>
                    </template>

                    <AppPopup class="field__settings" v-if="!props.options?.isModule">
                        <template #header>
                            <IconSettings />
                        </template>
                        <template #content>
                            <div
                                class="popup__option"
                                v-show="field.can_edit && !field.edit"
                                @click="(e) => {
                                    if (field.type === 'text_group') {
                                        props.sectionClass.editAll(field);
                                    } else {
                                        fieldObject.initChangeField(field, null, 'option');
                                    }
                                    e.target?.closest('.popup')?.classList.remove('popup_open');
                                }"
                            >
                                Изменить
                            </div>
                            <div
                                class="popup__option"
                                v-if="userStore.user?.is_admin"
                                @click="(e) => {
                                    emit('actionField', {
                                        action: 'initUpdate',
                                        value: field
                                    });
                                    e.target?.closest('.popup')?.classList.remove('popup_open');
                                }"
                            >
                                Настроить
                            </div>
                            <div class="popup__option popup__option_checkbox" data-popup-close v-if="field.type != 'text_group' && userStore.user?.is_admin">
                                <AppCheckbox
                                    v-model="field.visible_always"
                                    :options="{
                                        title: 'Показывать всегда'
                                    }"
                                    @update:model-value="value => {
                                        field.visible_always = value;
                                        fieldObject.changeVisibleAlways({field});
                                    }"
                                />
                            </div>
                            <div 
                                class="popup__option" 
                                v-show="field.type != 'text_group'" 
                                @click="(e) => {
                                    emit('actionField', {
                                        action: 'hide',
                                        value: field
                                    });
                                    e.target?.closest('.popup')?.classList.remove('popup_open');
                                }"
                            >
                                Скрыть
                            </div>
                           <div
                                class="popup__option popup__option_red"
                                v-show="!field.is_permanent && userStore.user?.is_admin"
                                @click="(e) => {
                                    emit('actionField', {
                                        action: 'initDelete',
                                        value: field
                                    });
                                    e.target?.closest('.popup')?.classList.remove('popup_open');
                                }"
                            >
                                Удалить
                            </div>
                        </template>
                    </AppPopup>
                </div>
            </template>
        </draggable> 

        <div class="tile-section__footer" v-if="!props.options.isDisableFooter && !props.options?.isModule">
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
            <AppButton class="button_text" v-if="userStore.user?.is_admin" @click="emit('actionField', {
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
    import TileSectionComponent from '@AppComponents/TileSection/TileSection.vue'
    
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import { Field } from '@AppHelpers/classes.js'

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
    import AppRedactor from '@AppComponents/Inputs/Redactor/Redactor.vue'
    import { useUserStore } from '@/stores/userStore.js'

    const userStore = useUserStore()

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
        tabs: {
            default: {
                active: {
                    tab: "order"
                },
                is_module: false,
                queryTab: {},
                list: []
            },
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
                type: 'section',
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
    const localGlobalEdit = ref(false)
    
    class TileSection {
        constructor() {
            this.id = 0
            this.name = ''
            this.is_short = 0
            this.isLocalShort = 0
            this.editTitle = false
            this.fields = computed(() => props.section.fields)
        }

        // Получение секции
        async get() {
            const response = props.section
            this.id = response.id
            this.name = response.name
            this.is_short = response.is_short
            this.isLocalShort = response.is_short

            if (props.options?.isGlobalEdit) {
                for (let field of response.fields) {
                    fieldObject.value.initChangeField(field, null, 'option')
                }
            }
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
            this.setLocalShort(this.is_short)
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

    const editAll = () => {
        localGlobalEdit.value = true
        fieldObject.value.section.editAll(props.section)

        setTimeout(() => {
            localGlobalEdit.value = false
        }, 200);
    }

    watch(() => props.options.localGlobalEdit, () => {
        localGlobalEdit.value = props.options.localGlobalEdit
    })

    onMounted(async () => {
        localGlobalEdit.value = props.options.isGlobalEdit
        await section.value.get()
    })
</script>
