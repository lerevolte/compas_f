<template>
    <div class="scroll-buttons">
      <!-- Левая кнопка -->
      <figure
        class="scroll-button"
        :class="{ 'scroll-button_disabled': isAtStart }"
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
  import { ref, inject, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import './ScrollButtons.scss'
  
  const tableRef = inject('tableRef')           // контейнер, который скроллим
  const table = inject('table')                 // объект таблицы для отслеживания загрузки
  const buttonLeftRef = ref(null)
  const buttonRightRef = ref(null)
  const isAtEnd = ref(false)
  
  // --- реактивное значение позиции скролла ---
  const scrollLeft = ref(0)
  
  // настройки
  const TOLERANCE = 1       // px, чтобы избежать ошибок округления
  const STEP = 12           // px за кадр при удержании кнопки
  
  // Флаг готовности таблицы для корректного расчета
  const isTableReady = ref(false)
  
  // вычисляемое состояние для левой кнопки
  const isAtStart = computed(() => {
    if (!isTableReady.value) return false // Показываем кнопку пока таблица не готова
    return scrollLeft.value <= TOLERANCE
  })
  
  // вычисляемое состояние для правой кнопки
  const getIsAtEnd = () => {
    if (!isTableReady.value || !tableRef?.value) return false
      const maxLeft = Math.max(0, tableRef.value.scrollWidth - tableRef.value.clientWidth)
      if (maxLeft <= 0) return true
      return scrollLeft.value + TOLERANCE >= maxLeft
  }

  /**
   * Класс для управления скроллом кнопками
   * - Следит за положением scrollLeft
   * - Реализует плавный скролл при удержании
   * - Слушает scroll и resize
   */
  class ButtonScroll {
    constructor (tableRef, scrollLeftRef, isTableReadyRef) {
      this.tableRef = tableRef
      this.scrollLeftRef = scrollLeftRef
      this.isTableReadyRef = isTableReadyRef
  
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
      isAtEnd.value = getIsAtEnd()
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
      isAtEnd.value = getIsAtEnd()
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

    /** Принудительное обновление состояния кнопок */
    forceUpdate () {
      this.updateScrollLeft()
      // Принудительно обновляем готовность таблицы
      if (this.tableRef?.value && this.isTableReadyRef) {
        isAtEnd.value = getIsAtEnd()
        // Таблица готова, если scrollWidth больше 0 и мы можем определить maxLeft
        this.isTableReadyRef.value = this.tableRef.value.scrollWidth > 0
      }
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
  const buttonScroll = new ButtonScroll(tableRef, scrollLeft, isTableReady)
  
  // функция для обновления состояния кнопок после рендера
  const updateButtonsState = async () => {
    await nextTick()
    // Даем время на полный рендер таблицы
    await new Promise(resolve => setTimeout(resolve, 50))
    if (tableRef?.value) {
      buttonScroll.forceUpdate()
    }
  }

  // ResizeObserver для отслеживания изменений размеров таблицы
  let resizeObserver = null

  // Периодическая проверка состояния (на случай, если watch не сработал)
  let checkInterval = null

  // монтирование/размонтирование
  onMounted(() => {
    buttonScroll.mount()
    
    // Отслеживаем изменения размеров таблицы
    if (tableRef?.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateButtonsState()
      })
      resizeObserver.observe(tableRef.value)
    }

    // Обновляем состояние после монтирования несколько раз с задержками
    updateButtonsState()
    setTimeout(() => updateButtonsState(), 100)
    setTimeout(() => updateButtonsState(), 300)
    setTimeout(() => updateButtonsState(), 500)

    // Периодическая проверка каждые 500ms в течение первых 3 секунд
    let checkCount = 0
    checkInterval = setInterval(() => {
      if (checkCount++ < 6) {
        updateButtonsState()
      } else {
        clearInterval(checkInterval)
        checkInterval = null
      }
    }, 500)
  })

  onUnmounted(() => {
    buttonScroll.unmount()
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    if (checkInterval) {
      clearInterval(checkInterval)
    }
  })

  // Отслеживаем загрузку таблицы и обновляем состояние кнопок
  if (table) {
    watch(() => table?.value?.loading, async (isLoading, wasLoading) => {
      // Когда загрузка завершается, обновляем состояние кнопок
      if (wasLoading && !isLoading) {
        // Сбрасываем флаг готовности при начале новой загрузки
        isTableReady.value = false
        await updateButtonsState()
        // Дополнительное обновление после полного рендера
        setTimeout(() => {
          updateButtonsState()
        }, 200)
      }
    })

    // Отслеживаем изменения данных таблицы
    watch(() => table?.value?.body?.length, async (newLength, oldLength) => {
      if (newLength !== oldLength) {
        isTableReady.value = false
        await updateButtonsState()
        setTimeout(() => {
          updateButtonsState()
        }, 200)
      }
    })

    // Отслеживаем готовность виртуализатора
    watch(() => table?.value?.rowVirtualizer, async (virtualizer) => {
      if (virtualizer) {
        await updateButtonsState()
      }
    }, { immediate: true })
  }
  </script>
  