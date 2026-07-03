<template>
    <AppPopup class="settings" ref="popupRef" @close="nest.close()">
        <template #header>
            <IconSave />
        </template>
        <template #content>
            <div class="settings__menu">
                <div class="settings__item popup__option settings__item_back" v-show="nest.active" @click="nest.back()">
                    {{ nest.active?.label ?? 'Назад' }}
                    <SelectArrowSubmenu /> 
                </div>

                <!-- Common -->
                <div class="settings__list" v-if="nest.active == null">
                    <div class="settings__item popup__option" @click="nest.save(null)">
                        Применить для себя
                    </div>
                    <div class="settings__item popup__option settings__item_submenu" v-if="userStore.user?.is_admin" @click="nest.set({label: 'Применить для роли', value: 'changeRole'})">
                        Применить для роли
                        <SelectArrowSubmenu />
                    </div>
                    <div class="settings__item popup__option" v-if="userStore.user?.is_admin" @click="nest.askAll()">
                        Применить для всех
                    </div>
                </div>

                
                <!-- Set Update Group -->
                <div class="settings__list settings__list_group" v-if="nest.active != null && nest.active.value == 'changeRole'">
                    <div 
                        class="settings__item popup__option" 
                        v-for="field in userStore.roles" 
                        :key="field.id"
                        @click="nest.save(field.id)"
                    >
                        {{ field.label }}
                    </div>    
                </div>
            </div>
        </template>
    </AppPopup>

    <teleport to="#menu__overlay" v-if="nest.confirmAll">
        <AppModalWarning
            :options="{
                title: 'Применить для всех?',
                desc: 'Настройки будут применены для всех пользователей портала и заменят их текущие настройки.',
                action: 'confirm',
                actionTitle: 'Применить',
                template: 'text'
            }"
            @confirm="nest.confirmSaveAll()"
            @close="nest.confirmAll = false"
        />
    </teleport>
</template>

<script setup>
    import './Save.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconSave from '@AppIcons/Actions/Save.vue'
    import SelectArrowSubmenu from '@AppIcons/Input/SelectArrowSubmenu.vue';
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()

    defineOptions({
        name: "Save"
    })

    const emit = defineEmits([
        'save'
    ])

    class Nest {
        constructor() {
            this.active = null
            this.history = []
            this.confirmAll = false
        }

        askAll() {
            this.confirmAll = true
            this.close()
        }

        confirmSaveAll() {
            this.confirmAll = false
            emit('save', 'all')
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

        close() {
            this.active = null,
            this.history = []
            // popup.popupRef после markRaw — Vue-ref, не DOM. Используем
            // публичный _close() вместо classList.remove.
            popupRef.value?.popup?._close?.()
        }

        save(role) {
            emit('save', role)
            this.close()
        }
    }

    const nest = ref(new Nest())
    const popupRef = ref(null)
</script>
