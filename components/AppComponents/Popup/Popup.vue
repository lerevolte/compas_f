<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <div
            class="popup__content"
            :class="{ 'popup__content_top': popup.state.isTop }"
            ref="contentRef"
        >
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script setup>
    import './Popup.scss';
    import { ref, reactive, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'

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
                isTop: false
            });

            this.closeOptions = this.closeOptions.bind(this);
            this._scrollHandler = null;
            this._rafId = null;
        }

        closeOptions(event) {
            if (!this.popupRef.value) return;

            for (const sel of props.ignoreSelectors) {
                const el = document.querySelector(sel);
                if (el && el.contains(event.target)) return;
            }

            const insidePopup = this.popupRef.value.contains(event.target);
            const insideContent = this.contentRef?.value?.contains?.(event.target);
            if (!insidePopup && !insideContent) {
                this._close();
            }
        }

        _close() {
            this.state.isOpen = false;
            this.state.isTop = false;
            this._teardownScroll();
            this._clearStyles();
            document.removeEventListener('mousedown', this.closeOptions);
            emit('close', true);
        }

        toggleOptions(event) {
            if (this.state.isOpen) {
                const classList = Array.from(event.target.closest('.popup').classList)
                if (classList.some(className => props.ignoreSelectors.includes(className))) {
                    return;
                }
            }

            if (this.state.isOpen) {
                this._close();
                return;
            }

            this.state.isOpen = true;
            document.addEventListener('mousedown', this.closeOptions);
            this._scheduleApply();
        }

        // Несколько попыток рассчитать позицию: nextTick (после Vue render),
        // двойной rAF (после layout) и финальный setTimeout 50ms на случай
        // медленных дочерних компонентов.
        _scheduleApply() {
            nextTick(() => this.applyPosition());
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this.applyPosition());
            });
            setTimeout(() => this.applyPosition(), 50);
        }

        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 20) {
                    this._rafId = requestAnimationFrame(() => this.applyPosition(retry + 1));
                }
                return;
            }

            // Принудительно показываем контент (на случай если CSS .popup_open
            // .popup__content { display: flex } по какой-то причине не сработал).
            if (contentEl.style.display !== 'flex') {
                contentEl.style.display = 'flex';
            }
            // Сброс позиции, чтобы getBoundingClientRect отдал реальные размеры.
            const prevVis = contentEl.style.visibility;
            contentEl.style.visibility = 'hidden';
            contentEl.style.position = 'fixed';
            contentEl.style.left = '0px';
            contentEl.style.top = '0px';
            contentEl.style.right = 'auto';
            contentEl.style.bottom = 'auto';
            contentEl.style.margin = '0';
            contentEl.style.zIndex = '10000';

            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            if (!contentRect.width || !contentRect.height) {
                contentEl.style.visibility = prevVis || '';
                if (retry < 20) {
                    this._rafId = requestAnimationFrame(() => this.applyPosition(retry + 1));
                }
                return;
            }

            let bottomBound;
            if (props.parentContainer) {
                bottomBound = props.parentContainer.getBoundingClientRect().bottom;
            } else {
                bottomBound = window.innerHeight;
                const massAction = typeof document !== 'undefined'
                    ? document.querySelector('.mass-action')
                    : null;
                if (massAction) {
                    const r = massAction.getBoundingClientRect();
                    if (r.top > 0 && r.top < bottomBound) bottomBound = r.top;
                }
            }
            const viewportRight = window.innerWidth;
            const width = contentRect.width;
            const height = contentRect.height;

            // Горизонталь: по умолчанию вправо от anchor.left.
            // Если не помещается — влево от anchor.right.
            // Clamp в окно [5, viewportRight - width - 5].
            let left = anchorRect.left;
            if (left + width > viewportRight - 5) {
                left = anchorRect.right - width;
            }
            left = Math.max(5, Math.min(left, viewportRight - width - 5));

            // Вертикаль: предпочтительно вниз, иначе вверх (если хватает места).
            const openBelow = !props.isPreventBottom
                && (anchorRect.bottom + height + 5 <= bottomBound);
            const top = openBelow
                ? anchorRect.bottom + 5
                : Math.max(5, anchorRect.top - height - 5);
            this.state.isTop = !openBelow;

            contentEl.style.left = `${left}px`;
            contentEl.style.top = `${top}px`;
            contentEl.style.visibility = prevVis || '';

            this._setupScroll();
        }

        _clearStyles() {
            const contentEl = this.contentRef?.value;
            if (!contentEl) return;
            contentEl.style.position = '';
            contentEl.style.left = '';
            contentEl.style.top = '';
            contentEl.style.right = '';
            contentEl.style.bottom = '';
            contentEl.style.margin = '';
            contentEl.style.zIndex = '';
            contentEl.style.display = '';
            contentEl.style.visibility = '';
            if (this._rafId) {
                cancelAnimationFrame(this._rafId);
                this._rafId = null;
            }
        }

        _setupScroll() {
            if (this._scrollHandler) return;
            this._scrollHandler = () => {
                if (!this.state.isOpen) return;
                this.applyPosition();
            };
            window.addEventListener('scroll', this._scrollHandler, true);
            window.addEventListener('resize', this._scrollHandler);
        }

        _teardownScroll() {
            if (!this._scrollHandler) return;
            window.removeEventListener('scroll', this._scrollHandler, true);
            window.removeEventListener('resize', this._scrollHandler);
            this._scrollHandler = null;
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

    // Подстраховка: если кто-то сменит isOpen в обход toggleOptions
    // (например, через popupRef.classList.add('popup_open')).
    watch(() => popup.value.state.isOpen, (next) => {
        if (next) popup.value._scheduleApply();
    })

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (hasOpenClass && !popup.value.state.isOpen) {
                // Класс добавили извне — синхронизируем state и считаем позицию.
                popup.value.state.isOpen = true;
                document.addEventListener('mousedown', popup.value.closeOptions);
                popup.value._scheduleApply();
            } else if (!hasOpenClass && popup.value.state.isOpen) {
                popup.value._close();
            }
        });

        classObserver.value.observe(popupRef.value, { attributes: true, attributeFilter: ['class'] });
    })

    onBeforeUnmount(() => {
        if (classObserver.value) classObserver.value.disconnect();
        document.removeEventListener('mousedown', popup.value.closeOptions);
        popup.value._teardownScroll?.();
    })

    defineExpose({ popup });
</script>
