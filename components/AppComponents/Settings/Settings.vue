<template>
    <AppPopup class="settings" :class="{'settings_dragging': settings.nest.isDragging}" :isContentBottom="props.options.isContentBottom" ref="popupRef" @close="settings.nest.close()" :ignore-selectors="['#menu__overlay']">
        <template #header>
            <IconSettings />
        </template>
        <template #content>
            <div class="settings__menu">
                <div class="settings__item popup__option settings__item_back" v-show="settings.nest.active" @click="settings.nest.back()">
                    {{ settings.nest.active?.label ?? 'Назад' }}
                    <SelectArrowSubmenu /> 
                </div>

                <!-- Common -->
                <div class="settings__list" v-if="settings.nest.active == null">
                    <div class="settings__item settings__item_submenu popup__option" v-for="item in settings.nest.list" @click="settings.nest.set(item)" :key="item.value">
                        {{ item.label ?? item.title }}
                        <SelectArrowSubmenu />
                    </div>
                </div>

                <!-- Enable -->
                <div class="settings__list" v-else-if="settings.nest.active.value == 'isCheck'">
                    <div 
                        class="settings__item popup__option popup__option_checkbox" 
                        v-for="field in templateListCheck" 
                        :key="field.id"
                    >
                        <AppCheckbox 
                            v-model="field.enabled"
                            :options="{
                                title: field.name ?? field.title
                            }"
                            @update:modelValue="() => {
                                if (isInitGroup) {
                                    // Update group children immediately
                                    const enabledItems = settings.nest.templateField.list.filter(p => p.enabled)
                                    let findedLink = visible.find(item => item.id == settings.nest.templateField.id) ?? hidden.find(item => item.id == settings.nest.templateField.id)
                                    if (findedLink) {
                                        findedLink.children = JSON.parse(JSON.stringify(enabledItems))
                                        emit('update:modelList', [...visible, ...hidden])
                                    }
                                } else {
                                    emit('enableField', field)
                                }
                                emit('isChanged', true)
                            }"
                        />
                    </div>
                </div>

                <!-- Fixed -->
                <div class="settings__list" v-else-if="settings.nest.active.value == 'isFixed'">
                    <div class="settings__item popup__option popup__option_checkbox" v-for="field in isInitGroup ? settings.nest.templateField.list : list" :key="field.id">
                        <AppCheckbox 
                            v-model="field.fixed"
                            :options="{
                                title: field.name ?? field.title
                            }"
                             @update:modelValue="emit('isChanged', true)"
                        />
                    </div>
                </div>

                <!-- Drag -->
                <div class="settings__list settings__list_drag"  v-else-if="settings.nest.active.value == 'isDrag'">
                    <draggable
                        tag="div"
                        group="settings"
                        class="settings__list settings__list_drag"
                        ghost-class="draggable-ghost"
                        drag-class="draggable-drag"
                        v-model="dragList"
                        item-key="id" 
                        fallback-class="draggable-fallback"
                        :forceFallback="true"
                        :fallbackOnBody="true"
                        handle=".icon_drag"
                        @start="event => settings.nest.dragStart(event)"
                        @end="event => settings.nest.dragEnd(event)"
                    >
                        <template #item="{ element: field }">
                            <div class="settings__item popup__option" :class="{'popup__option_hide': !field.enabled}">
                                <IconDrag />
                                {{ field.name ?? field.title }}
                            </div>
                        </template>
                    </draggable> 
                    <div class="menu__item-hide"
                        v-if="props.options.isHaveHidden && !isInitGroup">
                        <span class="menu__item-subtitle"> Скрытые </span>
                    </div>
                    <draggable
                        v-if="props.options.isHaveHidden && !isInitGroup"
                        tag="div"
                        group="settings"
                        class="settings__list settings__list_drag"
                        ghost-class="draggable-ghost"
                        drag-class="draggable-drag"
                        v-model="hidden" 
                        item-key="id" 
                        fallback-class="draggable-fallback"
                        :forceFallback="true"
                        :fallbackOnBody="true"
                        handle=".icon_drag"
                        @start="settings.nest.dragStart()"
                        @end="settings.nest.dragEnd()"
                    >
                        <template #item="{ element: field }">
                            <div class="settings__item popup__option">
                                <IconDrag />
                                {{ field.name }}
                            </div>
                        </template>
                    </draggable> 
                </div>

                <!-- Groups -->
                <div class="settings__list settings__list_group" v-else-if="settings.nest.active.value == 'isNest'">
                    <div class="settings__item popup__option settings__item_submenu" @click="settings.nest.initCreate()">
                        Создать новую
                        <SelectArrowSubmenu />
                    </div>
                    <div class="settings__item popup__option settings__item_submenu" @click="settings.nest.set({label: 'Редактировать существующую', value: 'updateGroup'})">
                        Редактировать существующую
                        <SelectArrowSubmenu />
                    </div>
                </div>





                <!-- Set Update Group -->
                <div class="settings__list settings__list_group" v-if="settings.nest.active != null && settings.nest.active.value == 'updateGroup'">
                    <div 
                        class="settings__item popup__option settings__item_submenu" 
                        v-for="field in props.list.filter(p => p.children.length > 0)" 
                        :key="field.id"
                        @click="settings.nest.initUpdate(field)"
                    >
                        {{ field.name }}
                        <SelectArrowSubmenu />
                    </div>    

                    <div class="settings__item popup__option popup__option_disable" v-show="props.list.filter(p => p.children.length > 0).length == 0">
                        Групп нет
                    </div>
                </div>




                <!-- Update Group -->
                <div class="settings__list settings__list_group" v-if="settings.nest.active != null && settings.nest.active.value == 'initGroup'">
                    <div class="settings__item popup__option" @click="settings.nest.initName(settings.nest.templateField.name)">
                        Название: {{ settings.nest.templateField.name }}
                    </div>
                    <div class="settings__item popup__option settings__item_submenu" @click="settings.nest.set({label: 'Сущности', value: 'isCheck'})">
                        Сущности
                        <SelectArrowSubmenu />
                    </div>
                    <div class="settings__item popup__option settings__item_submenu" v-show="settings.nest.templateField.list.filter(p => p.enabled).length > 0" @click="settings.nest.set({label: 'Порядок', value: 'isDrag'})">
                        Порядок
                        <SelectArrowSubmenu />
                    </div>
                    <div 
                        v-show="settings.nest.templateField.list.filter(p => p.enabled).length > 0 || settings.nest.templateField.name != ''" 
                        class="settings__item popup__option popup__option_blue" 
                        @click="settings.nest.save()"
                    >
                        Сохранить
                    </div>
                    <div class="settings__item popup__option popup__option_red" v-show="settings.nest.statusTemplate == 'update'" @click="settings.nest.initDelete()">
                        Удалить
                    </div>
                 </div>

                <div class="popup__option" v-if="settings.nest.active == null && props.options.isHaveDefault" @click="settings.reset">
                    Вернуть значения по умолчанию
                </div>
            </div>
        </template>
    </AppPopup>
    <teleport to="#menu__overlay" v-if="settings.nest.modal.state && settings.nest.modal.type == 'create'">
        <AppModalWarning 
            :options="{
                title: 'Название группы',
                action: 'submit',
                actionTitle: 'Ввести',
                template: 'slot'
            }"
            @submit="settings.nest.saveName()"
            @close="settings.nest.modal.state = false"
        >
            <AppInput v-model="settings.nest.modal.name" />
        </AppModalWarning>
    </teleport>
    <teleport to="#menu__overlay" v-if="settings.nest.modal.state && settings.nest.modal.type == 'delete'">
        <AppModalWarning 
            :options="{
                title: 'Удаление',
                action: 'delete',
                actionTitle: 'Удалить',
                template: 'slot'
            }"
            @delete="settings.nest.delete()"
            @close="settings.nest.modal.state = false"
        >
            <p class="warning__text">
                Вы дейставительно хотите удалить данную группу?
            </p>
        </AppModalWarning>
    </teleport>
