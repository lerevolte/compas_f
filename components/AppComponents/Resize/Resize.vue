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

                return false;
            }

            this.isResizing = true
            saveWH(event)
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

        // Ищем ближайший прокручиваемый предок (overflow auto/scroll по Y).
        findScroller() {
            if (!sectionRef.value) return null
            let el = sectionRef.value.parentElement
            while (el && el !== document.body && el !== document.documentElement) {
                const cs = window.getComputedStyle(el)
                const oy = cs.overflowY
                if (oy === 'auto' || oy === 'scroll') return el
                el = el.parentElement
            }
            return document.scrollingElement || document.documentElement
        }

        // Изменение высоты секции.
        // 1) Считаем newHeight от движения курсора (deltaHeight + pageY).
        // 2) Если нижний край секции «перешёл» уровень (viewport - 40px) —
        //    пробуем подскроллить scroll-container ровно на этот overflow,
        //    тогда секция визуально уезжает вверх и нижний край ровно в
        //    40px от низа экрана.
        // 3) Если scroll-container не сдвинулся (упёрся в max или его нет) —
        //    cap'ом ограничиваем высоту, чтобы нижний край не залез ближе
        //    40px к низу viewport.
        resizeBlock(obj_event) {
            const BOTTOM_MARGIN = 40

            let point = this.getXY(obj_event);
            let newHeight = this.deltaHeight + point[1]
            if (newHeight < 160) return

            // Применяем «черновую» высоту, чтобы getBoundingClientRect отразил её.
            sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)

            if (typeof window !== 'undefined' && sectionRef.value) {
                const rect = sectionRef.value.getBoundingClientRect()
                let overflow = (rect.top + newHeight) - (window.innerHeight - BOTTOM_MARGIN)
                if (overflow > 0) {
                    const scroller = this.findScroller()
                    let actuallyScrolled = 0
                    if (scroller) {
                        const before = scroller.scrollTop
                        scroller.scrollTop = before + overflow
                        actuallyScrolled = scroller.scrollTop - before
                    }
                    const remaining = overflow - actuallyScrolled
                    if (remaining > 0) {
                        // Скролл не покрыл overflow (или его нет) — урезаем
                        // высоту секции, чтобы нижний край остановился в
                        // 40px от низа viewport.
                        newHeight = newHeight - remaining
                        if (newHeight < 160) newHeight = 160
                        sectionRef.value.style.setProperty('--heightSection', `${newHeight}px`)
                    }
                }
            }
        }
    }

    const resize = ref(new Resize())
</script>
