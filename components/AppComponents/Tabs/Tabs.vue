<template>
    <nav class="tabs" :class="{'tabs_disabled': props.disableAll}">
        <ul class="tabs__list">
            <template  v-for="(tab, index) in tabs.list" :key="tab.id">
                <li 
                    class="tabs__item" 
                    :class="{'tabs__item_hidden': !tab.enabled, 'tabs__item_active': tab.tab == props.activeTab || (tab.tab == 'modules' && props.isModule)}"
                >
                    <AppPopup class="tabs__module" v-if="tab.childs && tab.childs.length > 0" ref="popupRef" :isPreventBottom="true">
                        <template #header>
                            <IconTriangle /> 
                            {{ tab.title }}
                        </template>
                        <template #content>
                            <div class="popup__option" v-for="child in tab.childs" @click="emit('action', { action: 'setTab', value: { tab: child.alias, is_module: true} })">
                                {{ child.title }}
                            </div> 
                        </template>
                    </AppPopup>
                    <span v-else class="text" @click="emit('action', { action: 'setTab', value: { tab: tab.tab, is_module: false} })">
                        {{ tab.title }}
                    </span>

                    <AppPopup ref="popupRef" class="tab_settings" :isPreventBottom="true">
                        <template #header>
                            <IconActionsSettings />
                        </template>
                        <template #content>
                            <div 
                                class="popup__option" 
                                v-for="action in tabs.actions"
                                @click="() => {
                                    tabs[action.action](tab)
                                    popupRef[index].popup.popupRef.classList.remove('popup_open');
                                }"
                            >
                                {{ action.name }}
                            </div>
                        </template>
                    </AppPopup>
                </li>
            </template>
        </ul>

        <div class="tabs__actions">
            <AppSave 
                v-show="tabs.isChanged" 
                @save="(role) => tabs.saveSettings(role)"
            />
            <AppSettings 
                v-model:list="tabs.list"
                :options="{
                    isCheck: {
                        state: true,
                        name: 'Отображение'
                    },
                    isDrag: {
                        state: true,
                        name: 'Порядок'
                    },
                    isHaveDefault: true
                }"
                @reset="tabs.reset()"
                @isChanged="tabs.isChanged = true"
                @update:modelValue="(val) => {tabs.list = val; tabs.isChanged = true}"
            />
        </div>

        <teleport to="#menu__overlay" v-if="tabs.modal.state">
            <AppModalWarning 
                :options="{
                    title: tabs.modal.title,
                    action: tabs.modal.action,
                    actionTitle: tabs.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="tabs.modal.loading"
                @update="tabs.update()"
                @close="tabs.modal.state = false"
            >
            <div class="modal__fields" v-if="tabs.modal.action == 'update'">
                <AppBlank 
                    :item="{
                        title: 'Раздел',
                        text: tabs.modal.content.title
                    }"
                />
                <AppCheckbox 
                    v-model="tabs.modal.content.has_roles_read"
                    :options="{
                        title: 'Ограничить видимость раздела',
                    }"
                />
                <AppSelect 
                    v-show="tabs.modal.content.has_roles_read"
                    v-model="tabs.modal.content.roles_read"
                    :isPreventBottom="true"
                    :options="{
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
    </nav>
</template>

<script setup>
    import './Tabs.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconActionsSettings from '@AppIcons/Actions/Settings.vue';
    import AppSettings from '@AppComponents/Settings/Settings.vue'
    import AppSave from '@AppComponents/Save/Save.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'

    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()

    const popupRef = ref(null)

    const props = defineProps({
        tabs: {
            default: [],
            type: Object
        },
        activeTab: {
            default: null
        },
        isModule: {
            default: false
        },
        options: {
            default: {
                modal: {
                    state: false,
                    loading: false
                },
                isHaveHistory: true
            },
            type: Object
        },
        disableAll: {
            default: false,
            type: Boolean
        }
    })

    const emit = defineEmits([
        'action'
    ])

    class Tabs {
        constructor() {
            this.list = []
            this.isChanged = false
            this.actions = [
                {
                    name: 'Настроить',
                    action: 'initEdit'
                },
                {
                    name: 'Скрыть',
                    action: 'hide'
                }
            ]
            this.modal = {
                state: false,
                title: 'Настройки раздела',
                actionTitle: 'Сохранить',
                action: 'update',
                content: {
                    title: '',
                    has_roles_read: false,
                    roles_read: []
                },
            }
        }

        // Вернуть настройки по умолчанию
        reset() {
            emit('action', { action: 'resetTabs', value: null })
        }

        // Настройки таба
        initEdit(tab) {
            this.modal = {
                state: true,
                title: 'Настройки раздела',
                actionTitle: 'Сохранить',
                action: 'update',
                content: tab,
            }
        }

        update() {
            this.modal.content = {
                ...this.modal.content,
                roles_read: this.modal.content.has_roles_read ? this.modal.content.roles_read : [],
                has_roles_read: this.modal.content.roles_read.length > 0 ? this.modal.content.has_roles_read : false
            }

            emit('action', { 
                action: 'updateSettings', 
                value: this.modal.content
            })
        }

        // Скрыть таб
        hide(tab) {
            tab.enabled = false
            this.isChanged = true
        }

        // Сохранение
        saveSettings(role) {
            this.isChanged = false
            emit('action', { action: 'updateTabs', value: { list: this.list, role: role } })
        }
    }

    const tabs = ref(new Tabs())

    onMounted(() => {
        tabs.value.list = JSON.parse(JSON.stringify(props.tabs))
    })

    watch(() => props.tabs, () => {
        tabs.value.list = JSON.parse(JSON.stringify(props.tabs))
    })

    watch(() => props.options.modal, () => {
        tabs.value.modal = {
            ...tabs.value.modal,
            state: props.options.modal.state,
            loading: props.options.modal.loading
        }
    })
</script>
