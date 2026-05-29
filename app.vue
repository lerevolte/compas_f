<template>
  <div class="wrapper">
      <div class="page" :class="{ 'page_auth': !getRoute.state }">
        <AppMenu 
          v-if="getRoute.state"
          :options="{
            type: getRoute.type
          }"
        />
        <NuxtPage 
          :entity="entity"
          :slug="router.params.slug"
          @init="item => entity.init(item)"
          @openModal="item => entity.openModal(item)"
        />
        <div id="menu-group"></div>
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
            :route_id="modal.route_id"
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

  import { Socket } from '@AppHelpers/classes.js';
  import AppMenu from '@AppComponents/Menu/Menu.vue';
	import AppDetail from '@AppTemplates/Detail/Detail.vue';
  import AppAnalyticDetail from '@AppTemplates/Analytic/Detail/Detail.vue';
	import AppWarningLarge from '@AppComponents/Modal/Large/Large.vue'

  const router = useRoute()

  import metaJSON from './meta.json'
  import entitiesJSON from './entities.json'
  
  const emit = defineEmits([
      'ObjectUpdated',
      'ObjectCreated',
      'ObjectDeleted',
      'ObjectRestored',
      'HistoryUpdated',
      'FieldUpdated',
      'FieldDeleted'
  ])

  const socket = ref(new Socket())
  
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

      // На страницах без slug-параметра (например, /logistic, /settings)
      // metaJSON[router.params.slug] === undefined и currentTitle получался
      // вида "undefined | Compas.pro". При закрытии деталки этот мусор
      // подставлялся обратно в title. Берём актуальный document.title,
      // который страница уже выставила через useHead в onMounted.
      const fallbackTitle = (typeof document !== 'undefined' && document.title) ? document.title : ''
      const savedTitle = (typeof this.currentTitle === 'string' && !this.currentTitle.startsWith('undefined'))
        ? this.currentTitle
        : fallbackTitle

      if (this.modal.length >= 9 && !['create', 'copy'].includes(item.type)) {
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
          title: savedTitle,
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
      window.history.replaceState({}, document.title, window.location.origin +  `/objects/${item.href?.slug}/${item.href?.id}`);
      useHead({
        title: item.title
      })
      this.currentTitle = JSON.parse(JSON.stringify(item.title))
    }

    closeDetail() {
      let prevAddress = this.addresses.pop()
      window.history.replaceState({}, document.title, prevAddress?.link);
      useHead({
        title: prevAddress.title
      })
    }
  }

  const getRoute = computed(() => {
    const isAuth = router.path.includes('/auth')
    const isExternal = router.path.startsWith('/external/') || router.path.includes('/api/external')
    return {
      type: isAuth ? 'auth' : isExternal ? 'empty' : 'default',
      state: !isAuth && !isExternal
    }
  })



  onMounted(() => {
    if (!getRoute.value.isAuth) {
      socket.value.init(emit)
    }
  })

  const entity = ref(new Entity())

  watch(entity.value.modal, () => {
      const wasModal = socket.value.isModal
      const isModalNow = entity.value.modal.length > 0
      socket.value.isModal = isModalNow
      // Когда модалка закрылась — материализуем собственные правки, которые
      // были отложены пока пользователь редактировал в модалке. Так в
      // родительской таблице появляется стандартная плашка «1 изменение…
      // [Загрузить]» сразу после закрытия деталки.
      if (wasModal && !isModalNow) {
        socket.value.flushPendingOwn?.()
      }
    })

  provide('socket', socket)
</script>
