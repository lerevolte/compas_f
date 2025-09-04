<template>
  <div class="wrapper">
      <div class="page" :class="{ 'page_auth': router.path == '/auth' }">
        <NuxtPage />
      </div>
      <div class="menu__overlay" id="menu__overlay"></div>
  </div>
</template>

<script setup>
  import '@/assets/default.scss'
  import '@/assets/fonts/fonts.css'

  import { useUserStore } from '@/stores/userStore.js'
  const userStore = useUserStore()

  const router = useRoute()
</script>
