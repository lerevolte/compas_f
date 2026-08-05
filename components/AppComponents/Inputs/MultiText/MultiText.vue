<template>
    <div class="form__item multi-text">
        <label class="blank__title" v-if="props.options.title">
            {{ props.options.title }}
        </label>

        <template v-if="props.options.edit">
            <div class="multi-text__row" v-for="(item, index) in values" :key="index">
                <AppInput
                    :options="{
                        id: `${props.options.id}_${index}`,
                        title: '',
                        type: props.options.mask === 'email' ? 'email' : 'text',
                        name: '',
                        mask: props.options.mask ?? null,
                        placeholder: ''
                    }"
                    :model-value="values[index]"
                    @update:model-value="value => update(index, value)"
                />
                <span class="multi-text__remove" data-action="remove" @click="remove(index)">
                    <IconClose />
                </span>
            </div>
            <AppButton class="button_text" data-action="add" @click="add">
                + Добавить
            </AppButton>
        </template>

        <div class="multi-text__view" v-else>
            <p class="multi-text__value" v-for="(item, index) in filled" :key="index">
                {{ props.options.mask ? common.formatByMask(item, props.options.mask) : item }}
            </p>
            <p class="multi-text__value multi-text__value_empty" v-if="filled.length === 0">
                Не заполнено
            </p>
        </div>
    </div>
</template>

<script setup>
    import './MultiText.scss'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import IconClose from '@AppIcons/Close.vue'
    import { Common } from '@AppHelpers/classes.js'

    const common = new Common()

    const props = defineProps({
        options: {
            default: {},
            type: Object
        },
        modelValue: null
    })

    const emit = defineEmits(['update:modelValue'])

    const normalize = (value) => {
        if (Array.isArray(value)) return [...value]
        if (typeof value === 'string' && value.trim() !== '') {
            try {
                const parsed = JSON.parse(value)
                if (Array.isArray(parsed)) return parsed
            } catch (e) {}
            return [value]
        }
        return []
    }

    const values = ref(normalize(props.modelValue))
    if (values.value.length === 0) values.value.push('')

    watch(() => props.modelValue, (next) => {
        const normalized = normalize(next)
        if (JSON.stringify(normalized) !== JSON.stringify(values.value.filter(v => v !== ''))) {
            values.value = normalized.length ? normalized : ['']
        }
    })

    const filled = computed(() => normalize(props.modelValue).filter(v => v !== null && v !== ''))

    const send = () => {
        emit('update:modelValue', values.value.filter(v => v !== null && v !== ''))
    }

    const update = (index, value) => {
        values.value[index] = value
        send()
    }

    const add = () => {
        values.value.push('')
    }

    const remove = (index) => {
        values.value.splice(index, 1)
        if (values.value.length === 0) values.value.push('')
        send()
    }
</script>
