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
            // На верхнем уровне отсеиваем не только is_hidden, но и disabled (!enabled),
            // потому что disabled-пункты в сайдбаре не видны.
            const visibleItems = menuStore.list.filter(item => !item.is_hidden && !!item.enabled)
            const resolveLink = (item) => {
                if (!item) return null
                if (item.is_group) {
                    const children = item.children || []
                    // Для группы — первый отображаемый ребёнок (в порядке массива).
                    const child = children.find(c => c?.link)
                    return child?.link || null
                }
                return item.link || null
            }
            let target = null
            for (const item of visibleItems) {
                target = resolveLink(item)
                if (target) break
            }
            if (target) {
                return navigateTo(target)
            }
        }
    }
})
  