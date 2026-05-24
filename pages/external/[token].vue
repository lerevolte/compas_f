<template>
    <main class="external-page">
      <AppDetail 
          :id="router.params.token"
          :slug="null"
          :is_external="true"
          @updateMetaHeader="item => updateMetaHeader(item)"
      />
    </main>
</template>

<script setup>
    import AppDetail from '@AppTemplates/Detail/Detail.vue';    

    definePageMeta({
      layout: false
    })

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