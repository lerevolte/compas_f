<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <!--
            Содержимое попапа выносим в body через Teleport, иначе любой предок
            с will-change/transform/filter создаёт containing block для position:
            fixed и popup «уезжает» в случайное место относительно этого предка.
            Прокидываем модификатор-классы родительского .popup на сам контент,
            чтобы каскадные стили вида ".popup.settings .popup__content { ... }"
            и т.п. продолжали работать.
        -->
        <Teleport to="body">
            <div
                class="popup__content"
                :class="[popup.state.contentClass, { 'popup__content_top': popup.state.isTop, 'popup__content_open': popup.state.isOpen }]"
                ref="contentRef"
                v-show="popup.state.isOpen"
            >
                <slot name="content"></slot>
            </div>
        </Teleport>
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
                isTop: false,
                // Классы, скопированные с корневого .popup (кроме сервисных
                // popup/popup_open). Нужны, чтобы каскадные стили вида
                // ".my-popup .popup__content { ... }" работали и после
                // переноса контента в body через Teleport — без этого
                // селектор-предок «.my-popup» больше не относится к контенту.
                contentClass: ''
            });

            this.closeOptions = this.closeOptions.bind(this);
            this._scrollHandler = null;
        }

        _syncContentClass() {
            const root = this.popupRef.value;
            if (!root) return;
            const classes = Array.from(root.classList).filter(
                c => c !== 'popup' && c !== 'popup_open'
            );
            this.state.contentClass = classes.join(' ');
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
            this._syncContentClass();
            document.addEventListener('mousedown', this.closeOptions);
            this._scheduleApply();
        }

        _scheduleApply() {
            nextTick(() => this.applyPosition());
            requestAnimationFrame(() => this.applyPosition());
        }

        // Позиционируем popup-контент через position:fixed относительно
        // viewport (top/left считаем от anchorRect, который сам в координатах
        // viewport). Это снимает проблему с обрезкой overflow:hidden у
        // родителей таблиц/секций и позволяет надёжно перевернуть контент
        // вверх или прижать к правому/левому краю в пределах viewport.
        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            // Перед измерением сбрасываем inline-позицию — иначе предыдущее
            // позиционирование на правом/верхнем краю исказит contentRect.
            contentEl.style.left = '0px';
            contentEl.style.right = 'auto';
            contentEl.style.top = '0px';
            contentEl.style.bottom = 'auto';
            contentEl.style.position = 'fixed';

            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            if (!contentRect.width || !contentRect.height) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            const GAP = 5;
            const MARGIN = 5; // отступ от края viewport

            // Вертикальное позиционирование: предпочитаем вниз. Если внизу не
            // помещается (или isPreventBottom) — открываем вверх. Если и сверху
            // не помещается — берём ту сторону, где места больше, и обрезаем по
            // ней через max-height в стилях (.popup__content max-height).
            let bottomBound = window.innerHeight - MARGIN;
            if (props.parentContainer) {
                bottomBound = Math.min(bottomBound, props.parentContainer.getBoundingClientRect().bottom);
            } else {
                const massAction = typeof document !== 'undefined'
                    ? document.querySelector('.mass-action')
                    : null;
                if (massAction) {
                    const r = massAction.getBoundingClientRect();
                    if (r.top > 0 && r.top < bottomBound) bottomBound = r.top - MARGIN;
                }
            }

            const spaceBelow = bottomBound - anchorRect.bottom - GAP;
            const spaceAbove = anchorRect.top - MARGIN - GAP;
            const fitsBelow = contentRect.height <= spaceBelow;
            const fitsAbove = contentRect.height <= spaceAbove;

            let openBelow;
            if (props.isPreventBottom) {
                openBelow = fitsAbove ? false : (fitsBelow ? true : (spaceBelow >= spaceAbove));
            } else {
                openBelow = fitsBelow ? true : (fitsAbove ? false : (spaceBelow >= spaceAbove));
            }
            this.state.isTop = !openBelow;

            let top;
            if (openBelow) {
                top = anchorRect.bottom + GAP;
            } else {
                top = anchorRect.top - GAP - contentRect.height;
                // Если не помещается выше — прижимаем к верхнему краю.
                if (top < MARGIN) top = MARGIN;
            }
            contentEl.style.top = `${Math.round(top)}px`;
            contentEl.style.bottom = 'auto';

            // Горизонтальное позиционирование: по дефолту left анкера.
            // Если уезжает вправо за viewport — выравниваем по правому краю
            // анкера (right-edge alignment). Если и так не помещается —
            // прижимаем к правому краю viewport с отступом.
            let left = anchorRect.left;
            if (left + contentRect.width > window.innerWidth - MARGIN) {
                left = anchorRect.right - contentRect.width;
            }
            if (left + contentRect.width > window.innerWidth - MARGIN) {
                left = window.innerWidth - MARGIN - contentRect.width;
            }
            if (left < MARGIN) left = MARGIN;
            contentEl.style.left = `${Math.round(left)}px`;
            contentEl.style.right = 'auto';

            this._setupScroll();
        }

        _clearStyles() {
            const contentEl = this.contentRef?.value;
            if (!contentEl) return;
            contentEl.style.left = '';
            contentEl.style.right = '';
            contentEl.style.top = '';
            contentEl.style.bottom = '';
            contentEl.style.position = '';
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
