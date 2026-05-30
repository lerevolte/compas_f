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

                // Финальная корректировка: даже если в процессе быстрого
                // drag'а нижний край секции «проскочил» в нижние 40px
                // viewport (mousemove'ов было мало и scroll не успел
                // отыграть полностью) — здесь точно ставим section.bottom =
                // viewport - 40, добавляя спейсер/скролл или урезая высоту.
                // Делаем 2 прохода через rAF, чтобы layout успел применить
                // все промежуточные изменения (height из CSS-переменной,
                // scrollTop из ensureSpacer, и т.п.).
                this._snapToBottomMargin()
                requestAnimationFrame(() => {
                    this._snapToBottomMargin()
                    requestAnimationFrame(() => {
                        this._snapToBottomMargin()
                        this._compactSpacerToFinal()
                    })
                })

                emit('endResize', sectionRef.value.offsetHeight)
            }
        }

        // Гарантирует, что в момент завершения drag'а нижний край секции
        // ровно в BOTTOM_MARGIN от низа viewport: сперва пробуем
        // подкорректировать через spacer + scroll, если не помогает —
        // подрезаем высоту секции.
        _snapToBottomMargin() {
            if (typeof window === 'undefined' || !sectionRef.value) return
            const BOTTOM_MARGIN = 40
            let height = sectionRef.value.offsetHeight
            const rect = sectionRef.value.getBoundingClientRect()
            let overflow = (rect.top + height) - (window.innerHeight - BOTTOM_MARGIN)
            if (overflow <= 0) return

            const scrollers = this.findScrollers()
            const primary = scrollers[0] || document.scrollingElement
            if (primary) this._ensureSpacer(primary, overflow)

            for (const scroller of scrollers) {
                if (overflow <= 0) break
                const before = scroller.scrollTop
                scroller.scrollTop = before + overflow
                const actuallyScrolled = scroller.scrollTop - before
                if (actuallyScrolled > 0) overflow -= actuallyScrolled
            }
            if (overflow > 0 && typeof window.scrollBy === 'function') {
                const before = window.scrollY
                window.scrollBy(0, overflow)
                overflow -= (window.scrollY - before)
            }
            if (overflow > 0) {
                const capped = height - overflow
                sectionRef.value.style.setProperty(
                    '--heightSection',
                    `${capped >= 160 ? capped : 160}px`
                )
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

        // Собираем все scroll-able ancestors. Когда секция растёт и упирается
        // в нижний край viewport, мы по очереди пробуем подкрутить каждого
        // из кандидатов: какой первый смог сдвинуться — тот и наш scroller.
        // Это надёжнее одного хардкоженного селектора: разные layouts
        // (grid/flex/sticky-headers) делают «настоящий» scroll-родитель
        // разным.
        findScrollers() {
            const scrollers = []
            if (sectionRef.value) {
                let el = sectionRef.value.parentElement
                while (el && el !== document.body && el !== document.documentElement) {
                    const cs = window.getComputedStyle(el)
                    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
                        scrollers.push(el)
                    }
                    el = el.parentElement
                }
            }
            // Документ — последняя соломинка, если ничего внутри не скроллится.
            if (document.scrollingElement) scrollers.push(document.scrollingElement)
            return scrollers
        }

        // Изменение высоты секции.
        // 1) Растим секцию (newHeight = deltaHeight + pageY).
        // 2) Если нижний край секции вышел за (viewport - 40px) — сначала
        //    форсируем scroll-контейнеру возможность скроллиться, добавив
        //    спейсер высотой overflow в его конец. Без спейсера .page
        //    с grid+max-height иногда не наращивает scrollHeight автоматом
        //    под рост вложенного flex-контента, и scrollTop отказывается
        //    двигаться. Затем по очереди скроллим всех scroll-предков.
        // 3) Что не «отъехало» — урезаем из высоты секции, чтобы нижний край
        //    всегда оставался в 40px от низа viewport.
        resizeBlock(obj_event) {
            const BOTTOM_MARGIN = 40

            let point = this.getXY(obj_event);
            let newHeight = this.deltaHeight + point[1]
            if (newHeight < 160) return

            sectionRef.value.style.setProperty("--heightSection", `${newHeight}px`)

            if (typeof window === 'undefined' || !sectionRef.value) return

            // Force reflow.
            // eslint-disable-next-line no-unused-expressions
            sectionRef.value.offsetHeight

            const rect = sectionRef.value.getBoundingClientRect()
            let overflow = (rect.top + newHeight) - (window.innerHeight - BOTTOM_MARGIN)
            if (overflow <= 0) return

            // Гарантируем scrollable-room у скролл-контейнера: добавляем (или
            // обновляем) спейсер-див под секцией. Он живёт внутри ближайшего
            // scroll-предка (обычно .page) и удаляется на endResize. Без
            // этого .page (max-height:100vh + grid) иногда не понимает, что
            // нужно увеличить scrollHeight под выросшее содержимое.
            const scrollers = this.findScrollers()
            const primary = scrollers[0] || document.scrollingElement
            if (primary) this._ensureSpacer(primary, overflow)

            // Скроллим. По очереди — первый, кто реально сдвинется, тот и наш.
            for (const scroller of scrollers) {
                if (overflow <= 0) break
                const before = scroller.scrollTop
                scroller.scrollTop = before + overflow
                const actuallyScrolled = scroller.scrollTop - before
                if (actuallyScrolled > 0) overflow -= actuallyScrolled
            }
            if (overflow > 0 && typeof window.scrollBy === 'function') {
                const before = window.scrollY
                window.scrollBy(0, overflow)
                overflow -= (window.scrollY - before)
            }

            if (overflow > 0) {
                const capped = newHeight - overflow
                sectionRef.value.style.setProperty(
                    '--heightSection',
                    `${capped >= 160 ? capped : 160}px`
                )
            }
        }

        // Добавляем/обновляем «спейсер» — пустой блок, который добавляет
        // вертикальную высоту в scroll-контейнер, чтобы он мог скроллиться.
        // .page часто имеет display:grid с max-height:100vh и при росте
        // секции не наращивает scrollHeight автоматически. Спейсер кладём
        // в <main> (если есть, это flex-column ребёнок .page) — так высота
        // в любом случае добавится к scroll-контенту, не ломая grid-сетку.
        _ensureSpacer(scroller, neededExtraScroll) {
            if (!scroller) return
            const existing = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
            if (existing >= neededExtraScroll) return
            const need = neededExtraScroll - existing

            const host = scroller.querySelector('main') || scroller
            if (!this._spacerEl || !host.contains(this._spacerEl)) {
                this._spacerEl = document.createElement('div')
                this._spacerEl.setAttribute('data-resize-spacer', '1')
                this._spacerEl.style.cssText = 'width:100%;flex-shrink:0;pointer-events:none;'
                host.appendChild(this._spacerEl)
                this._spacerHeight = 0
            }
            this._spacerHeight = (this._spacerHeight || 0) + need
            this._spacerEl.style.height = `${this._spacerHeight}px`
            // Запоминаем scroller — нужен для нормализации высоты спейсера
            // в _compactSpacerToFinal на endResize.
            this._scroller = scroller
        }

        _removeSpacer() {
            if (this._spacerEl && this._spacerEl.parentNode) {
                this._spacerEl.parentNode.removeChild(this._spacerEl)
            }
            this._spacerEl = null
            this._spacerHeight = 0
        }

        // На релизе нормализуем размер спейсера так, чтобы maxScroll у
        // scroll-контейнера был ровно равен текущему scrollTop. То есть
        // страница «как бы» прокручена до самого низа, и при дальнейшем
        // отпускании мыши секция не теряет 40px gap и не появляется
        // «лишнего» серого свободного места под секцией.
        _compactSpacerToFinal() {
            if (!this._spacerEl || typeof window === 'undefined') return
            const scroller = this._scroller || document.scrollingElement
            if (!scroller) return

            // Расчёт: scrollHeight без спейсера = scrollHeight - spacerHeight.
            // Нужно: scrollHeight_final = scrollTop + clientHeight (max=scrollTop).
            // => нужный spacer = max(0, (scrollTop+clientHeight) - (scrollHeight - currentSpacer)).
            const currentSpacer = this._spacerHeight || 0
            const naturalScrollHeight = scroller.scrollHeight - currentSpacer
            const targetScrollHeight = scroller.scrollTop + scroller.clientHeight
            const need = Math.max(0, targetScrollHeight - naturalScrollHeight)

            if (need <= 0) {
                this._removeSpacer()
                return
            }
            this._spacerHeight = need
            this._spacerEl.style.height = `${need}px`
        }
    }

    const resize = ref(new Resize())
</script>
