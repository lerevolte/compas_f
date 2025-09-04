import { defineStore } from 'pinia'
import api from '@/helpers/api.js'
import routes from '@/helpers/routes.js'

export const useUserStore = defineStore('userStore', {
    // states
    state: () =>  {
        return {
            token: "0vNsh0NrXyQjo75HSNzZJIkZYn6ss1dCh8BXx9boBBQVSDaeu1UgbZYPoZcA",
            loading: false,
            user: null,
            roles: []
        }
    },

    persist: true,

    actions: {
        async getRoles() {
            try {
                console.log(this.token);
                let response = await api.callMethod('GET', routes.user.roles)
                this.roles = response.data
            } catch (error) {
                console.log('get_menu', error)
            }
        }
    }
})