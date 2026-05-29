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

        // Ищем ближайший прокручиваемый предок выше секции (overflow auto/scroll
        // по вертикали). Это, скорее всего, .page (max-height: 100vh +
        // overflow:auto), но мы не хардкодим селектор. ScrollHeight НЕ
        // проверяем — нам нужен элемент, который СПОСОБЕН скроллиться;
        // overflow добавится по мере роста секции.
        findScroller() {
            if (!sectionRef.value) return null
            let el = sectionRef.value.parentElement
            while (el && el !== document.body && el !== document.documentElement) {
                const cs = window.getComputedStyle(el)
                const oy = cs.overflowY
                if (oy === 'auto' || oy === 'scroll') {
                    return el
                }
                el = el.parentElement
            }
            return document.scrollingElement || document.documentElement
        }

        // Изменение высоты секции. Секцию растим 1:1 с движением курсора
        // (deltaHeight + pageY). Если визуально её нижний край подходит
        // ближе 40px к низу viewport — параллельно докручиваем
        // скролл-контейнер ровно на эту дельту. Если scroll-контейнера нет
        // или он не может прокрутиться дальше — ограничиваем рост секции,
        // чтобы её нижний край не залезал ближе 40px к низу экрана.
        resizeBlock(obj_event) {
            let point = this.getXY(obj_event);
            let newHeight = this.deltaHeight + point[1]
            if (newHeight < 160) return

            sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)

            if (typeof window === 'undefined' || !sectionRef.value) return

            const BOTTOM_MARGIN = 40
            // Сначала пробуем подскроллить ближайший scroll-container,
            // чтобы секция «уехала» вверх и снизу остался 40px.
            const rect = sectionRef.value.getBoundingClientRect()
            const overflow = (rect.top + newHeight) - (window.innerHeight - BOTTOM_MARGIN)
            if (overflow > 0) {
                const scroller = this.findScroller()
                if (scroller) {
                    const before = scroller.scrollTop
                    scroller.scrollTop = before + overflow
                    const actuallyScrolled = scroller.scrollTop - before
                    const remainingOverflow = overflow - actuallyScrolled
                    // Если scroll-container уперся в max и не смог отъехать на
                    // всю величину overflow — урезаем высоту секции на этот
                    // остаток, чтобы нижний край всё равно остался в 40px от
                    // низа viewport. Иначе на низком разрешении или когда
                    // нечего скроллить, секция бы пересекла нижний край.
                    if (remainingOverflow > 0) {
                        const cappedHeight = newHeight - remainingOverflow
                        if (cappedHeight >= 160) {
                            sectionRef.value.style.setProperty('--heightSection', `${cappedHeight}px`)
                        }
                    }
                }
            }
        }
    }

    const resize = ref(new Resize())
</script>
