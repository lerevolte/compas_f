<template>
  <div class="wrapper">
      <div class="page" :class="{ 'page_auth': checkPath.includes('/auth') }">
        <NuxtPage />
      </div>
      <div class="menu__overlay" id="menu__overlay"></div>
  </div>
</template>

<script setup>
  import '@/assets/default.scss'
  import '@/assets/fonts/fonts.css'

  const router = useRoute()

  const checkPath = computed(() => {
    return router.path
  })

</script>
