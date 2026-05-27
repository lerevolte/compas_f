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
                this.state.isOpen = false;
                this.state.isTop = false
                this._teardownScroll()
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
                // Дважды nextTick: даём Vue показать content (.popup_open),
                // потом измеряем и позиционируем.
                nextTick(() => nextTick(() => this.applyPosition()));
            } else {
                this.state.isTop = false
                this._teardownScroll()
                this._clearStyles()
                document.removeEventListener('mousedown', this.closeOptions);
                emit('close', true)
            }
        }

        // Вычисляет позицию контента в координатах viewport и пишет её
        // прямо в style контента. Position: fixed, чтобы попап «выходил»
        // из любых overflow-родителей (таблица и пр.).
        applyPosition(retry = 0) {
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 8 && typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(() => this.applyPosition(retry + 1));
                }
                return;
            }

            // Сначала сбрасываем фикс-позицию, чтобы померить контент в реальной
            // ширине. Также прячем для «без мигания».
            const prevVisibility = contentEl.style.visibility;
            contentEl.style.position = 'fixed';
            contentEl.style.visibility = 'hidden';
            contentEl.style.left = '0px';
            contentEl.style.top = '0px';
            contentEl.style.right = 'auto';
            contentEl.style.bottom = 'auto';
            contentEl.style.margin = '0';
            contentEl.style.zIndex = '10000';

            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();

            // Нижняя граница: учитываем плавающую панель массовых действий.
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
            const width = contentRect.width || 200;
            const height = contentRect.height || 0;

            let left = anchorRect.left;
            if (left + width > viewportRight - 5) {
                left = Math.max(5, anchorRect.right - width);
            }
            left = Math.max(5, left);

            const openBelow = !props.isPreventBottom
                && (anchorRect.bottom + height + 5 <= bottomBound);
            const top = openBelow
                ? anchorRect.bottom + 5
                : Math.max(5, anchorRect.top - height - 5);
            this.state.isTop = !openBelow;

            contentEl.style.left = `${left}px`;
            contentEl.style.top = `${top}px`;
            contentEl.style.visibility = prevVisibility || '';

            // Подписываемся на скролл/resize чтобы попап ехал вместе с anchor.
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
            contentEl.style.visibility = '';
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
        // Совместимость с прежним API — теперь не нужен (всегда работаем
        // через position:fixed), но оставлен, чтобы не ломать существующие
        // места, где он передаётся.
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

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (!hasOpenClass && popup.value.state.isOpen) {
                popup.value.state.isOpen = false;
                popup.value.state.isTop = false;
                popup.value._teardownScroll?.();
                popup.value._clearStyles?.();
                document.removeEventListener('mousedown', popup.value.closeOptions);
                emit('close', true)
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
