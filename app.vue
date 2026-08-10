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
          @close="popModal()"
        >
          <AppAnalyticDetail
            v-if="modal.template == 'chart'"
            :slug="modal.slug"
            :dateRange="modal.dateRange"
            @close="popModal()"
            @closeDetail="() => closeDetail()"
            @updateMetaHeader="item => entity.updateMetaHeader(item)"
            @openModal="item => entity.openModal(item)"
          />
          <AppProductStats
            v-else-if="modal.template == 'product-stats'"
            :isModal="true"
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
            :defaults="modal.defaults ?? null"
            @close="popModal()"
            @closeDetail="() => closeDetail()"
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
  import AppProductStats from '@AppTemplates/ProductStats/ProductStats.vue';
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
      this.basePageTitle = null
      this.basePageLink = null
      this.lastOpenAt = 0
    }

    _resolvePageTitle() {
      const fromMeta = `${metaJSON[router.params.slug]?.title} | Compas.pro`
      if (!fromMeta.startsWith('undefined')) return fromMeta
      if (typeof document !== 'undefined' && document.title) return document.title
      return ''
    }

    openModal(item) {
      item.slug = item.slug ?? router.params.slug
      item.tab_slug = item.tab_slug ?? null
      this.lastOpenAt = Date.now()

      if (this.modal.length === 0) {
        this.basePageTitle = this._resolvePageTitle()
        this.basePageLink = (typeof window !== 'undefined') ? window.location.href : ''
      }

      const savedTitle = (typeof this.currentTitle === 'string' && !this.currentTitle.startsWith('undefined'))
        ? this.currentTitle
        : this._resolvePageTitle()

      if (this.modal.length >= 9 && !['create', 'copy'].includes(item.type)) {
        this.modal = []
        this.addresses = []
        if (item.template == 'chart') {
          window.location.href = `/analytics/${item.slug}`
        } else if (item.template == 'product-stats') {
          window.location.href = `/product-stats`
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
          window.history.replaceState(window.history.state, document.title, window.location.origin +  `/analytics/${item.slug}`);
        } else if (item.template == 'product-stats') {
          window.history.replaceState(window.history.state, document.title, window.location.origin +  `/product-stats`);
        } else {
          window.history.replaceState(window.history.state, document.title, window.location.origin +  `/objects/${item.slug}/${item.id}`);
        }
      }
    }

    updateMetaHeader(item) {
      window.history.replaceState(window.history.state, document.title, window.location.origin +  `/objects/${item.href?.slug}/${item.href?.id}`);
      useHead({
        title: item.title
      })
      this.currentTitle = JSON.parse(JSON.stringify(item.title))
    }

    closeDetail() {
      if (this.addresses.length <= this.modal.length) return
      let prevAddress = this.addresses.pop()
      const isLast = this.modal.length === 0
      const targetTitle = isLast && this.basePageTitle ? this.basePageTitle : prevAddress?.title
      const targetLink  = isLast && this.basePageLink  ? this.basePageLink  : prevAddress?.link

      if (targetLink) {
        window.history.replaceState(window.history.state, document.title, targetLink);
      }
      useHead({
        title: targetTitle
      })
      this.currentTitle = targetTitle

      if (isLast) {
        this.basePageTitle = null
        this.basePageLink = null
      }
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

    document.addEventListener('mousedown', (e) => {
      if (e.detail > 1 && Date.now() - entity.value.lastOpenAt < 700 && e.target instanceof Element && e.target.closest('.detail__overlay')) {
        e.preventDefault()
        window.getSelection()?.removeAllRanges()
      }
    }, { capture: true })

    if (window.matchMedia('(pointer: coarse)').matches) {
      const resetContainersScrollX = () => {
        document.querySelectorAll('.page, .modal__body').forEach(el => {
          if (el.scrollLeft) el.scrollLeft = 0
        })
      }
      const resetWindowScroll = () => {
        resetContainersScrollX()
        if (window.visualViewport && window.visualViewport.scale > 1) return
        const active = document.activeElement
        const isEditable = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        if (isEditable) {
          if (window.scrollX) {
            window.scrollTo({ top: window.scrollY, left: 0, behavior: 'instant' })
          }
          return
        }
        if (window.scrollX || window.scrollY) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
      }
      window.addEventListener('scroll', resetWindowScroll, { passive: true })
      document.addEventListener('scroll', (e) => {
        const el = e.target
        if (el instanceof Element && (el.classList.contains('page') || el.classList.contains('modal__body'))) {
          if (el.scrollLeft) el.scrollLeft = 0
        }
      }, { capture: true, passive: true })
      window.visualViewport?.addEventListener('resize', () => setTimeout(resetWindowScroll, 50))
      document.addEventListener('focusout', () => setTimeout(resetWindowScroll, 100))
    }
  })

  const entity = ref(new Entity())

  const popModal = () => {
    if (Date.now() - entity.value.lastOpenAt < 500) return
    entity.value.modal.pop()
    syncSocketModal()
  }

  const closeDetail = () => {
    entity.value.closeDetail()
    syncSocketModal()
  }

  let prevModalLen = 0

  const syncSocketModal = () => {
    const newLen = entity.value.modal.length
    socket.value.isModal = newLen > 0
    if (newLen < prevModalLen) {
      socket.value.flushPendingOwn?.()
    }
    prevModalLen = newLen
  }

  watch(() => entity.value.modal.length, (newLen, oldLen) => {
      const isModalNow = (newLen || 0) > 0
      if (socket.value.isModal !== isModalNow) {
        socket.value.isModal = isModalNow
      }
      if ((newLen || 0) < (oldLen || 0)) {
        socket.value.flushPendingOwn?.()
      }
    })

  const origOpenModal = entity.value.openModal.bind(entity.value)
  entity.value.openModal = (item) => {
    origOpenModal(item)
    syncSocketModal()
  }

  provide('socket', socket)
</script>
