<template>
  <div class="wrapper">
      <div class="page" :class="{ 'page_auth': getRoute }">
        <AppMenu v-if="!getRoute"/>
        <NuxtPage 
          :entity="entity"
          :slug="router.params.slug"
          @init="item => entity.init(item)"
          @openModal="item => entity.openModal(item)"
        />
      </div>

      <div class="detail__overlay" id="detail__overlay" v-if="entity.modal.length > 0">
        <AppWarningLarge 
          v-for="(modal, index) in entity.modal" 
          :options="{
              index: index,
              ...entitiesJSON[modal.slug],
          }"
          @close="entity.modal.pop()"
        >
          <AppAnalyticDetail 
            v-if="modal.template == 'chart'"
            :slug="modal.slug"
            :dateRange="modal.dateRange"
            @close="entity.modal.pop()"
            @closeDetail="() => entity.closeDetail()"
            @updateMetaHeader="item => entity.updateMetaHeader(item)"
            @openModal="item => entity.openModal(item)"
          />
          <AppDetail 
            v-else
            :id="modal.id"
            :tab_slug="modal.tab_slug"
            :slug="modal.slug"
            :is_modal="true"
            :isGlobalEdit="['create', 'copy'].includes(modal.type)"
            :isCopy="modal.type === 'copy'"
            @close="entity.modal.pop()"
            @closeDetail="() => entity.closeDetail()"
            @updateMetaHeader="item => entity.updateMetaHeader(item)"
            @openModal="item => entity.openModal(item)"
        />
        </AppWarningLarge>
      </div>

      <div class="menu__overlay" id="menu__overlay"></div>
      <div id="mass-action-container"></div>
  </div>
</template>

<script setup>
  import '@/assets/default.scss'
  import '@/assets/fonts/fonts.css'

  import AppMenu from '@AppComponents/Menu/Menu.vue';
	import AppDetail from '@AppTemplates/Detail/Detail.vue';
  import AppAnalyticDetail from '@AppTemplates/Analytic/Detail/Detail.vue';
	import AppWarningLarge from '@AppComponents/Modal/Large/Large.vue'

  const router = useRoute()

  import metaJSON from './meta.json'
  import entitiesJSON from './entities.json'

  class Entity {
    constructor() {
      this.modal = []
      this.active = metaJSON[router.params.slug]
      this.addresses = []
      this.currentTitle = `${metaJSON[router.params.slug]?.title} | Compas.pro` 
    }

    openModal(item) {
      item.slug = item.slug ?? router.params.slug
      item.tab_slug = item.tab_slug ?? null
 
      if ((this.modal.length >= 9 || window.screen.width <= 990) && !['create', 'copy'].includes(item.type)) {
        this.modal = []
        this.addresses = []
        if (item.template == 'chart') {
          window.location.href = `/analytics/${item.slug}`
        } else {
          window.location.href = `/objects/${item.slug}/${item.id}`
        }
      } else {
        this.modal.push(item)
        this.addresses.push({
          title: this.currentTitle,
          link: window.location.href
        })

        if (item.template == 'chart') {
          window.history.replaceState({}, document.title, window.location.origin +  `/analytics/${item.slug}`);
        } else {
          window.history.replaceState({}, document.title, window.location.origin +  `/objects/${item.slug}/${item.id}`);
        }
      }
    }

    updateMetaHeader(item) {
      this.currentTitle = item.title
      window.history.replaceState({}, document.title, window.location.origin +  `/objects/${item.href?.slug}/${item.href?.id}`);
      useHead({
        title: item.title
      })
    }

    closeDetail() {
      const prevAddress = this.addresses.pop()
      if (prevAddress?.link) {
        window.history.replaceState({}, document.title, prevAddress?.link);
        useHead({
          title: prevAddress.title
        })
      }
    }
  }

  const getRoute = computed(() => {
    return router.path.includes('/auth') && router.path.includes('/api/external')
  })

  const entity = ref(new Entity())
</script>
