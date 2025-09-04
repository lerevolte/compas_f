import { useUserStore } from '~/stores/userStore'

export default defineNuxtRouteMiddleware((to, from) => {
    const userStore = useUserStore()

    if (import.meta.server) return

    if (!userStore.token && to.path == '/admin') {
        return navigateTo('/auth')
    } else if (userStore.token != null && to.path === '/auth') {
        return navigateTo('/admin')
    }
})
  