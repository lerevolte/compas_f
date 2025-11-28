<template>
    <div class="form__item form__item_map map">
        <AppSelect 
            v-if="props.options.edit"
            :parentContainer="props.parentContainer"
            :isPreventBottom="props.isPreventBottom"
            :options="{
                ...props.options,
                searchable: true
            }"
            v-model="setModelValue"
        />

        <AppBlank 
            v-else
            :item="{
                title: props.options.title,
                text: props.modelValue ? props.modelValue?.text ?? null : null
            }"
            :options="{
                isLink: false,
                isCheckEmpty: true
            }"
        />

        <AppButton 
            v-show="props.modelValue && props.modelValue.text" 
            class="button_text button_copy" 
            @click="event => copyText(props.modelValue?.text, event.target)"
        />

        <MapFrame 
            :points="[props.modelValue?.coords]"
            :options="{
                defaultZoom: 17
            }"
        />
    </div>
</template>

<script setup>
    import './Map.scss';

    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppBlank from '@AppComponents/Blank/Blank.vue';
    import AppButton from '@AppComponents/Button/Button.vue';
    import MapFrame from './Frame.vue'
    import { Common } from '@/helpers/classes.js'

    const common = new Common()

    const emit = defineEmits([
        'update:modelValue',
        'update:modelList'
    ])
    
    const props = defineProps({
        parentContainer: {
            default: null
        },
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        options: {
            default: {
                id: 0,
                title: '',
                list: [],
                name: '',
                edit: true,
                relation: null,
                searchable: false,
                required: false,
                isHaveNull: false,
                multiple: false,
                type: 'select',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null,
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        }
    })

    const setModelValue = computed({
        get: () => props.modelValue,
        set: (val) => emit('update:modelValue', val)
    })

    const copyText = (value, buttonRef) => {
        buttonRef.classList.add('button_copy_active')
        common.copyText(value)

        setTimeout(() => {
            buttonRef.classList.remove('button_copy_active')
        }, 3000);
    } 

</script>
