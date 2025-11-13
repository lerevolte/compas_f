<template>
    <div class="column-fields" :class="{'column-fields_dragging': columns.dragger.isDragging}">
        <draggable
            v-for="(column, index) in columns.list"
            tag="div"
            group="columns"
            class="column-fields__column"
            ghost-class="draggable-ghost"
            drag-class="tile-section_drag"
            v-model="columns.list[index]" 
            item-key="id" 
            fallback-class="draggable-fallback"
            :forceFallback="true"
            :fallbackOnBody="true"
            handle=".icon_drag-section"
            @start="e => columns.dragger.dragStart(e)"
            @end="e => columns.dragger.dragEnd(e)"
            >
            <template #item="{ element: section }">
                <AppTileSection 
                    class="column-fields__item column-section"
                    :section="section"
                    :options="{
                        isDisableFooter: props.options.isDisableFooter,
                        isGlobalEdit: props.options.isGlobalEdit,
                        modal: props.options.modal.field
                    }"
                    :edit="props.edit"
                    :listSection="columns.listSection"
                    :pageId="props.pageId"
                    :hiddenFields="columns.hiddenFields"
                    @update:hiddenFields="fields => columns.hiddenFields = fields"
                    @update:visibilityField="field => columns.changeVisibilityField(field, index)"
                    @action="item => columns[item.action](item.value, index)"
                />
            </template>
            <template #footer>
                <AppButon class="button_text column-fields__button" @click="columns.initCreate(index)" v-if="!props.options.isDisableFooter">
                    Создать раздел 
                </AppButon>
                <AppHistory 
                    v-if="props.options.isHaveHistory && index == 'column_2'"
                    :title="'События'"
                    :history="props.history.fields"
                    :loading="props.history.loading"
                    @openModal="item => emit('openModal', item)"
                    @showMoreHistory="page => emit('showMoreHistory', page)"
                />
            </template>
        </draggable> 

        <teleport to="#menu__overlay" v-if="columns.modal.state">
            <AppModalWarning 
                :options="{
                    title: columns.modal.title,
                    action: columns.modal.action,
                    actionTitle: columns.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="props.options.modal.section.loading"
                @delete="columns.delete()"
                @create="columns.create()"
                @close="columns.modal.state = false"
            >
            <template v-if="columns.modal.action == 'delete'">
                <p class="warning__text">
                    {{ columns.modal.text }}
                </p>
            </template>
            <template v-else-if="columns.modal.action == 'create'">
                <AppInput 
                    v-model="columns.modal.content.name"
                    :options="{
                        id: 0,
                        title: 'Название раздела',
                        type: 'text',
                        name: 'name'
                    }"
                />
            </template>
            </AppModalWarning>
        </teleport>
    </div>
</template>

