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
                this._close();
                return;
            }

            this.state.isOpen = true;
            document.addEventListener('mousedown', this.closeOptions);
            this._scheduleApply();
        }

        _scheduleApply() {
            nextTick(() => this.applyPosition());
            requestAnimationFrame(() => this.applyPosition());
        }

        // Позиционирование через position:absolute относительно .popup-врапа:
        // дефолт — left:0, top:15 (popup рядом с anchor). Если контент уезжает
        // за правый край viewport — переворачиваем (right:0, left:auto).
        // Если внизу мало места — поднимаем вверх через popup__content_top.
        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            // Сбрасываем inline-стили, чтобы CSS дефолты применились заново
            // (на случай повторного открытия после флипа).
            contentEl.style.left = '';
            contentEl.style.right = '';

            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            if (!contentRect.width || !contentRect.height) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            // Горизонтальный флип: если popup от anchor.left уезжает за правый
            // край viewport, привязываем правый край к anchor.right.
            const overflowsRight = anchorRect.left + contentRect.width > window.innerWidth - 5;
            if (overflowsRight) {
                contentEl.style.left = 'auto';
                contentEl.style.right = '0';
            } else {
                contentEl.style.left = '0';
                contentEl.style.right = 'auto';
            }

            // Вертикальный флип: если ниже не хватает места (с учётом панели
            // массовых действий), открываем вверх через popup__content_top.
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

            const openBelow = !props.isPreventBottom
                && (anchorRect.bottom + contentRect.height + 5 <= bottomBound);
            this.state.isTop = !openBelow;

            this._setupScroll();
        }

        _clearStyles() {
            const contentEl = this.contentRef?.value;
            if (!contentEl) return;
            contentEl.style.left = '';
            contentEl.style.right = '';
            contentEl.style.top = '';
            contentEl.style.bottom = '';
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

    watch(() => popup.value.state.isOpen, (next) => {
        if (next) popup.value._scheduleApply();
    })

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (!hasOpenClass && popup.value.state.isOpen) {
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
