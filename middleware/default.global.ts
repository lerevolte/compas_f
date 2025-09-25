import { useMenuStore } from '@/stores/menuStore.js'
import { useUserStore } from '@/stores/userStore.js'

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (to.path.startsWith('/auth')) {
    return
  }

  // Проверяем, что это первый заход или обновление страницы
  // Если from.name === null, значит это первая загрузка или обновление
  // Если from.name !== null, значит это переход через навигацию
  if (from.name !== null && from.name !== undefined) {
    return
  }

  const menu = useMenuStore()
  const user = useUserStore()
  await menu.get()
  await user.getRoles()
})
