<template>
    <div class="form__item form__item_input" :class="{'blank_required': props.options.required, 'error': props.error.state}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
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
            v-maska="{
                mask: props.options.mask,
                tokens: {
                    A: { pattern: /[a-zA-Zа-яА-Я]/ },
                    '#': { pattern: /\d/ },
                    '*': { pattern: /[a-zA-Z0-9]/ },
                    S: { pattern: /[0-9а-яА-Я]/ }
                }
            }"
            @input="onInput"
            @blur="event => emit('blur', event)"
        >
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
        <slot></slot>
    </div>
</template>

<script setup>
    import './Input.scss';

    import { vMaska } from "maska/vue"
    import AppError from '@AppComponents/Error/Error.vue'

    const emit = defineEmits([
        'update:prevValue',
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
                 mask: null,
                 required: false
            },
            type: Object
        },
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        },
        modelValue: [String, Number]
    })

    // Коалесцируем несколько input-событий (сырое + от v-maska) в один emit
    let emitRafId = null

    function onInput(event) {
        const target = event.target
        if (emitRafId !== null) {
            cancelAnimationFrame(emitRafId)
            emitRafId = null
        }
        emitRafId = requestAnimationFrame(() => {
            emit('update:prevValue', JSON.parse(JSON.stringify(props.modelValue)))
            emit('update:modelValue', target.value)
            emitRafId = null
        })
    }
</script>
