<template>
    <div 
        ref="sectionRef"
        class="group-field" 
        :class="{ 
            'group-field_hidden': !field.item.edit && field.checkVisible(),
            'group-field_static': !field.item.can_edit,
            'blank_required': field.item.required
        }"
        @click="e => field.initChangeField(e.target, 'target')"
    >
        <IconDrag 
            class="icon_drag-field"
        />

        <AppStatus 
            v-if="field.item.type == 'status'"
            :parentContainer="sectionRef"
            :options="{
                ...field.item,
                edit: field.item.edit,
                list: field.item.options,
                isHaveNull: false
            }"
            v-model="field.setFieldValue"
        />

        <AppFile 
            v-else-if="field.item.type == 'file'"
            :error="field.item.error"
            :options="{
                ...field.item,
                multiple: true,
                edit: field.item.edit,
                isDraggable: true,
                query: {
                    field_id: field.item.id,
                    page_id: props.pageId ?? null
                }
            }"
            v-model="field.item.value"
            @update:model-value="field.initChangeField(null, 'option')"
        />

        <AppRelation  
            v-else-if="field.item.type == 'relation'"
            :parentContainer="sectionRef"
            :error="field.item.error"
            :options="{
                id: field.item.id,
                title: field.item.title,
                edit: field.item.edit ?? false,
                type: field.item.type,
                list: field.item.options.filter(p => p),
                name: field.item.key,
                relation: field.item.id,
                searchable: true,
                required: false,
                isHaveNull: true,
                isSetDefault: true,
                multiple: field.item.is_plural,
                placeholder: '' 
            }"
            v-model="field.item.value"
            @clickLink="id => emit('action', {
                action: 'openModal', 
                value: {
                    id, 
                    slug: field.item.related_table
                }
            })"
            @create="item => emit('action', {
                action: 'createEntity', 
                value: {
                    item, 
                    slug: field.item.related_table
                }
            })"
        />

        <template v-if="field.item.edit">
            <AppDate 
                v-if="field.item.type == 'date'"
                :options="field.item"
                :error="field.item.error"
                v-model="field.item.value"
            />
            <AppTextarea 
                v-else-if="field.item.type == 'text' && field.item.is_plural"
                :options="field.item"
                :error="field.item.error"
                v-model="field.item.value"
            />

            <div class="section__field-group" v-else-if="field.item.type == 'text'">
                <AppInput 
                    :options="field.item"
                    :error="field.item.error"
                    v-model="field.setFieldValue"
                />
                <AppInput 
                    v-if="field.item.is_external_link"
                    :options="{
                        id: `${field.item.id}_external_link`,
                        title: 'Внешняя ссылка',
                        type: 'text',
                        name: 'external_link'
                    }"
                    v-model="field.item.value.external_link"
                />
            </div>

            <AppInput 
                v-else-if="['number', 'password'].includes(field.item.type)"
                :options="field.item"
                :error="field.item.error"
                v-model="field.item.value"
            />

            <AppSelect 
                v-else-if="field.item.type == 'select_dropdown'"
                :error="field.item.error"
                :options="{
                    ...field.item,
                    list: field.item.options,
                    multiple: field.item.is_plural
                }"
                v-model="field.item.value"
            />
        </template>
        <template v-else>
            <AppBlank 
                v-if="field.item.type == 'date'"
                :options="{
                    isCheckEmpty: true
                }"
                :item="{
                    title: field.item.title,
                    text: field.item.value ? format(field.item.value, 'dd.MM.yyyy') : null
                }"
            />

            <AppBlank 
                v-else-if="['text', 'number'].includes(field.item.type)"
                :options="{
                    isCheckEmpty: true,
                    isLink: field.item.is_external_link
                }"
                :item="{
                    title: field.item.title,
                    link: field.item.is_external_link ? field.item.value.external_link ?? null : null,
                    text: field.item.is_external_link ? field.item.value.value ?? field.item.value : field.item.value
                }"
            />

            <AppBlank 
                v-else-if="field.item.type == 'password'"
                :options="{
                    isCheckEmpty: false,
                    isLink: false
                }"
                :item="{
                    title: field.item.title,
                    text: '••••••••••'
                }"
            />

            <AppBlank 
                v-else-if="field.item.type == 'select_dropdown'"
                :options="{
                    isCheckEmpty: true
                }"
                :item="{
                    title: field.item.title,
                    text: field.item.getSelectValue
                }"
            />
        </template>

        <AppPopup class="field__settings" :isPreventBottom="true">
            <template #header>
                <IconSettings />
            </template>
            <template #content>
                <div class="popup__option" v-show="props.field.can_edit && !props.field.edit" @click="(e) => field.initChangeField(e.target, 'option')">
                    Изменить
                </div>
                <div class="popup__option" @click="emit('actionField', {
                    action: 'initUpdate',
                    value: props.field
                })">
                    Настроить
                </div>
                <div class="popup__option popup__option_checkbox" v-if="props.field.type != 'text_group'">
                    <AppCheckbox 
                        v-model="props.field.visible_always"
                        :options="{
                            title: 'Показывать всегда'
                        }"
                        @update:model-value="emit('actionField', {
                            action: 'changeVisibleAlways',
                            value: props.field
                        })"
                    />
                </div>
                <div 
                    v-show="props.field.type != 'text_group'" 
                    class="popup__option" 
                    @click="emit('actionField', {
                        action: 'hide',
                        value: props.field
                    })"
                >
                    Скрыть
                </div>
                <div 
                    class="popup__option popup__option_red" 
                    v-show="!props.field.is_permanent" 
                    @click="emit('actionField', {
                        action: 'initDelete',
                        value: props.field
                    })">
                    Удалить
                </div>
            </template>
        </AppPopup>
    </div>
</template>

<script setup>
    import './GroupField.scss';

    import { format } from 'date-fns'
    import { Field } from '@AppHelpers/classes.js'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import IconSettings from '@AppIcons/Actions/Settings.vue'
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppDate from '@AppComponents/Inputs/Date/Date.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppTextarea from '@AppComponents/Inputs/Textarea/Textarea.vue';
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'

    const props = defineProps({
        field: {
            default: {},
            type: Object
        }, 
        sectionClass: {
            default: null,
            type: Object
        },
    })

    const emit = defineEmits([
        'action',
        'actionField'
    ])

    const sectionRef = ref(null)

    // Класс поля
    // class Field {
    //     constructor() {
    //         this.item = props.field
    //         this.dragger = null
    //     }


    //     // // Редактирование всех полей в секции
    //     // editAll() {
    //     //     this.backup = JSON.parse(JSON.stringify(this.list.filter(field => field.can_edit && !field.edit).map(item => {
    //     //         return {
    //     //             id: item.id,
    //     //             value: item.value
    //     //         }
    //     //     })))
    //     //     this.list.filter(field => field.can_edit && !field.edit).forEach(element => {
    //     //         element.edit = true
    //     //     });
    //     // }

    //     // // Отмена редактирования всех полей
    //     // cancelEditAll(isWatch = false) {
    //     //     let findedField = null


    //     //     this.list.forEach((field) => {
    //     //         findedField = this.backup.find(f => f.id == field.id)
    //     //         if (findedField) {
    //     //             field.value = findedField.value
    //     //             field.edit = false
    //     //         }
    //     //     })

    //     //     if (!isWatch) {
    //     //         emit('action', {
    //     //             action: 'cancelSection',
    //     //             value: this.backup
    //     //         })
    //     //     }

    //     //     this.backup = []
    //     // }

    const field = ref(new Field(props.field, props.sectionClass, emit))

</script>
