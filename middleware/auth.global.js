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

    if (userStore.token && to.path.startsWith('/logistic')) {
        const hasLogistic = (list) => (list || []).some(item =>
            String(item?.link || '').startsWith('/logistic') ||
            (item?.children || []).some(child => String(child?.link || '').startsWith('/logistic'))
        )
        if (!hasLogistic(menuStore.list)) {
            await menuStore.get()
            if (!hasLogistic(menuStore.list)) {
                return abortNavigation(createError({ statusCode: 403, statusMessage: 'Forbidden', fatal: true }))
            }
        }
    }

    // Если есть токен и путь корневой, редиректим на первую ссылку меню
    if (userStore.token && to.path === '/') {
        // Всегда тянем актуальное меню с бэка — в persisted state может лежать
        // устаревший порядок children, из-за которого редирект уезжал не туда.
        await menuStore.get()
        
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
  