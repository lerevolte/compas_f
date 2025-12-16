<template>
    <main>
      <AppAnalyticDetail 
          :slug="router.params.slug"
          @openModal="item => emit('openModal', item)"
          @closeDetail="item => emit('closeDetail', item)"
          @updateMetaHeader="item => updateMetaHeader(item)"
      />
    </main>
</template>

<script setup>
  import AppAnalyticDetail from '@AppTemplates/Analytic/Detail/Detail.vue';

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
