<template>
  <main>
    <AppDetail 
        :id="userStore.user?.id"
        :slug="'users'"
        @openModal="item => emit('openModal', item)"
        @closeDetail="item => emit('closeDetail', item)"
        @updateMetaHeader="item => updateMetaHeader(item)"
    />
  </main>
</template>

<script setup>
  import AppDetail from '@AppTemplates/Detail/Detail.vue';   
  
  import { useUserStore } from '@/stores/userStore.js'
  const userStore = useUserStore()

  const router = useRoute()

  const updateMetaHeader = (item) => {
    useHead({
      title: item?.title
    })
  }

  const emit = defineEmits([
    'openModal',
    'closeDetail'
])
</script>
