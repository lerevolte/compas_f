<template>
    <div class="form__item form__item_textarea">
        <label :for="props.options.id">
            {{ props.options.title }}
        </label>
        <textarea 
            :id="props.options.id" 
            :name="props.options.name" 
            :placeholder="props.options.placeholder"
            :value="modelValue"
            @input="(event) => emit('update:modelValue', event.target.value)"
        ></textarea>
    </div>
</template>

<script setup>
    import './Textarea.scss';

    const emit = defineEmits([
        'update:modelValue'
    ])
    
    const props = defineProps({
        options: {
            default: {
                 id: 0,
                 title: '',
                 name: '',
                 placeholder: ''
            },
            type: Object
        },
        modelValue: String
    })
</script>
