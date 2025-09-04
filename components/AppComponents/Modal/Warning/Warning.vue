<template>
    <dialog class="modal modal_warning" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <IconClose class="modal__close" @click="emit('close', true)" />

            <AppH2>
                {{ props.options.title }}
            </AppH2>


            <template v-if="props.options.template == 'text'">
                <p class="modal__text">
                    {{ props.options.desc }}
                </p>
            </template>
            <template v-else-if="props.options.template == 'slot'">
                <slot></slot>
            </template>


            <div class="modal__buttons">
                <AppButton 
                    class="button_fill" 
                    :class="[`button_${props.options.type}`, {'skeleton' : props.loading}]" 
                    @click="emit(props.options.action, props.options.value)">
                    {{ props.options.actionTitle }}
                </AppButton>
                <AppButton @click="emit('close', true)">
                    Отмена
                </AppButton>
            </div>
        </div>
    </dialog>
</template>

<script setup>
    import './Warning.scss';
    
    import IconClose from '@AppIcons/Close.vue';
    import AppH2 from '@AppComponents/Headers/H2/H2.vue';
    import AppButton from '@AppComponents/Button/Button.vue';

    const emit = defineEmits([
        'close',
        'action'
    ])

    const props = defineProps({
        options: {
            default: {
                title: '',
                desc: '',
                value: null,
                type: 'warning',
                action: 'submit',
                actionTitle: 'Принять',
                template: 'text'
            },
            type: Object
        },
        loading: {
            default: false,
            type: Boolean
        }
    })
</script>
