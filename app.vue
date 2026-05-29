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
      // Заголовок «нижней» страницы — то, к чему всегда нужно вернуться, когда
      // стек модалок опустеет. Захватываем один раз при открытии первой
      // модалки, чтобы каскад nested-модалок не «застрял» с заголовком
      // последней открывавшейся сущности (см. /logistic — раньше после
      // закрытия деталки маршрута/задачи title оставался на их имени вместо
      // «Логистика»).
      this.basePageTitle = null
      this.basePageLink = null
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

      // Захватываем заголовок/URL «нижней» страницы один раз при открытии
      // первой модалки. Дальше при закрытии стека модалок гарантированно
      // вернёмся именно к нему, даже если внутри открывались дочерние
      // сущности с другими заголовками.
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
      // Если закрыли последнюю модалку — насильно возвращаемся к заголовку
      // страницы, который захватили в openModal(). Иначе title мог застрять
      // на имени дочерней сущности (для /logistic это и был баг с
      // подставляющимся именем задачи/маршрута).
      const isLast = this.modal.length === 0
      const targetTitle = isLast && this.basePageTitle ? this.basePageTitle : prevAddress?.title
      const targetLink  = isLast && this.basePageLink  ? this.basePageLink  : prevAddress?.link

      if (targetLink) {
        window.history.replaceState({}, document.title, targetLink);
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
