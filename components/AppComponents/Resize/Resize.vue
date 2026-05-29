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

        // Изменение высоты секции. Секцию растим 1:1 с движением курсора
        // (deltaHeight + pageY). Если визуально её нижний край подходит
        // ближе 40px к низу viewport — параллельно докручиваем
        // скролл-контейнер (.page) ровно на эту дельту, чтобы визуально
        // между нижним краем секции и нижним краем экрана всегда оставалось
        // ≥40px. deltaHeight за скролл НЕ компенсируем — иначе секция
        // начинает расти быстрее курсора.
        resizeBlock(obj_event) {
            let point = this.getXY(obj_event);
            let newHeight = this.deltaHeight + point[1]
            if (newHeight < 160) return

            sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)

            if (typeof window !== 'undefined' && sectionRef.value) {
                const BOTTOM_MARGIN = 40
                const rect = sectionRef.value.getBoundingClientRect()
                const sectionBottom = rect.top + newHeight
                const overflow = sectionBottom - (window.innerHeight - BOTTOM_MARGIN)
                if (overflow > 0) {
                    const scroller = sectionRef.value.closest?.('.page') || document.scrollingElement
                    if (scroller) scroller.scrollTop = scroller.scrollTop + overflow
                }
            }
        }
    }

    const resize = ref(new Resize())
</script>
