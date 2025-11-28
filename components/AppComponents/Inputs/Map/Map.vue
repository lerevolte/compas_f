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
    import MapFrame from './Frame.vue'

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
</script>
