<template>
    <dialog class="modal modal_large" :style="`--zIndex: ${props.options.index};`" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <div class="modal__close" @click="emit('close', true)" :style="`--closeColor: ${props.options.color ?? '#2AA7FF'}`">
                <IconClose />
                {{ props.options.title_singular ?? 'Закрыть' }}
            </div>

            <div class="modal__body">
                <slot></slot>
            </div>

            <div :id="massActionId" class="modal__mass-action"></div>
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

    // Контейнер для MassAction, который VirtualTable телепортирует через
    // inject. Без этого таблица телепортирует в #mass-action-container
    // на корне, и панель сохранения прячется под модалкой (detail__overlay
    // имеет z-index 1001, mass-action-container — 1000).
    const massActionId = `mass-action-modal-${Math.random().toString(36).slice(2, 9)}`
    provide('massActionTarget', `#${massActionId}`)
</script>
