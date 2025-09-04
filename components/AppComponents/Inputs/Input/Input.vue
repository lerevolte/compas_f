<template>
    <div class="form__item form__item_input">
        <label :for="props.options.id">
            <span>{{ props.options.title }}</span>
        </label>
        <input 
            :id="props.options.id" 
            :name="props.options.name" 
            :type="props.options.type" 
            :placeholder="props.options.placeholder"
            :value="modelValue"
            :min="props.options.type == 'number' ? 1 : null"
            :autocomplete="props.options.autocomplete"
            :tokens="`A:[a-zA-Zа-яА-Я]|#:[0-9]|*:[a-zA-Z0-9]`"
            v-maska="props.options.mask"
            @input="(event) => emit('update:modelValue', event.target.value)"
            @blur="event => emit('blur', event)"
        >

        <slot></slot>
    </div>
</template>

<script setup>
    import './Input.scss';

    import { vMaska } from "maska/vue"

    const emit = defineEmits([
        'update:modelValue',
        'blur'
    ])
    
    const props = defineProps({
        options: {
            default: {
                 id: 0,
                 title: '',
                 type: '',
                 name: '',
                 autocomplete: 'on',
                 placeholder: '',
                 mask: null
            },
            type: Object
        },
        modelValue: [String, Number]
    })
</script>
