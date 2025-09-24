<template>
    <div class="scroll-buttons">
      <!-- Левая кнопка -->
      <figure
        class="scroll-button"
        :class="{ 'scroll-button_disabled': isAtStart }"
        @mouseover="() => {console.log('asdasdasdasd')}"
        @mousedown.prevent="buttonScroll.start('left')"
        @touchstart.prevent="buttonScroll.start('left')"
        @mouseleave="buttonScroll.stop"
        ref="buttonLeftRef"
      >
        <!-- svg left -->
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="80" viewBox="0 0 40 80">
          <g fill="none" fill-rule="evenodd">
            <path fill="#a6b7d4" fill-opacity=".471" d="M0 80c22.091 0 40-17.909 40-40S19.566 0 0 0z"/>
            <path fill="#fff" d="M11.587 38.95q-.768.638-.768 1.254 0 .615.8 1.397l9.939 10c.513.517.522 1.35.018 1.877a1.28 1.28 0 0 1-1.831.022L7.855 41.624a2 2 0 0 1 .006-2.835l12.076-11.977a1.315 1.315 0 0 1 1.88.029 1.38 1.38 0 0 1-.026 1.927z"/>
          </g>
        </svg>
      </figure>

      <!-- Правая кнопка -->
      <figure
        class="scroll-button"
        :class="{ 'scroll-button_disabled': isAtEnd }"
        @mousedown.prevent="buttonScroll.start('right')"
        @touchstart.prevent="buttonScroll.start('right')"
        @mouseleave="buttonScroll.stop"
        ref="buttonRightRef"
      >
        <!-- svg right -->
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="80" viewBox="0 0 40 80">
          <g fill="none" fill-rule="evenodd">
            <path fill="#a6b7d4" fill-opacity=".471" d="M40 80C17.909 80 0 62.091 0 40S20.434 0 40 0z"/>
            <path fill="#fff" d="M28.413 38.95q.768.638.768 1.254 0 .615-.8 1.397l-9.939 10a1.345 1.345 0 0 0-.018 1.877 1.28 1.28 0 0 0 1.831.022l11.89-11.876a2 2 0 0 0-.006-2.835L20.063 26.812a1.315 1.315 0 0 0-1.88.029 1.38 1.38 0 0 0 .026 1.927z"/>
          </g>
        </svg>
      </figure>
    </div>
  </template>
  
  <script setup>
  import { ref, inject, computed, onMounted, onUnmounted } from 'vue'
  import './ScrollButtons.scss'
  
  const tableRef = inject('tableRef')           // контейнер, который скроллим
  const buttonLeftRef = ref(null)
  const buttonRightRef = ref(null)
  
  // --- реактивное значение позиции скролла ---
  const scrollLeft = ref(0)
  
  // настройки
  const TOLERANCE = 1       // px, чтобы избежать ошибок округления
  const STEP = 12           // px за кадр при удержании кнопки
  
  // вычисляемое состояние для левой кнопки
  const isAtStart = computed(() => scrollLeft.value <= TOLERANCE)
  
  // вычисляемое состояние для правой кнопки
  const isAtEnd = computed(() => {
    if (!tableRef?.value) return true
    const maxLeft = Math.max(0, tableRef.value.scrollWidth - tableRef.value.clientWidth)
    return scrollLeft.value + TOLERANCE >= maxLeft || maxLeft <= 0
  })
  
  /**
   * Класс для управления скроллом кнопками
   * - Следит за положением scrollLeft
   * - Реализует плавный скролл при удержании
   * - Слушает scroll и resize
   */
  class ButtonScroll {
    constructor (tableRef, scrollLeftRef) {
      this.tableRef = tableRef
      this.scrollLeftRef = scrollLeftRef
  
      this.rafId = null       // id активного requestAnimationFrame
      this.running = false    // флаг, запущен ли скролл
  
      // биндим контекст для обработчиков
      this.onScroll = this.onScroll.bind(this)
      this.handleResize = this.handleResize.bind(this)
      this.stop = this.stop.bind(this)
    }
  
    /** Обновить значение scrollLeft в реактивном ref */
    updateScrollLeft () {
      if (!this.tableRef?.value) return
      this.scrollLeftRef.value = Math.round(this.tableRef.value.scrollLeft * 100) / 100
    }
  
    /** Один шаг плавного скролла */
    step (direction) {
      if (!this.running || !this.tableRef?.value) {
        this.rafId = null
        return
      }
      const el = this.tableRef.value
      const delta = direction === 'left' ? -STEP : STEP
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
      el.scrollLeft = Math.max(0, Math.min(el.scrollLeft + delta, maxLeft))
      this.updateScrollLeft()
      this.rafId = requestAnimationFrame(() => this.step(direction))
    }
  
    /** Запустить плавный скролл в нужном направлении */
    start (direction) {
      if (!this.tableRef?.value) return
      if (direction === 'left' && isAtStart.value) return
      if (direction === 'right' && isAtEnd.value) return
      if (this.running) return
  
      this.running = true
      if (this.rafId) cancelAnimationFrame(this.rafId)
      this.rafId = requestAnimationFrame(() => this.step(direction))
  
      // глобально слушаем mouseup/touchend, чтобы остановить скролл даже вне кнопки
      document.addEventListener('mouseup', this.stop)
      document.addEventListener('touchend', this.stop)
    }
  
    /** Остановить скролл и снять глобальные слушатели */
    stop () {
      this.running = false
      if (this.rafId) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      document.removeEventListener('mouseup', this.stop)
      document.removeEventListener('touchend', this.stop)
    }
  
    /** Обработчик события scroll контейнера */
    onScroll (e) {
      if (e.target && typeof e.target.scrollLeft === 'number') {
        this.scrollLeftRef.value = Math.round(e.target.scrollLeft * 100) / 100
      }
    }
  
    /** Обновление данных при изменении размеров окна */
    handleResize () {
      this.updateScrollLeft()
      if (this.tableRef?.value) void this.tableRef.value.scrollWidth
    }
  
    /** Подключить слушатели и установить начальное состояние */
    mount () {
      if (!this.tableRef?.value) return
      this.updateScrollLeft()
      this.tableRef.value.addEventListener('scroll', this.onScroll, { passive: true })
      window.addEventListener('resize', this.handleResize)
    }
  
    /** Убрать все слушатели и остановить скролл */
    unmount () {
      if (this.tableRef?.value) {
        this.tableRef.value.removeEventListener('scroll', this.onScroll)
      }
      window.removeEventListener('resize', this.handleResize)
      this.stop()
    }
  }
  
  // создаём экземпляр класса
  const buttonScroll = new ButtonScroll(tableRef, scrollLeft)
  
  // монтирование/размонтирование
  onMounted(() => buttonScroll.mount())
  onUnmounted(() => buttonScroll.unmount())
  </script>
  