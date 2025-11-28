<template>
    <div class="column-fields" :class="{'column-fields_dragging': columns.dragger.isDragging}">
        <!-- modal: props.options.modal.field
        :edit="props.edit" -->

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
            <template #item="{ element: item }">
                <AppTileSection 
                    class="column-fields__item column-section"
                    :section="item"
                    :options="{
                        isDisableFooter: props.options.isDisableFooter,
                        isGlobalEdit: props.options.isGlobalEdit,
                    }"
                    :sectionClass="section"
                    :listSection="columns.listSection"
                    :pageId="props.pageId"
                    :hidden="section.hidden"
                    @update:hidden="fields => section.hidden = fields"
                    @actionSection="item => section[item.action](item.value, index, props.slug, columns.list)"
                    @actionField="action => field[action.action]({
                        field: action.value,
                        section: item,
                        hidden: section.hidden,
                        column_id: index,
                        slug: props.slug,
                        columns: columns.list
                    })"
                    @action="action => columns[action.action](action.value, index, item)"
                />
            </template>
            <template #footer>
                <AppButon class="button_text column-fields__button" @click="section.initCreate(index)" v-if="!props.options.isDisableFooter">
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

        <teleport to="#menu__overlay" v-if="section.modal.state">
            <AppModalWarning 
                :options="{
                    title: section.modal.title,
                    action: section.modal.action,
                    actionTitle: section.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="section.modal.loading"
                @delete="section.delete(columns.list)"
                @create="section.create(columns.list, props.slug)"
                @close="section.modal.state = false"
            >
            <template v-if="section.modal.action == 'delete'">
                <p class="warning__text">
                    {{ section.modal.text }}
                </p>
            </template>
            <template v-else-if="section.modal.action == 'create'">
                <AppInput 
                    v-model="section.modal.content.name"
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
        <teleport to="#menu__overlay" v-if="field.modal.state">
            <FieldModal 
                :modal="field.modal"
                :listSection="columns.listSection"
                @actionField="action => field[action.action]({
                    columns: columns.list,
                    field: action.value,
                    slug: props.slug
                })"
            />
        </teleport>
    </div>
</template>

<script setup>
    import './ColumnFields.scss';
    
    import draggable from 'vuedraggable';
    import { Section, Field } from '@AppHelpers/classes.js'
    import AppButon from '@AppComponents/Button/Button.vue';
    import AppHistory from '@AppComponents/History/History.vue';
    import FieldModal from '@AppComponents/GroupField/Modal/Modal.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppTileSection from '@AppComponents/TileSection/TileSection.vue';

    import AppInput from '@AppComponents/Inputs/Input/Input.vue';

    const props = defineProps({
        slug: {
            default: null,
            type: [String, Object]
        },
        columns: {
            default: {
                column_1: [],
                column_2: []
            },
            type: Object
        },
        hidden: {
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
                isModule: false,
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
            this.section = new Section()
            this.dragger = new Drag()
        }

        // Получение колонок
        get() {
            console.log('asd');
            
            this.list = JSON.parse(JSON.stringify(props.columns))
            section.value.hidden = props.hidden 
        }

        changeOrder(fields, column_id, section) {
            console.log(section);
            this.list[column_id].find(item => item.id == section.id).fields = fields
        }










        // Открытие модалки
        openModal(item) {
            emit('openModal', item)
        }

        // Создание сущности
        createEntity(item) {
            emit('createEntity', item)
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
    }

    // Драггер для секций
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
            section.value.changeOrder({
                column_1: columns.value.list.column_1.map(section => section.id),
                column_2: columns.value.list.column_2.map(section => section.id),
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
    const section = ref(new Section())
    const field = ref(new Field())
    
    onMounted(() => {
        console.log('asdasd');
        
        columns.value.get()
    })

    // watch(props.columns, () => {
    //     columns.value.get()
    // })
</script>
