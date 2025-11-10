<template>
    <div class="form__item form__item_checkbox" :class="{ 'form__item_checkbox_disabled': props.options.disabled }">
        <label>
            <div class="checkbox__input">
                <input type="checkbox" :disabled="props.options.disabled" :checked="modelValue" @change="(event) => emit('update:modelValue', event.target.checked)">
                <span class="checkbox__custom"></span>
            </div>
            <span class="checkbox__label">{{ props.options.title }}</span>
        </label>
    </div>
</template>

<script setup>
    import './Checkbox.scss';
    
    const emit = defineEmits([
        'update:modelValue'
    ])

    const props = defineProps({
        modelValue: null,
        options: {
            default: {
                title: '',
                disabled: false
            },
            type: Object
        }
    })
</script>
