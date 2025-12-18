<template>
    <nav class="tabs" :class="{'tabs_disabled': props.disableAll || props.options.isExternal}">
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
                            <div 
                                class="popup__option" 
                                v-for="child in tab.childs" 
                                @click="(e) => {
                                    e.target?.closest('.popup')?.classList.remove('popup_open')
                                    emit('action', { action: 'set', value: { tab: {...child, tab: child.alias}, is_module: true} })
                                }">
                                {{ child.title }}
                            </div> 
                        </template>
                    </AppPopup>
                    <span v-else class="text" @click="emit('action', { action: 'set', value: { tab: tab, is_module: false} })">
                        {{ tab.title }}
                    </span>

                    <AppPopup ref="popupRef" class="tab_settings" :isPreventBottom="true" v-if="!props.options.isExternal">
                        <template #header>
                            <IconActionsSettings />
                        </template>
                        <template #content>
                            <div 
                                class="popup__option" 
                                v-for="action in tabs.actions"
                                @click="(e) => {
                                    e.target?.closest('.popup')?.classList.remove('popup_open')
                                    tabs[action.action](tab)
                                }"
                            >
                                {{ action.name }}
                            </div> 
                        </template>
                    </AppPopup>
                </li>
            </template>
        </ul>

        <div class="tabs__actions" v-if="!props.options.isExternal">
            <AppSave 
                v-show="tabs.isChanged" 
                @save="(role) => tabs.save(role)"
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
    
    import api from '@/helpers/api.js'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconActionsSettings from '@AppIcons/Actions/Settings.vue';
    import AppSettings from '@AppComponents/Settings/Settings.vue'
    import AppSave from '@AppComponents/Save/Save.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'
    import routes from '@/helpers/routes.js'

    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()

    const popupRef = ref(null)

    const props = defineProps({
        slug: {
            default: '',
            type: String
        },
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
                    action: 'initUpdate'
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
        async reset() {
            try {
                const response = await api.callMethod('GET', routes.tabs.reset.replace('${slug}', props.slug))
                this.list = response.data  
                this.isChanged = true
            } catch (error) {
                console.log(error);
            } 
        }

        // Настройки таба
        initUpdate(tab) {
            this.modal = {
                state: true,
                title: 'Настройки раздела',
                actionTitle: 'Сохранить',
                action: 'update',
                content: tab,
            }
        }

        // Обновление настроек
        async update() {
            try {
                this.modal.content = {
                    ...this.modal.content,
                    roles_read: this.modal.content.has_roles_read ? this.modal.content.roles_read : [],
                    has_roles_read: this.modal.content.roles_read.length > 0 ? this.modal.content.has_roles_read : false
                }
                this.modal.loading = true

                const route = routes.tabs.settings.replace('${slug}', props.slug)
                await api.callMethod('PUT', route, {menu: this.list.map(item => item.tab == this.modal.content.tab ? {...item, ...this.modal.content} : item)})
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.loading = false
                this.modal.state = false
                this.modal.content = {}
            }
        }

        // Скрыть таб
        hide(tab) {
            tab.enabled = false
            this.isChanged = true
        }

        // Сохранение
        async save(role) {
            this.isChanged = false
            const route = routes.tabs.update.replace('${slug}', props.slug)
            await api.callMethod('PUT', role ? `${route}${role == 'all' ? '/all' : '/role/' + role}` : route, {menu: this.list})
        }
    }

    const tabs = ref(new Tabs())

    onMounted(() => {
        tabs.value.list = JSON.parse(JSON.stringify(props.tabs))
    })

    watch(() => props.tabs, () => {
        tabs.value.list = JSON.parse(JSON.stringify(props.tabs))
    })
</script>
