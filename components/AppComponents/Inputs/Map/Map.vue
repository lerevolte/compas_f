<template>
    <div class="form__item form__item_map map">
        <AppSelect
            v-if="showSelectVisible && props.options.edit"
            :parentContainer="props.parentContainer"
            :isPreventBottom="props.isPreventBottom"
            :options="{
                ...props.options,
                isSaveSearch: true,
                searchable: true
            }"
            v-model="setModelValue"
        />

        <AppBlank
            v-else-if="showSelectVisible"
            :item="{
                title: props.options.title,
                text: blankText
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
            :points="props.points ?? [props.modelValue?.coords]"
            :options="{
                ...props.frameOptions,
                defaultZoom: props.frameOptions?.defaultZoom ?? 10
            }"
            @getSelectedPoints="data => emit('getSelectedPoints', data)"
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
        'getSelectedPoints',
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
                placeholder: '',
                showSelect: true
            },
            type: Object
        },
        points: {
            default: null,
            type: Array
        },
        frameOptions: {
            enableHeader: false,
            enableRoute: false,
            enableSelection: false,
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
        set: (val) => {
            emit('update:modelValue', val)
        }
    })

    // showSelect управляет верхним полем (Select / Blank). По умолчанию показываем,
    // если showSelect не передан явно как false.
    const showSelectVisible = computed(() => props.options.showSelect !== false)

    // modelValue для address-полей бывает в двух форматах: {text, coords} или просто
    // строка (legacy main_city). AppBlank ожидает строку — нормализуем здесь.
    const blankText = computed(() => {
        const v = props.modelValue
        if (!v) return null
        if (typeof v === 'string') return v
        return v.text ?? null
    })

    const copyText = (value, buttonRef) => {
        buttonRef.classList.add('button_copy_active')
        common.copyText(value)

        setTimeout(() => {
            buttonRef.classList.remove('button_copy_active')
        }, 3000);
    }
</script>
