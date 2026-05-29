<template>
    <section 
        class="resize" 
        ref="sectionRef"
        :style="`
            --heightSection: ${props.options.height}; 
            --widthSection: ${props.options.width}
        `">
            <IconDragDotted class="resize__icon-drag" />
            <slot></slot>
            <IconResize 
                ref="resizeRef"
                @mousedown="(event) => resize.startResize(event)"
            />
    </section>
</template>

<script setup>
    import './Resize.scss';
    import IconDragDotted from '@AppIcons/Actions/DragDotted.vue'
    import IconResize from '@AppIcons/Actions/Resize.vue';

    const sectionRef = ref(null)
    
    const props = defineProps({
        options: {
            default: {
               height: '100%',
               width: '100%' 
            },
            type: Object
        }
    })

    const emit = defineEmits([
        'endResize'
    ])

    class Resize {
        constructor() {
            this.isResizing = false
            this.deltaHeight = 0
            this.mouseMoveHandler = null
            this.mouseUpHandler = null
        }

        // Начало ресайза
        startResize(event) {
            event.preventDefault()
            // Сохранение высоты секции
            const saveWH = (obj_event) => {
                var point = this.getXY(obj_event);
                this.deltaHeight = sectionRef.value.clientHeight - point[1];

                // Создаем обработчики с привязкой к контексту
                this.mouseMoveHandler = this.resizeBlock.bind(this);
                this.mouseUpHandler = this.endResize.bind(this);

                document.addEventListener("mousemove", this.mouseMoveHandler);
                document.addEventListener("mouseup", this.mouseUpHandler);

                // Запускаем rAF-цикл авто-скролла. Скролим скролл-контейнер,
                // когда курсор находится в нижней зоне viewport — даже если
                // мышь стоит на месте. Это позволяет тянуть секцию ниже
                // изначального края экрана: страница плавно прокручивается,
                // rect.top секции уменьшается, и cap пропускает рост.
                this._lastPageY = point[1]
                this._lastClientY = (event && typeof event.clientY === 'number') ? event.clientY : 0
                this._autoScrollRaf = null
                this._scheduleAutoScroll()

                return false;
            }

            this.isResizing = true
            saveWH(event)
        }

        _scheduleAutoScroll() {
            const tick = () => {
                if (!this.isResizing) return
                const SCROLL_TRIGGER = 80
                const SCROLL_STEP = 8
                if (typeof window !== 'undefined') {
                    const distFromBottom = window.innerHeight - this._lastClientY
                    if (distFromBottom < SCROLL_TRIGGER && sectionRef.value) {
                        const scroller = sectionRef.value.closest?.('.page') || document.scrollingElement
                        if (scroller) {
                            const before = scroller.scrollTop
                            // Чем ближе курсор к краю — тем быстрее скроллим.
                            const speed = Math.max(1, (SCROLL_TRIGGER - distFromBottom) / SCROLL_TRIGGER) * SCROLL_STEP
                            scroller.scrollTop = before + speed
                            const after = scroller.scrollTop
                            if (after !== before) {
                                // Сдвиг скролла надо компенсировать в deltaHeight,
                                // иначе newHeight = deltaHeight + pageY будет
                                // прыгать. После скролла переcчитываем высоту
                                // и применяем заново.
                                this.deltaHeight += (after - before)
                                const newHeight = this.capByViewport(
                                    this.deltaHeight + this._lastPageY,
                                    { preserveCurrent: true }
                                )
                                if (newHeight >= 160) {
                                    sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)
                                }
                            }
                        }
                    }
                }
                this._autoScrollRaf = requestAnimationFrame(tick)
            }
            this._autoScrollRaf = requestAnimationFrame(tick)
        }

        // Конец ресайза
        endResize() {
            if (this.isResizing) {
                this.isResizing = false

                // Удаляем обработчики событий
                if (this.mouseMoveHandler) {
                    document.removeEventListener("mousemove", this.mouseMoveHandler);
                }
                if (this.mouseUpHandler) {
                    document.removeEventListener("mouseup", this.mouseUpHandler);
                }

                if (this._autoScrollRaf) {
                    cancelAnimationFrame(this._autoScrollRaf)
                    this._autoScrollRaf = null
                }

                emit('endResize', sectionRef.value.offsetHeight)
            }
        }

        // Функция для получения текущих координат курсора мыши
        getXY(obj_event) {
            let x = 0
            let y = 0

            if (obj_event) {
                x = obj_event.pageX;
                y = obj_event.pageY;
            }
            return new Array(x, y);
        }

        // Изменение высоты секции
        resizeBlock(obj_event) {
            let point = this.getXY(obj_event);
            // Запоминаем pageY/clientY курсора для rAF-цикла авто-скролла,
            // чтобы скролить даже если мышь стоит неподвижно у нижнего края.
            this._lastPageY = point[1]
            if (obj_event && typeof obj_event.clientY === 'number') {
                this._lastClientY = obj_event.clientY
            }

            let newHeight = this.deltaHeight + point[1]
            if (newHeight < 160) return

            newHeight = this.capByViewport(newHeight, { preserveCurrent: true })
            sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)
        }

        // Ограничиваем высоту секции так, чтобы её нижний край не подходил
        // ближе чем на BOTTOM_MARGIN к нижнему краю VIEWPORT (видимой
        // области окна). preserveCurrent=true (для drag): не ужимаем секцию,
        // если она уже больше предела, только не даём расти дальше. Без
        // флага (для load-time enforcement): жёсткий cap, секция уменьшается
        // до предела.
        capByViewport(height, opts = {}) {
            if (typeof window === 'undefined' || !sectionRef.value) return height
            const BOTTOM_MARGIN = 40
            const rect = sectionRef.value.getBoundingClientRect()
            let maxHeight = window.innerHeight - rect.top - BOTTOM_MARGIN
            if (maxHeight < 160) maxHeight = 160
            if (opts.preserveCurrent) {
                const currentHeight = sectionRef.value.offsetHeight
                return Math.min(height, Math.max(maxHeight, currentHeight))
            }
            return Math.min(height, maxHeight)
        }
    }

    const resize = ref(new Resize())

    // Подгоняем высоту секции под viewport при первом монтировании и при
    // изменении размеров окна — сохранённая ранее высота могла быть
    // выставлена для большего экрана и теперь выйти за нижний край.
    const enforceMaxHeight = () => {
        if (!sectionRef.value || typeof window === 'undefined') return
        const current = sectionRef.value.offsetHeight
        if (!current) return
        const capped = resize.value.capByViewport(current)
        if (capped < current) {
            sectionRef.value.style.setProperty('--heightSection', `${capped}px`)
        }
    }

    onMounted(() => {
        // Двойной rAF — после первого layout, а потом ещё после применения
        // CSS-переменной из props (Vue устанавливает inline style чуть позже).
        requestAnimationFrame(() => requestAnimationFrame(enforceMaxHeight))
        window.addEventListener('resize', enforceMaxHeight)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', enforceMaxHeight)
    })
</script>