<script setup>
    import './ColumnFields.scss';
    
    import draggable from 'vuedraggable';
    import AppButon from '@AppComponents/Button/Button.vue';
    import AppHistory from '@AppComponents/History/History.vue';
    import AppTileSection from '@AppComponents/TileSection/TileSection.vue';
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    import AppInput from '@AppComponents/Inputs/Input/Input.vue';

    const props = defineProps({
        columns: {
            default: {
                column_1: [],
                column_2: []
            },
            type: Object
        },
        hiddenFields: {
            default: [],
            type: Array
        },
        history: {
            default: {
                loading: false,
                fields: {
                    data: [],
                    last_page: 1,
                    per_page: 20,
                    current_page: 1
                }
            },
            type: Object
        },
        options: {
            default: {
                modal: {
                    field: {
                        state: false,
                        loading: false
                    },
                    section: {
                        state: false,
                        loading: false
                    }
                },
                isHaveHistory: true,
                isGlobalEdit: false,
                isDisableFooter: false
            },
            type: Object
        },
        pageId: {
            default: null,
            type: [Number, String]
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

    const emit = defineEmits([
        'showMoreHistory',
        'openModal',
        'createEntity',
        'action'
    ])

    class Columns {
        constructor() {
            this.list = {
                column_1: [],
                column_2: []
            }
            this.hiddenFields = []
            this.modal = {
                state: false,
                title: 'Создание раздела',
                actionTitle: 'Удалить',
                action: 'delete',
                content: {},
                text: 'Все поля раздела скроются. Удалить раздел?'
            }
            this.listSection = computed(() => {
                return [...this.list.column_1, ...this.list.column_2].map(section => {
                    return {
                        label: section.name,
                        value: section.id
                    }
                })
            })
            this.dragger = new Drag()
        }

        // Получение колонок
        get() {
            this.list = JSON.parse(JSON.stringify(props.columns))
            this.hiddenFields = JSON.parse(JSON.stringify(props.hiddenFields))
        }

        // Инициализация удаления секции
        initDelete(section, key) {
            this.modal = {
                state: true,
                title: 'Удаление поля',
                actionTitle: 'Удалить',
                action: 'delete',
                content: {
                    id: section.id,
                    key: key,
                    fields: section.fields.list
                },
                text: 'Все поля раздела скроются. Удалить раздел?'
            }
        }

        // Удаление секции
        delete() {
            emit('action', { 
                action: 'deleteSection', 
                value: {
                    id: this.modal.content.id,
                    key: this.modal.content.key,
                    fields: [...this.hiddenFields, ...this.modal.content.fields]
                }
            })
        }

        // Обновление настроек секции
        updateSection(section, column) {
            this.list[column] = this.list[column].map(item => item.id == section.id ? {
                ...item,
                is_short: section.is_short,
                name: section.name
            } : item)
            
            emit('action', {
                action: 'updateSection',
                value: section
            })
        }

        // Инициализация создания
        initCreate(key) {
            this.modal = {
                state: true,
                title: 'Создание раздела',
                actionTitle: 'Создать',
                action: 'create',
                content: {
                    name: null,
                    key: key,
                },
                text: null
            }
        }

        // Создание секции
        create() {
            console.log(this.modal.content);
            
            emit('action', { 
                action: 'createSection', 
                value: {
                    key: this.modal.content.key,
                    name: this.modal.content.name
                }
            })
        }

        // Открытие модалки
        openModal(item) {
            emit('openModal', item)
        }

        // Создание сущности
        createEntity(item) {
            emit('createEntity', item)
        }

        // Удаление поля
        deleteField(id, index) {
            emit('action', {
                action: 'deleteField',
                value: {
                    id: id,
                    index: index
                }
            })
        }

        // Создание поля
        createField(field) {
            emit('action', { 
                action: 'createField', 
                value: field
            })
        }

        // Обновление поля
        updateField(field) {
            emit('action', { 
                action: 'updateField', 
                value: field
            })
        }

        // Инициализация редактирования полей
        initEditFields(fields = []) {
            emit('action', { 
                action: 'initEditFields', 
                value: fields
            })
        }

        // Отмена редактирования секции
        cancelSection(fields = []) {
            emit('action', {
                action: 'cancelSection',
                value: fields
            })
        }

        // Проверка валидности секции
        getSectionValidate(response) {
            emit('action', {
                action: 'getSectionValidate',
                value: response
            })
        }

        // Изменение видимости поля
        changeVisibilityField(field, index) {
            if (field.is_hidden) {
                this.list[index] = this.list[index].map(section => section.id == field.section_id ? {
                    ...section,
                    fields: section.fields.filter(f => f.id != field.id)   
                } : section) 

                emit('action', {
                    action: 'setHiddenFields',
                    value: this.hiddenFields
                })
            } else {
                this.list[index] = this.list[index].map(section => section.id == field.section_id ? {
                    ...section,
                    fields: [...section.fields, field]
                } : section) 
                emit('action', {action: 'showField', value: field})
            }
        }

        changeSortField(value) {
            emit('action', {
                action: 'changeSortField',
                value: value
            })
        }
    }

    class Drag {
        constructor() {
            this.isDragging = false
        }

        // Начало перетаскивания
        dragStart() {
            this.isDragging = true
        }

        // Конец перетаскивания
        async dragEnd() {
            this.isDragging = false
            emit('action', {
                action: 'changeOrderSection',
                value: {
                    column_1: columns.value.list.column_1.map(section => section.id),
                    column_2: columns.value.list.column_2.map(section => section.id),
                }
            })
        }

        // Создание колонки для дататрансфера
        setDragImage(event) {
            const setCopy = () => {
                this.copy = tableRef.value.cloneNode(true);
                this.copy.classList.add('section_copy')
                this.copy.id = "section_transfer";
                document.body.appendChild(this.copy);
            }

            setCopy()
            event.dataTransfer.setDragImage(this.copy, event.offsetX, event.offsetY);
        }
    }

    const columns = ref(new Columns())

    onMounted(() => {
        columns.value.get()
    })

    watch(() => props.options.modal.section, () => {
        columns.value.modal.state = props.options.modal.section.state
    })

    watch(() => props.hiddenFields, () => {
        columns.value.hiddenFields = JSON.parse(JSON.stringify(props.hiddenFields))
    })

    watch(props.columns, () => {
        columns.value.get()
    })
</script>
