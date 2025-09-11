import { defineStore } from 'pinia'
import api from '@/helpers/api.js'
import routes from '@/helpers/routes.js'

export const useUserStore = defineStore('userStore', {
    // states
    state: () =>  {
        return {
            token: 'asdasdasdasdasdas',
            loading: false,
            balance: 0,
            domain: null,
            user: null,
            roles: []
        }
    },

    persist: true,

    actions: {
        async getRoles() {
            try {
                let response = await api.callMethod('GET', routes.user.roles)
                this.roles = response.data
            } catch (error) {
                console.log('get_menu', error)
            }
        },

        async get() {
            try {
                let response = await api.callMethod('GET', routes.user.me)
                this.user = response.data.user
                this.balance = response.data.balance
                this.domain = response.data.domain
            } catch (error) {
                console.log('log_in', error)
            }
        },

        logout() {
            this.token = null
            this.user = null
            this.balance = 0,
            this.domain = null,
            this.roles = []
            navigateTo('/auth')
        }
    }
})