</template>

<script setup>
    import './Settings.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconSettings from '@AppIcons/Actions/Settings.vue'
    import SelectArrowSubmenu from '@AppIcons/Input/SelectArrowSubmenu.vue';
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import draggable from 'vuedraggable';
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'

    defineOptions({
        name: "Settings"
    })

    const props = defineProps({
        list: null,
        visible: null,
        hidden: null,
        options: {
            default: {
                isCheck: {
                    state: false,
                    name: 'Отображение'
                },
                isDrag: {
                    state: false,
                    name: 'Порядок'
                },
                isNest: {
                    state: false,
                    name: 'Группы'
                },
                isHaveHidden: true,
                isHaveDefault: false
            },
            type: Object
        }
    })

    const emit = defineEmits([
        'update:modelValue',
        'update:modelList',
        'update:modelVisible',
        'update:modelHidden',
        'reset',
        'dragEvent',
        'enableField',
        'isChanged'
    ])

    const disabledFields = computed({
        get: () => props.list.reduce((acc, el) => [...acc, {...el, enabled: false}], [])
    })

    class Settings {
        constructor() {
            this.nest = new Nest()
            
        }

        // Вернуть настройки по умолчанию
        reset() {
            popupRef.value.popup.popupRef.classList.remove('popup_open');
            emit('reset', true)
        }
    }

    class Nest {
        constructor() {
            this.isDragging = false
            this.active = null
            this.history = []
            this.list = []
            this.modal = {
                state: false,
                type: 'create',
                name: ''
            }
            this.statusTemplate = null
            this.templateField = {
                name: '',
                list: disabledFields.value
            }

            if (props.options.isCheck && props.options.isCheck.state) {
                this.list.push({
                    label: props.options.isCheck.name ?? 'Отображение',
                    value: 'isCheck'
                })
            }

            if (props.options.isDrag && props.options.isDrag.state) {
                this.list.push({
                    label: props.options.isDrag.name ?? 'Порядок',
                    value: 'isDrag'
                })
            }

            if (props.options.isNest && props.options.isNest.state) {
                this.list.push({
                    label: props.options.isNest.name ?? 'Группы',
                    value: 'isNest'
                })
            }
            if (props.options.isFixed && props.options.isFixed.state) {
                this.list.push({
                    label: props.options.isFixed.name ?? 'Группы',
                    value: 'isFixed'
                })
            }
        }

        // Установка активной вкладки
        set(tab) {
            if (this.active) {
                this.history.push(this.active)
            }

            this.active = tab
        }

        // Возврат обратно
        back() {
            this.active = this.history.pop()
        }

        // Закрытие попапа
        close() {
            this.active = null,
            this.history = []
        }

        // Открытие модального окна для ввода названия
        initName(name) {
            this.modal = {
                state: true,
                type: 'create',
                name: name
            }
        }

        // Сохранение имени
        saveName() {
            this.modal.state = false
            this.templateField.name = this.modal.name
        }

        // Инициализация создания
        initCreate() {
            this.set({label: 'Создать новую', value: 'initGroup'})
            this.templateField = {
                id: new Date().getTime(),
                name: '',
                list: disabledFields.value
            }
            this.statusTemplate = 'create'
            disabledFields.value.forEach(item => item.enabled = false)
        }

        // Инициализация обновления
        initUpdate(field) {
            this.set({label: field.name, value: 'initGroup'})
            this.statusTemplate = 'update'

            // Сохраняем порядок enabled-сущностей из field.children (так как было сохранено),
            // а disabled — добавляем после в общем порядке props.list.
            const childIds = (field.children || []).map(c => c.id)
            const enabledItems = (field.children || [])
                .filter(c => c.enabled)
                .map(c => {
                    const base = props.list.find(p => p.id == c.id) || c
                    return {...base, enabled: true}
                })
            const disabledItems = props.list
                .filter(p => !childIds.includes(p.id) || !(field.children || []).find(c => c.id == p.id && c.enabled))
                .map(p => ({...p, enabled: false}))

            this.templateField = {
                id: field.id,
                name: field.name,
                list: [...enabledItems, ...disabledItems]
            }
        }

        // Сохранение группы
        async save() {
            this.templateField.list = this.templateField.list.filter(item => item.enabled)
            closePopup()

            if (this.statusTemplate == 'create') {
                visible.value.push({
                    id: this.templateField.id,
                    name: this.templateField.name,
                    enabled: 1,
                    is_group: 1,
                    is_hidden: 0,
                    children: JSON.parse(JSON.stringify(this.templateField.list))
                })
            } else if (this.statusTemplate == 'update') {
                let findedLink = visible.value.find(item => item.id == this.templateField.id) ?? hidden.value.find(item => item.id == this.templateField.id)
                findedLink.name = this.templateField.name
                findedLink.children = JSON.parse(JSON.stringify(this.templateField.list))
            }

            for (let field of this.templateField.list) {
                field.enabled = false
            }

            this.statusTemplate = null
            await nextTick();
            emit('update:modelList', [...visible.value, ...hidden.value])
        }

        // Инициализация удаления
        initDelete() {
            this.modal.state = true
            this.modal.type = 'delete'
        }

        // Удаление группы
        async delete() {
            this.modal.state = false
            visible.value = visible.value.filter(item => item.id != this.templateField.id)
            hidden.value = hidden.value.filter(item => item.id != this.templateField.id)

            this.templateField.name = ''
            for (let field of this.templateField.list) {
                field.enabled = false
            }
            closePopup()
            await nextTick();
            emit('update:modelList', [...visible.value, ...hidden.value])
        }

        // Начало перетаскивания
        dragStart() {
            this.isDragging = true
            emit('dragEvent', true)
        }

        // Конец перетаскивания
        dragEnd(event) {
            this.isDragging = false
            emit('isChanged', true); 
            emit('dragEvent', false)

            if (isInitGroup.value) {
                const enabledItems = this.templateField.list.filter(p => p.enabled)
                let findedLink = visible.value.find(item => item.id == this.templateField.id) ?? hidden.value.find(item => item.id == this.templateField.id)
                if (findedLink) {
                    findedLink.children = JSON.parse(JSON.stringify(enabledItems))
                    emit('update:modelList', [...visible.value, ...hidden.value])
                }
            }
        }
    }

    const settings = ref(new Settings())
    const popupRef = ref(null)

    const closePopup = () => {
        popupRef.value.popup.popupRef.classList.remove('popup_open');
        settings.value.nest.close()
    }

    const list = computed({
        get: () => props.list,
        set: (val) => emit('update:modelList', val)
    })

    const visible = computed({
        get: () => props.visible,
        set: (val) => emit('update:modelVisible', val)
    })

    const hidden = computed({
        get: () => props.hidden,
        set: (val) => emit('update:modelHidden', val)
    })

    const isInitGroup = computed(() => {
        return settings.value.nest.history && settings.value.nest.history.find(p => p.value == 'initGroup')
    })

    const dragList = computed({
        get: () => {
            if (isInitGroup.value) {
                return settings.value.nest.templateField.list.filter(p => p.enabled)
            }
            // Если visible/hidden не передан (как в Tabs) — берём общий list.
            return props.options.isHaveHidden ? visible.value : list.value
        },
        set: (val) => {
            if (isInitGroup.value) {
                // Update order in templateField.list for enabled items
                const enabledIds = val.map(v => v.id)
                const disabled = settings.value.nest.templateField.list.filter(p => !p.enabled)
                settings.value.nest.templateField.list = [...val, ...disabled]
            } else if (props.options.isHaveHidden) {
                visible.value = val
            } else {
                list.value = val
            }
        }
    })

    const templateListCheck = computed({
        get: () => {
            if (isInitGroup.value) {
                return settings.value.nest.templateField.list
            } else if (props.options.isHaveHidden) {
                return [...visible.value, ...hidden.value].filter(p => !p.is_group)
            } else {
                return list.value
            }
        },
        set: (val) => {
            if (props.options.isHaveHidden) {
                isInitGroup.value ? settings.value.nest.templateField.list = val : emit('update:modelVisible', val)
            } else {
                emit('update:modelValue', val)
            }
        }
    })
</script>
