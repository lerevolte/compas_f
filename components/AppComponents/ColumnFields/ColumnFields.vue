<template>
    <div class="column-fields">
        <draggable
            v-for="(column, index) in columns.list"
            tag="div"
            group="columns"
            class="column-fields__column"
            ghost-class="draggable-ghost"
            drag-class="draggable-drag"
            v-model="columns.list[index]" 
            item-key="id" 
            fallback-class="draggable-fallback"
            :forceFallback="true"
            :fallbackOnBody="true"
            handle=".icon_drag-section"
            @start="columns.dragStart()"
            @end="columns.dragEnd()"
            >
            <template #item="{ element: section }">
                <AppTileSection 
                    class="column-fields__item column-section"
                    :section="section"
                    :options="{
                        isDisableFooter: props.options.isDisableFooter,
                        isGlobalEdit: props.options.isGlobalEdit,
                        sectionModal: props.options.modal.sections
                    }"
                    :edit="props.edit"
                    :listSection="columns.listSection"
                    :pageId="props.pageId"
                    :hiddenFields="columns.hiddenFields"
                    @update:hiddenFields="fields => columns.hiddenFields = fields"
                    @update:visibilityField="field => emit('action', {action: 'showField', value: field})"
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
                :loading="props.options.modal.columns.loading"
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
                    columns: {
                        state: false,
                        loading: false
                    },
                    sections: {
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
        }

        // Получение колонок
        get() {
            this.list = JSON.parse(JSON.stringify(props.columns))
            this.hiddenFields = JSON.parse(JSON.stringify(props.hiddenFields))
        }

        dragStart() {}

        dragEnd() {

        }

        // Инициализация удаления секции
        initDelete(section, key) {
            this.modal = {
                state: true,
                title: 'Удаление раздела',
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
        deleteField(field) {
            console.log('Удаление поля', field);
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

        getSectionValidate(response) {
            emit('action', {
                action: 'getSectionValidate',
                value: response
            })
        }
    }

    const columns = ref(new Columns())

    onMounted(() => {
        columns.value.get()
    })

    watch(() => props.options.modal.columns, () => {
        columns.value.modal = {
            ...columns.value.modal,
            state: props.options.modal.columns.state,
            loading: props.options.modal.columns.loading
        }
    })

    watch(props.columns, () => {
        columns.value.get()
    })
</script>
