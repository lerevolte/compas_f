<template>
    <div class="form__item form__item_colorpicker">
        <label class="blank__title" v-if="props.options.title && props.options.title != ''">
            <span>
                {{ props.options.title }}
            </span>
        </label>

        <AppPopup class="colorpicker" :style="`--colorValue: ${props.modelValue}`" :isPreventBottom="true" :ignoreSelectors="['colorpicker']">
            <template #header>
                <div class="colorpicker__summary">
                    <slot name="icon"></slot>
                </div>
            </template>
            <template #content>
                <div class="colorpicker__preview">
                    <slot name="preview"></slot>
                </div>
                <ColorPicker 
                    :color="props.modelValue"
                    default-format="hex"
                    :visible-formats="['hex']"
                    @color-change="(eventData) => emit('update:modelValue', eventData.cssColor)"
                />
                <AppButton class="button_fill" v-if="props.options.isCanCreate">
                    Применить
                </AppButton>
            </template>
        </AppPopup>
    </div>
</template>

<script setup>
    import './ColorPicker.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import { ColorPicker } from 'vue-accessible-color-picker'
    import 'vue-accessible-color-picker/styles'
    import AppButton from '@AppComponents/Button/Button.vue'

    const props = defineProps({
        modelValue: {
            default: '#b6b6b6',
            type: String
        },
        options: {
            default: {
                title: '',
                isCanCreate: false
            }
        }
    })

    const emit = defineEmits([
        'update:modelValue'
    ])
</script>
