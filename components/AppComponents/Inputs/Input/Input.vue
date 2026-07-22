<template>
    <div class="form__item form__item_input" :class="{'blank_required': props.options.required, 'error': props.error.state}" :style="props.options.unit ? `--substring: ${props.options.unit}; --substringPadding: 17px` : ''">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            <span>{{ props.options.title }}</span>
        </label>
        <input 
            ref="inputRef"
            :id="props.options.id" 
            :name="props.options.name" 
            :type="props.options.type" 
            :placeholder="props.options.placeholder"
            :value="modelValue"
            :min="props.options.type == 'number' ? 1 : null"
            :autocomplete="props.options.autocomplete"
            v-maska="maskaOptions"
            @input="onInput"
            @blur="onBlur"
        >
        <span class="form-item__substring" v-if="props.options.unit">{{ props.options.unit }}</span>
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>
        <slot></slot>
    </div>
</template>

<script setup>
    import './Input.scss';

    const inputRef = ref(null)
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
                 focus: false,
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

    // Режимы маски (8476/8477):
    //  - 'email' — спец-маркер: фиксированная maska невозможна, фильтруем символы
    //    и нормализуем на blur;
    //  - маска со ':' — время (одиночное '##:##' или диапазон '##:## - ##:##'),
    //    структуру задаёт maska, диапазоны (часы 00–23, минуты 00–59) доводим на blur.
    const isEmailMask = computed(() => props.options.mask === 'email')
    const isTimeMask = computed(() => typeof props.options.mask === 'string' && props.options.mask.includes(':'))
    const isRangeTime = computed(() => isTimeMask.value && props.options.mask.includes('-'))

    const maskaOptions = computed(() => ({
        // для email maska-литерал не применяем
        mask: isEmailMask.value ? null : (props.options.mask ?? null),
        tokens: {
            A: { pattern: /[a-zA-Zа-яА-Я]/ },
            '#': { pattern: /\d/ },
            '*': { pattern: /[a-zA-Z0-9]/ },
            S: { pattern: /[0-9а-яА-Я]/ }
        }
    }))

    const pad2 = n => String(n).padStart(2, '0')

    // Доводим время до валидного формата. Если введено меньше цифр, чем нужно,
    // значение не насилуем (пользователь ещё печатает / стёр часть).
    function normalizeTime(value, isRange) {
        const digits = (value ?? '').replace(/\D/g, '')
        const need = isRange ? 8 : 4
        if (digits.length < need) return value
        const d = digits.slice(0, need)
        const clampTime = (h, m) => {
            let hours = Math.min(parseInt(h, 10) || 0, 24)
            let minutes = hours === 24 ? 0 : Math.min(parseInt(m, 10) || 0, 59)
            return `${pad2(hours)}:${pad2(minutes)}`
        }
        let res = clampTime(d.slice(0, 2), d.slice(2, 4))
        if (isRange) {
            res += ` - ${clampTime(d.slice(4, 6), d.slice(6, 8))}`
        }
        return res
    }

    // Коалесцируем несколько input-событий (сырое + от v-maska) в один emit
    let emitRafId = null

    function onInput(event) {
        const target = event.target
        // e-mail: оставляем только допустимые в адресе символы
        if (isEmailMask.value) {
            const filtered = target.value.replace(/[^a-zA-Z0-9@._%+\-]/g, '')
            if (filtered !== target.value) target.value = filtered
        }
        if (emitRafId !== null) {
            cancelAnimationFrame(emitRafId)
            emitRafId = null
        }
        emitRafId = requestAnimationFrame(() => {
            emit('update:prevValue', props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : null)
            emit('update:modelValue', target.value)
            emitRafId = null
        })
    }

    function onBlur(event) {
        const target = event.target
        let normalized = null
        if (isTimeMask.value) {
            normalized = normalizeTime(target.value, isRangeTime.value)
        } else if (isEmailMask.value) {
            normalized = (target.value ?? '').trim().toLowerCase()
        }
        if (normalized !== null && normalized !== target.value) {
            target.value = normalized
            emit('update:prevValue', props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : null)
            emit('update:modelValue', normalized)
        }
        emit('blur', event)
    }

    defineExpose({ inputRef })

    onMounted(() => {
        if (props.options?.focus) {
            nextTick(() => {
                inputRef.value.focus()
            })
        }
    })
</script>
