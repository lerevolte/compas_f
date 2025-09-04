import { useMenuStore } from '@/stores/menuStore.js'
import { useUserStore } from '@/stores/userStore.js'

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (to.path.startsWith('/auth')) {
    return
  }

  const menu = useMenuStore()
  const user = useUserStore()
  await menu.get()
  await user.getRoles()
})
