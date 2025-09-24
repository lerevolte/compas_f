<template>
    <dialog class="modal modal_large" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <div class="modal__close" @click="emit('close', true)">
                <IconClose />
                Закрыть
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
</script>
