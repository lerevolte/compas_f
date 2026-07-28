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
      // Заголовок «нижней» страницы — то, к чему всегда нужно вернуться, когда
      // стек модалок опустеет. Захватываем один раз при открытии первой
      // модалки, чтобы каскад nested-модалок не «застрял» с заголовком
      // последней открывавшейся сущности (см. /logistic — раньше после
      // закрытия деталки маршрута/задачи title оставался на их имени вместо
      // «Логистика»).
      this.basePageTitle = null
      this.basePageLink = null
      // Момент последнего открытия модалки. Нужен, чтобы быстрый «прокликивающий»
      // повторный клик (попадающий уже по фону только что открывшейся деталки)
      // не закрывал её сразу — см. popModal().
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
      let prevAddress = this.addresses.pop()
      // Если закрыли последнюю модалку — насильно возвращаемся к заголовку
      // страницы, который захватили в openModal(). Иначе title мог застрять
      // на имени дочерней сущности (для /logistic это и был баг с
      // подставляющимся именем задачи/маршрута).
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

    if (window.matchMedia('(pointer: coarse)').matches) {
      const resetWindowScroll = () => {
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
      window.visualViewport?.addEventListener('resize', () => setTimeout(resetWindowScroll, 50))
      document.addEventListener('focusout', () => setTimeout(resetWindowScroll, 100))
    }
  })

  const entity = ref(new Entity())

  // Toggle isModal и flushPendingOwn — теперь делаем явно в обёртках
  // popModal/closeDetail, ВЫЗЫВАЕМЫХ из шаблона вместо прямого
  // entity.modal.pop(). watch на длину остаётся как fallback на случай,
  // если кто-то ещё мутирует modal иначе (e.g. push снаружи).
  const popModal = () => {
    // Защита от закрытия быстрым прокликиванием: если деталка только что
    // открылась, следующий быстрый клик попадает по её фону (.modal__background)
    // и шлёт close. Игнорируем такие закрытия в первые 500мс после открытия —
    // «если деталка начала открываться, прокликивание её уже не закрывает».
    if (Date.now() - entity.value.lastOpenAt < 500) return
    entity.value.modal.pop()
    syncSocketModal()
  }

  const closeDetail = () => {
    entity.value.closeDetail()
    syncSocketModal()
  }

  // Предыдущая глубина стека модалок — чтобы отличать закрытие (уменьшение)
  // от открытия (увеличение) даже при вложенных модалках.
  let prevModalLen = 0

  const syncSocketModal = () => {
    const newLen = entity.value.modal.length
    socket.value.isModal = newLen > 0
    // ЛЮБОЕ уменьшение стека модалок (закрылась модалка, в т.ч. вложенная —
    // вернулись к РОДИТЕЛЬСКОЙ модалке с таблицей) → переносим отложенные
    // собственные правки в socket.table, чтобы видимая таблица показала плашку
    // «N изменений [Загрузить]». Раньше флашили только при полном закрытии
    // стека (длина → 0): из-за этого внутри модалки маршрута таблица «Задачи»
    // не обновлялась после редактирования задачи во вложенной модалке.
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
      // Подстраховка к syncSocketModal: флашим при любом уменьшении стека.
      if ((newLen || 0) < (oldLen || 0)) {
        socket.value.flushPendingOwn?.()
      }
    })

  // openModal вызывается из дочерних страниц — обернём через эмит:
  // он уже идёт через entity.openModal в шаблоне. Чтобы покрыть и его,
  // сразу после изменения modal.push синхронизируем флаг.
  const origOpenModal = entity.value.openModal.bind(entity.value)
  entity.value.openModal = (item) => {
    origOpenModal(item)
    syncSocketModal()
  }

  provide('socket', socket)
</script>
