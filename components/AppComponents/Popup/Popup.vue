<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <div class="popup__content" :class="{ 'popup__content_top': popup.state.isTop }" ref="contentRef">
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
                isTop: false
            });

            // Закрытие опций
            this.closeOptions = this.closeOptions.bind(this);
        }

        closeOptions(event) {          
            
            if (!this.popupRef.value) return;

            for (const sel of props.ignoreSelectors) {
                const el = document.querySelector(sel);
                if (el && el.contains(event.target)) {
                    return;
                }
            }

            if (!this.popupRef.value.contains(event.target)) {
                this.state.isOpen = false;
                this.state.isTop = false
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
                document.removeEventListener('mousedown', this.closeOptions);
                emit('close', true)
            }
        }

        checkPosition() {
            if (!this.popupRef || !this.contentRef) return;
            const parentRect = props.parentContainer ? props.parentContainer.getBoundingClientRect() : this.popupRef.getBoundingClientRect();
            const contentRect = contentRef.value.getBoundingClientRect();
            this.state.isTop = props.isPreventBottom ? false : contentRect.bottom > parentRect.bottom;
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
                document.removeEventListener('mousedown', popup.value.closeOptions);
                emit('close', true)
            }
        });

        classObserver.value.observe(popupRef.value, { attributes: true, attributeFilter: ['class'] });
    })

    onBeforeUnmount(() => {
        if (classObserver.value) classObserver.value.disconnect();
        document.removeEventListener('mousedown', popup.value.closeOptions);
    })

    defineExpose({ popup });
</script>
