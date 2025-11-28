import { defineStore } from 'pinia'
import api from '@/helpers/api.js'
import routes from '@/helpers/routes.js'

export const useMenuStore = defineStore('menuStore', {
    // states
    state: () =>  {
        return {
            list: []
        }
    },

    // Явно включаем персист в localStorage на клиенте
    persist: {
        key: 'menuStore',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['list']
    },

    actions: {
        // Получение меню
        async get() {
            try {
                let response = await api.callMethod('GET', routes.menu.get)
                this.list = response.data
            } catch (error) {
                console.log('get_menu', error)
            }
        },

        // Восстановление меню по умолчанию
        async reset() {
            try {
                let response = await api.callMethod('GET', routes.menu.reset)
                this.list = response.data
            } catch (error) {
                console.log('reset_menu', error)
            }
        },

        // Сохранение меню
        async save(role, list) {
            try {
                await api.callMethod('POST', role ? `${routes.menu.update}/${role}` : routes.menu.update, {menu: list})
            } catch (error) {
                console.log('save_menu', error)
            }
        }
    }
})