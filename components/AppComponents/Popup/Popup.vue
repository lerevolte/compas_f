<template>
    <div class="popup" ref="popupRef" :data-popup-id="popupUid" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <Teleport to="body">
            <div
                class="popup__content"
                :data-popup-owner="popupUid"
                :class="[popup.state.contentClass, { 'popup__content_top': popup.state.isTop, 'popup__content_open': popup.state.isOpen }]"
                ref="contentRef"
                @click="popup.onContentClick($event)"
            >
                <slot name="content"></slot>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
    import './Popup.scss';
    import { ref, reactive, nextTick, onMounted, onBeforeUnmount, watch, markRaw, useId } from 'vue'

    const popupRef = ref(null)
    const contentRef = ref(null)
    const classObserver = ref(null)
    const popupUid = useId()

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

        onContentClick(event) {
            const option = event?.target?.closest?.('.popup__option');
            if (!option) return;
            if (option.dataset && option.dataset.popupStay != null) return;
            if (option.dataset && option.dataset.popupClose != null) { this._close(); return; }
            const stayClasses = [
                'popup__option_checkbox',
                'popup__option_disable',
                'popup__option_empty',
                'popup__option_stay',
                'settings__item_submenu',
                'settings__item_back'
            ];
            for (const cls of stayClasses) {
                if (option.classList.contains(cls)) return;
            }
            this._close();
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
            nextTick(() => requestAnimationFrame(() => this.applyPosition()));
        }

        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            contentEl.style.left = '0px';
            contentEl.style.right = 'auto';
            contentEl.style.top = '0px';
            contentEl.style.bottom = 'auto';
            contentEl.style.position = 'fixed';

            const anchorRect = headerEl.getBoundingClientRect();
            if (!anchorRect.width && !anchorRect.height) {
                this._close();
                return;
            }
            const contentRect = contentEl.getBoundingClientRect();
            if (!contentRect.width || !contentRect.height) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            const GAP = 5;
            const MARGIN = 5;

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
                if (top < MARGIN) top = MARGIN;
            }
            contentEl.style.top = `${Math.round(top)}px`;
            contentEl.style.bottom = 'auto';

            let left;
            if (props.align === 'right') {
                left = anchorRect.right - contentRect.width;
                if (left < MARGIN) left = anchorRect.left;
            } else {
                left = anchorRect.left;
                if (left + contentRect.width > window.innerWidth - MARGIN) {
                    left = anchorRect.right - contentRect.width;
                }
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
        align: {
            default: 'left',
            type: String
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

    const popup = ref(markRaw(new Popup(popupRef, contentRef)))

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
