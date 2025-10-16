<template>
  <div class="wrapper">
      <div class="page" :class="{ 'page_auth': checkPath.includes('/auth') }">
        <AppMenu v-if="!checkPath.includes('/auth')"/>
        <NuxtPage />
      </div>
      <div class="menu__overlay" id="menu__overlay"></div>
      <div class="detail__overlay" id="detail__overlay"></div>
  </div>
</template>

<script setup>
  import '@/assets/default.scss'
  import '@/assets/fonts/fonts.css'

  import AppMenu from '@AppComponents/Menu/Menu.vue';

  const router = useRoute()

  const checkPath = computed(() => {
    return router.path
  })

</script>
