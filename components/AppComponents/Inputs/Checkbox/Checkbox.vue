<template>
    <div class="form__item form__item_checkbox">
        <label>
            <div class="checkbox__input">
                <input type="checkbox" :checked="modelValue" @change="(event) => emit('update:modelValue', event.target.checked)">
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
                title: ''
            },
            type: Object
        }
    })
</script>
