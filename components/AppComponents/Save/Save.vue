<template>
    <AppPopup class="settings" ref="popupRef" @close="nest.close()">
        <template #header>
            <IconSave />
        </template>
        <template #content>
            <div class="settings__menu">
                <div class="settings__item popup__option settings__item_back" v-show="nest.active" @click="nest.back()">
                    {{ nest.active?.label ?? 'Назад' }}
                    <IconSelectArrow /> 
                </div>

                <!-- Common -->
                <div class="settings__list" v-if="nest.active == null">
                    <div class="settings__item popup__option" @click="nest.save(null)">
                        Применить для себя
                    </div>
                    <div class="settings__item popup__option settings__item_submenu" @click="nest.set({label: 'Применить для роли', value: 'changeRole'})">
                        Применить для роли
                        <IconSelectArrow />
                    </div>
                    <div class="settings__item popup__option" @click="nest.save('all')">
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
</template>

<script setup>
    import './Save.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconSave from '@AppIcons/Actions/Save.vue'
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';

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
            popupRef.value.popup.popupRef.classList.remove('popup_open');
        }

        save(role) {
            emit('save', role)
            this.close()
        }
    }

    const nest = ref(new Nest())
    const popupRef = ref(null)
</script>
