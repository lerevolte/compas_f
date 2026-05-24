import { useUserStore } from '~/stores/userStore'
import { useMenuStore } from '~/stores/menuStore'

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore()
    const menuStore = useMenuStore()

    if (import.meta.server) return

    if (to.meta.auth === false) return


    if (to.path.startsWith('/external/')) {
        return
    }


    // Исключаем маршруты /api/external из всех проверок - они должны быть доступны всегда
    if (to.path.includes('/api/external')) {
        return
    }

    if (!userStore.token && !to.path.includes('/auth')) {
        return navigateTo('/auth')
    } else if (userStore.token != null && to.path.includes('/auth')) {
        return navigateTo('/')
    }

    // Если есть токен и путь корневой, редиректим на первую ссылку меню
    if (userStore.token && to.path === '/') {
        // Если меню еще не загружено, загружаем его
        if (!menuStore.list || menuStore.list.length === 0) {
            await menuStore.get()
        }
        
        // Если меню есть, редиректим на первую видимую ссылку (не скрытую)
        if (menuStore.list && menuStore.list.length > 0) {
            const visibleItems = menuStore.list.filter(item => !item.is_hidden)
            if (visibleItems.length > 0 && visibleItems[0].link) {
                return navigateTo(visibleItems[0].link)
            }
        }
    }
})
  