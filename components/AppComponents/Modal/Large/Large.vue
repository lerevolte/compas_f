<template>
    <dialog class="modal modal_large" :style="`--zIndex: ${props.options.index};`" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <div class="modal__close" @click="emit('close', true)" :style="`--closeColor: ${props.options.color}`">
                <IconClose />
                {{ props.options.title_singular ?? 'Закрыть' }}
            </div>

            <div class="modal__body">
                <slot></slot>
            </div>
        </div>
    </dialog>
</template>

<script setup>
    import './Large.scss';
    
    import IconClose from '@AppIcons/Close.vue';

    const emit = defineEmits([
        'close'
    ])

    const props = defineProps({
        options: {
            default: {
                title: "Закрыть",
                color: "#FFF"
            },
            type: Object
        }
    })
</script>
