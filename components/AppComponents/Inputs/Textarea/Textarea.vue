<template>
    <div class="form__item form__item_textarea" ref="textareaRef" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id">
            {{ props.options.title }}
        </label>
        <textarea 
            :id="props.options.id" 
            :name="props.options.name" 
            :placeholder="props.options.placeholder"
            :value="modelValue"
            :disabled="props.options.disabled"
            @input="handleInput"
            @keydown.enter="handleKeydownEnter"
        ></textarea>
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
    </div>
</template>

<script setup>
    import './Textarea.scss';
    import AppError from '@AppComponents/Error/Error.vue'

    const textareaRef = ref(null)
    
    const emit = defineEmits([
        'update:modelValue'
    ])
    
    const props = defineProps({
        options: {
            default: {
                 id: 0,
                 title: '',
                 name: '',
                 disabled: false,
                 preventEnter: false,
                 placeholder: ''
            },
            type: Object
        },
        modelValue: String,
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        }
    })

    const handleInput = (event) => {
        if (props.options.preventEnter) {
            const newValue = event.target.value;
            if (newValue.includes('\n') && !props.modelValue?.includes('\n')) {
                event.target.value = props.modelValue || '';
                return;
            }
        }
        emit('update:modelValue', event.target.value);
    }

    const handleKeydownEnter = (event) => {
        if (props.options.preventEnter) {
            event.preventDefault();
            event.stopPropagation();
        }
    }


    defineExpose({ textareaRef });
</script>
