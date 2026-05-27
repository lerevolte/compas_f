<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <!--
            forceFloating: всегда телепортируем content в body — обходим
            ситуацию, когда .table { contain: layout paint } делает position:fixed
            «контейнером» и popup всё равно клипается.
        -->
        <Teleport v-if="props.forceFloating" to="body">
            <div
                v-show="popup.state.isOpen"
                class="popup__content popup__content_floating"
                :class="{
                    'popup__content_top': popup.state.isTop,
                    'popup_open': popup.state.isOpen
                }"
                :style="popup.state.floatingStyle || floatingFallbackStyle"
                ref="contentRef"
            >
                <slot name="content"></slot>
            </div>
        </Teleport>
        <div
            v-else
            class="popup__content"
            :class="{
                'popup__content_top': popup.state.isTop,
                'popup__content_floating': popup.state.useFloating,
                'popup_open': popup.state.useFloating && popup.state.isOpen
            }"
            :style="popup.state.useFloating ? popup.state.floatingStyle : null"
            ref="contentRef"
        >
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script setup>
    import './Popup.scss';

    const popupRef = ref(null)
    const contentRef = ref(null)
    const classObserver = ref(null)

    const emit = defineEmits([
        'close'
    ])

    class Popup {
        constructor(popupRef, contentRef) {
            this.popupRef = popupRef;
            this.contentRef = contentRef

            this.state = reactive({
                isOpen: false,
                isTop: false,
                useFloating: false,
                floatingStyle: null
            });

            // Закрытие опций
            this.closeOptions = this.closeOptions.bind(this);
            this._floatingScrollHandler = null;
        }

        closeOptions(event) {          
            
            if (!this.popupRef.value) return;

            for (const sel of props.ignoreSelectors) {
                const el = document.querySelector(sel);
                if (el && el.contains(event.target)) {
                    return;
                }
            }

            // В режиме floating контент рендерится через position: fixed и DOM-узел
            // лежит вне popupRef-поддерева для целей hit-test'а? Нет, всё ещё внутри
            // popupRef, но визуально выше. Проверяем по contentRef отдельно.
            const insidePopup = this.popupRef.value.contains(event.target);
            const insideContent = this.contentRef?.value?.contains?.(event.target);
            if (!insidePopup && !insideContent) {
                this.state.isOpen = false;
                this.state.isTop = false
                this.state.useFloating = false
                this.state.floatingStyle = null
                this._teardownFloatingScroll()
                document.removeEventListener('mousedown', this.closeOptions);
                emit('close', true)
            }
        }

        toggleOptions(event) {
            if (this.state.isOpen) {
                const classList = Array.from(event.target.closest('.popup').classList)
                if (classList.some(className => props.ignoreSelectors.includes(className))) {
                    return;
                }
            }

            this.state.isOpen = !this.state.isOpen;
            if (this.state.isOpen) {
                document.addEventListener('mousedown', this.closeOptions);
                nextTick(() => this.checkPosition());
            } else {
                this.state.isTop = false
                this.state.useFloating = false
                this.state.floatingStyle = null
                this._teardownFloatingScroll()
                document.removeEventListener('mousedown', this.closeOptions);
                emit('close', true)
            }
        }

        checkPosition() {
            if (!this.popupRef || !this.contentRef) return;
            let bottomBound;
            if (props.parentContainer) {
                bottomBound = props.parentContainer.getBoundingClientRect().bottom;
            } else {
                // Учитываем плавающую панель массовых действий внизу страницы.
                bottomBound = window.innerHeight;
                if (typeof document !== 'undefined') {
                    const massAction = document.querySelector('.mass-action');
                    if (massAction) {
                        const massRect = massAction.getBoundingClientRect();
                        if (massRect.top > 0 && massRect.top < bottomBound) {
                            bottomBound = massRect.top;
                        }
                    }
                }
            }
            const contentRect = contentRef.value.getBoundingClientRect();
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > bottomBound;

            // Если popup живёт внутри прокручиваемого/обрезающего родителя
            // (например, виртуализированная таблица), переключаем content в режим
            // position: fixed и сами позиционируем поверх — иначе попап обрезается.
            this.updateFloatingPosition(bottomBound);
        }

        // Включает «плавающее» позиционирование, когда обычный absolute обрезается
        // ближайшим overflow-scroll-родителем, и пересчитывает координаты.
        updateFloatingPosition(bottomBound) {
            if (!this.popupRef.value || !this.contentRef.value) return;
            if (typeof window === 'undefined') return;

            const needFloating = !!props.forceFloating || this._hasClippingAncestor(this.popupRef.value);
            this.state.useFloating = needFloating;

            if (!needFloating) {
                this.state.floatingStyle = null;
                this._teardownFloatingScroll();
                return;
            }

            this._recalcFloatingStyle(bottomBound);
            this._setupFloatingScroll();
        }

        _recalcFloatingStyle(bottomBound) {
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) return;
            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            const viewportRight = window.innerWidth;
            const viewportBottom = bottomBound ?? window.innerHeight;

            const width = contentRect.width || 200;
            const height = contentRect.height || 0;

            let left = anchorRect.left;
            if (left + width > viewportRight - 5) {
                left = Math.max(5, anchorRect.right - width);
            }

            // В floating-режиме решение «вниз/вверх» принимаем по реальному
            // положению якоря в viewport, а не по устаревшему isTop из абсолютного
            // позиционирования (тот меряет высоту от старого места).
            const openBelow = anchorRect.bottom + height + 5 <= viewportBottom;
            const top = openBelow
                ? anchorRect.bottom + 5
                : Math.max(5, anchorRect.top - height - 5);
            this.state.isTop = !openBelow;

            this.state.floatingStyle = {
                position: 'fixed',
                left: `${Math.max(5, left)}px`,
                top: `${top}px`,
                right: 'auto',
                bottom: 'auto',
                margin: '0'
            };
        }

        _hasClippingAncestor(el) {
            let node = el?.parentElement;
            while (node && node !== document.body) {
                const style = window.getComputedStyle(node);
                const ox = style.overflowX;
                const oy = style.overflowY;
                if (
                    (ox !== 'visible' && ox) ||
                    (oy !== 'visible' && oy) ||
                    (style.transform && style.transform !== 'none') ||
                    (style.filter && style.filter !== 'none') ||
                    (style.contain && /\b(layout|paint|strict|content)\b/.test(style.contain))
                ) {
                    return true;
                }
                node = node.parentElement;
            }
            return false;
        }

        _setupFloatingScroll() {
            if (this._floatingScrollHandler) return;
            this._floatingScrollHandler = () => {
                if (!this.state.isOpen) return;
                this._recalcFloatingStyle();
            };
            window.addEventListener('scroll', this._floatingScrollHandler, true);
            window.addEventListener('resize', this._floatingScrollHandler);
        }

        _teardownFloatingScroll() {
            if (!this._floatingScrollHandler) return;
            window.removeEventListener('scroll', this._floatingScrollHandler, true);
            window.removeEventListener('resize', this._floatingScrollHandler);
            this._floatingScrollHandler = null;
        }
    }

    const props = defineProps({
        parentContainer: {
            default: null
        },
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        // Принудительно включает floating-режим (position: fixed + Teleport),
        // даже если эвристика поиска clip-родителя не сработала. Нужно для
        // action-меню в строках таблиц, где table имеет contain:layout и обычный
        // position:fixed клипается.
        forceFloating: {
            default: false,
            type: Boolean
        },
        ignoreSelectors: {
            type: Array,
            default: () => []
        }
    })

    const popup = ref(new Popup(popupRef, contentRef))

    // Стиль на случай если floatingStyle ещё не пересчитан (первый кадр).
    // Прячем content за пределами экрана, чтобы он не мигал в (0,0).
    const floatingFallbackStyle = {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        right: 'auto',
        bottom: 'auto',
        margin: '0'
    }

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (!hasOpenClass && popup.value.state.isOpen) {
                popup.value.state.isOpen = false;
                popup.value.state.isTop = false;
                document.removeEventListener('mousedown', popup.value.closeOptions);
                emit('close', true)
            }
        });

        classObserver.value.observe(popupRef.value, { attributes: true, attributeFilter: ['class'] });
    })

    onBeforeUnmount(() => {
        if (classObserver.value) classObserver.value.disconnect();
        document.removeEventListener('mousedown', popup.value.closeOptions);
        popup.value._teardownFloatingScroll?.();
    })

    defineExpose({ popup });
</script>
