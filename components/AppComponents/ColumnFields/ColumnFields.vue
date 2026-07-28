<template>
    <div class="column-fields" :class="{'column-fields_dragging': columns.dragger.isDragging}">
        <draggable
            v-for="(column, index) in columns.list"
            tag="div"
            :group="`columns_${props.slug}_${props.pageId}`"
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
                        isModule: props.options.isModule,
                        isDisableFooter: props.options.isDisableFooter,
                        isGlobalEdit: props.options.isGlobalEdit,
                        isExternal: props.options.isExternal,
                    }"
                    :tabs="props.tabs"
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
                <AppButon class="button_text column-fields__button" @click="section.initCreate(index)" v-if="!props.options.isDisableFooter && !props.options.isGlobalEdit && !props.options?.isModule && userStore.user?.is_admin">
                    Создать раздел 
                </AppButon>
                <AppHistory
                    v-if="props.options.isHaveHistory && index == 'column_2' && props.eventsVisibility?.visible !== false"
                    :title="'События'"
                    :history="props.history.fields"
                    :loading="props.history.loading"
                    @openModal="item => emit('openModal', item)"
                    @showMoreHistory="page => emit('showMoreHistory', page)"
                >
                    <template #actions v-if="userStore.user?.is_admin && !props.options.isExternal && props.slug">
                        <span class="icon-action" @click="initEventsModal()">
                            <IconActionsSettings />
                        </span>
                    </template>
                </AppHistory>
            </template>
        </draggable> 

        <teleport to="#menu__overlay" v-if="section.modal.state">
            <AppModalWarning 
                v-if="section.modal.type == 'warning'"
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

            <AppModalWarning 
                v-else-if="section.modal.type == 'validate'"
                class="validate-modal"
                :options="{
                    title: section.modal.title,
                    action: section.modal.action,
                    actionTitle: section.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="section.modal.loading"
                @save="section.save(null, columns.list, props.pageId, props.slug, emit, props.options)"
                @close="section.modal.state = false"
            >
                <ModalValidate 
                    :id="props.pageId"
                    :sectionClass="section"
                    :section="section.modal.content"
                />
            </AppModalWarning>
        </teleport>
        <teleport to="#menu__overlay" v-if="eventsModal.state">
            <AppModalWarning
                :options="{
                    title: 'Настройки раздела',
                    action: 'update',
                    actionTitle: 'Сохранить',
                    template: 'slot'
                }"
                :loading="eventsModal.loading"
                @update="saveEventsVisibility()"
                @close="eventsModal.state = false"
            >
                <div class="modal__fields">
                    <AppBlank
                        :item="{
                            title: 'Раздел',
                            text: 'События'
                        }"
                    />
                    <AppCheckbox
                        v-model="eventsModal.content.has_roles_read"
                        :options="{
                            title: 'Ограничить видимость раздела',
                        }"
                    />
                    <AppSelect
                        v-show="eventsModal.content.has_roles_read"
                        v-model="eventsModal.content.roles_read"
                        :isPreventBottom="true"
                        :options="{
                            id: 'events_roles_read',
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
        <teleport to="#menu__overlay" v-if="field.modal.state">
            <FieldModal 
                :columns="columns.list"
                :modal="field.modal"
                :hidden="section.hidden"
                :listSection="columns.listSection"
                @actionField="action => field[action.action]({
                    columns: columns.list,
                    emit: emit,
                    field: action.value,
                    slug: props.slug
                })"
            />
        </teleport>

        <div class="detail__actions">
            <MassAction 
                :isChoosed="section.buffer.backup.length > 0"
                :actions="{
                    save: section.buffer.backup.length > 0,
                    edit: false,
                    cancel: true,
                    delete: false
                }"
                :loading="section.buffer.loading"
                @action="action => section[action.action](action.value, columns.list, pageId, props.slug, emit, options)"
            />
        </div>
    </div>
</template>

<script setup>
    import './ColumnFields.scss';

    import draggable from 'vuedraggable';
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Section, Field } from '@AppHelpers/classes.js'
    import AppButon from '@AppComponents/Button/Button.vue';
    import AppHistory from '@AppComponents/History/History.vue';
    import FieldModal from '@AppComponents/TileSection/Modal/Modal.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppTileSection from '@AppComponents/TileSection/TileSection.vue';
    import MassAction from '@AppComponents/MassAction/MassAction.vue'
    import ModalValidate from './Validate/Validate.vue'
    import IconActionsSettings from '@AppIcons/Actions/Settings.vue';
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'

    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import { useUserStore } from '@/stores/userStore.js'

    const userStore = useUserStore()

    const props = defineProps({
        slug: {
            default: null,
            type: [String, Object]
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
        eventsVisibility: {
            default: () => ({
                visible: true,
                has_roles_read: false,
                roles_read: []
            }),
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
        },
        headerName: {
            default: '',
            type: String
        }
    })

    const emit = defineEmits([
        'showMoreHistory',
        'openModal',
        'closeDetail',
        'createEntity',
        'action'
    ])

    class Columns {
        constructor() {
            this.list = {
                column_1: [],
                column_2: []
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
            this.list = props.columns
            section.value.hidden = props.hidden 
        }

        // Открытие модалки
        openModal(item) {
            emit('openModal', item)
        }

        // Создание сущности
        createEntity(item) {
            emit('createEntity', item)
        }

        closeDetail() {
            emit('closeDetail', true)
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
    const section = ref(new Section(props.slug))
    const field = ref(new Field())

    const eventsModal = ref({
        state: false,
        loading: false,
        content: {
            has_roles_read: false,
            roles_read: []
        }
    })

    const initEventsModal = () => {
        eventsModal.value.content = {
            has_roles_read: !!props.eventsVisibility?.has_roles_read,
            roles_read: [...(props.eventsVisibility?.roles_read ?? [])]
        }
        eventsModal.value.state = true
    }

    const saveEventsVisibility = async () => {
        try {
            eventsModal.value.loading = true
            const content = eventsModal.value.content
            const roles = content.has_roles_read ? content.roles_read : []
            await api.callMethod('PUT', routes.tabs.events_visibility.replace('${slug}', props.slug), {
                has_roles_read: content.has_roles_read && roles.length > 0,
                roles_read: roles
            })
        } catch (error) {
            console.log(error);
        } finally {
            eventsModal.value.loading = false
            eventsModal.value.state = false
        }
    }

    onMounted(() => {
        columns.value.get()
    })

    onBeforeUnmount(() => {
        // При скрытии вкладки (v-if) ColumnFields уничтожается и section.buffer
        // пропадает. Без этого поля остаются с edit=true, но панель сохранения
        // исчезает (новый section после ремаунта не знает о старых правках).
        // Отменяем редактирование, чтобы после возврата на вкладку всё было чисто.
        // ВАЖНО: передаём isGlobalEdit:false — иначе при ремаунте деталки после
        // СОЗДАНИЯ объекта (savePage → updateComponent++ → detail.get() ставит
        // loading=true и размонтирует этот блок) cancel эмитил бы closeDetail и
        // деталка закрывалась. Нужно оставаться в деталке после создания (8570).
        // Явная «Отмена» в режиме создания закрывает деталку отдельно — через
        // MassAction, который передаёт настоящие props.options.
        section.value.cancel(null, columns.value.list, props.pageId, props.slug, emit, { ...props.options, isGlobalEdit: false })
    })

    watch(() => props.columns, () => {
        columns.value.get()
    })

    watch(() => props.options.isGlobalEdit, (next, prev) => {
        if (next) {
            section.value.editAllSections()
        }
    }, {immediate: true})
</script>
