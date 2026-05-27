<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <div
            class="popup__content"
            :class="{ 'popup__content_top': popup.state.isTop, 'popup__content_fixed': popup.state.isOpen }"
            :style="popup.state.isOpen ? popup.state.fixedStyle : null"
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

    // Fallback стиль, пока applyPosition не отработал. Прячем за viewport,
    // чтобы попап не моргнул в (0,0) или у левого края контейнера.
    const offscreenStyle = {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        right: 'auto',
        bottom: 'auto',
        margin: '0',
        zIndex: 10000
    }

    class Popup {
        constructor(popupRef, contentRef) {
            this.popupRef = popupRef;
            this.contentRef = contentRef

            this.state = reactive({
                isOpen: false,
                isTop: false,
                fixedStyle: offscreenStyle
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
                this.state.fixedStyle = offscreenStyle;
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
                // Сначала пытаемся посчитать в nextTick (Vue уже отрисовал
                // popup_open и контент видим), но НА ВСЯКИЙ — повторяем
                // через rAF: иногда первый getBoundingClientRect отдаёт 0.
                nextTick(() => this.applyPosition());
                requestAnimationFrame(() => this.applyPosition());
            } else {
                this.state.isTop = false
                this.state.fixedStyle = offscreenStyle;
                this._teardownScroll()
                document.removeEventListener('mousedown', this.closeOptions);
                emit('close', true)
            }
        }

        // Меряет позицию anchor и контента, вычисляет фиксированные координаты.
        // Записывает И в reactive state (через :style), И напрямую в DOM —
        // чтобы не зависеть от того, что именно сработает быстрее.
        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 12 && typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(() => this.applyPosition(retry + 1));
                }
                return;
            }

            // Меряем без мигания.
            const prevVisibility = contentEl.style.visibility;
            contentEl.style.visibility = 'hidden';
            // Сбрасываем offscreen, чтобы getBoundingClientRect показал реальные
            // размеры (max-width 200px из css сохраняется).
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
                // Размеры ещё не доехали — пробуем ещё раз.
                contentEl.style.visibility = prevVisibility || '';
                if (retry < 12 && typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(() => this.applyPosition(retry + 1));
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
            const width = contentRect.width || 200;
            const height = contentRect.height || 0;

            // Горизонталь: по умолчанию открываем ВПРАВО от anchor.left.
            // Если не помещается — анкорим к anchor.right (открываем влево).
            // На очень узких viewport — прижимаем к левому краю.
            let left = anchorRect.left;
            if (left + width > viewportRight - 5) {
                left = anchorRect.right - width;
            }
            left = Math.max(5, Math.min(left, viewportRight - width - 5));

            // Вертикаль: по умолчанию вниз. Если не хватает места — вверх.
            const openBelow = !props.isPreventBottom
                && (anchorRect.bottom + height + 5 <= bottomBound);
            const top = openBelow
                ? anchorRect.bottom + 5
                : Math.max(5, anchorRect.top - height - 5);
            this.state.isTop = !openBelow;

            // Пишем И в state (reactive путь), И в DOM (на случай если style-bind
            // не успеет применить inline-style до отрисовки).
            const style = {
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                right: 'auto',
                bottom: 'auto',
                margin: '0',
                zIndex: 10000
            };
            this.state.fixedStyle = style;
            contentEl.style.left = `${left}px`;
            contentEl.style.top = `${top}px`;
            contentEl.style.visibility = prevVisibility || '';

            this._setupScroll();
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
        // Совместимость со старым API (больше не нужен — всегда работаем
        // через position:fixed), но пусть остаётся, чтобы не ломать места,
        // которые этот проп всё ещё передают.
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

    // Если isOpen меняется не через toggleOptions (например, из родителя через
    // popupRef.classList) — всё равно гарантируем пересчёт позиции.
    watch(() => popup.value.state.isOpen, (next) => {
        if (next) {
            nextTick(() => popup.value.applyPosition());
            requestAnimationFrame(() => popup.value.applyPosition());
        }
    })

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (!hasOpenClass && popup.value.state.isOpen) {
                popup.value.state.isOpen = false;
                popup.value.state.isTop = false;
                popup.value.state.fixedStyle = offscreenStyle;
                popup.value._teardownScroll?.();
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
