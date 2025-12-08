<template>
    <main>
      <AppDetail 
          :id="router.params.id"
          :slug="router.params.slug"
          @openModal="item => emit('openModal', item)"
          @closeDetail="item => emit('closeDetail', item)"
          @updateMetaHeader="item => updateMetaHeader(item)"
      />
    </main>
</template>

<script setup>
    import AppDetail from '@AppTemplates/Detail/Detail.vue';    

    const router = useRoute()

    const updateMetaHeader = (item) => {
      useHead({
        title: item
      })
    }

    const emit = defineEmits([
      'openModal',
      'closeDetail'
	])
</script>
