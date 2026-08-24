<template>
    <div class="form__item form__item_input" :class="{'blank_required': props.options.required, 'error': props.error.state}" :style="props.options.unit ? `--substring: ${props.options.unit}; --substringPadding: 17px` : ''">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            <span>{{ props.options.title }}</span>
        </label>
        <input 
            ref="inputRef"
            :id="props.options.id" 
            :name="props.options.name" 
            :type="isNumber ? 'text' : props.options.type" 
            :inputmode="isNumber ? 'decimal' : null"
            :placeholder="props.options.placeholder"
            :value="modelValue"
            :autocomplete="props.options.autocomplete"
            v-maska="maskaOptions"
            @input="onInput"
            @blur="onBlur"
        >
        <span class="form-item__substring" v-if="props.options.unit">{{ props.options.unit }}</span>
        <div class="input__suggest" v-if="suggest.list.length">
            <div
                class="input__suggest-item"
                v-for="(item, i) in suggest.list"
                :key="i"
                @mousedown.prevent="pickSuggest(item)"
            >
                <span class="input__suggest-label">{{ item.label }}</span>
                <span class="input__suggest-hint" v-if="item.hint">{{ item.hint }}</span>
            </div>
        </div>
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
    import api from '@/helpers/api.js'

    const emit = defineEmits([
        'update:prevValue',
        'update:modelValue',
        'blur',
        'suggest'
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

    const isEmailMask = computed(() => props.options.mask === 'email')
    const isNumber = computed(() => props.options.type == 'number')
    const isPlainNumber = computed(() => isNumber.value && !props.options.mask)

    function sanitizeNumber(value) {
        let res = String(value ?? '').replace(',', '.').replace(/[^\d.\-]/g, '')
        const negative = res.startsWith('-')
        res = res.replace(/-/g, '')
        const dot = res.indexOf('.')
        if (dot !== -1) {
            res = res.slice(0, dot + 1) + res.slice(dot + 1).replace(/\./g, '')
        }
        return (negative ? '-' : '') + res
    }
    const isTimeMask = computed(() => typeof props.options.mask === 'string' && props.options.mask.includes(':'))
    const isRangeTime = computed(() => isTimeMask.value && props.options.mask.includes('-'))

    const maskaOptions = computed(() => ({
        mask: isEmailMask.value ? null : (props.options.mask ?? null),
        tokens: {
            A: { pattern: /[a-zA-Zа-яА-Я]/ },
            '#': { pattern: /\d/ },
            '*': { pattern: /[a-zA-Z0-9]/ },
            S: { pattern: /[0-9а-яА-Я]/ }
        }
    }))

    const pad2 = n => String(n).padStart(2, '0')

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

    let emitRafId = null

    const suggest = reactive({ list: [], timer: null, seq: 0 })

    function fetchSuggest(value) {
        if (!props.options.suggest) return
        clearTimeout(suggest.timer)
        const q = String(value ?? '').trim()
        if (q.length < 2) {
            suggest.list = []
            return
        }
        suggest.timer = setTimeout(async () => {
            const seq = ++suggest.seq
            try {
                const response = await api.callMethod('GET', `/suggest/${props.options.suggest}?q=${encodeURIComponent(q)}`)
                if (seq !== suggest.seq) return
                suggest.list = Array.isArray(response.data) ? response.data : []
            } catch (error) {
                suggest.list = []
            }
        }, 250)
    }

    function pickSuggest(item) {
        suggest.list = []
        clearTimeout(suggest.timer)
        const own = item.value?.[props.options.key]
        const val = own !== undefined && own !== null && own !== '' ? own : item.label
        if (inputRef.value) inputRef.value.value = val
        emit('update:prevValue', props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : null)
        emit('update:modelValue', val)
        emit('suggest', item.value)
    }

    function onInput(event) {
        const target = event.target
        fetchSuggest(target.value)
        if (isEmailMask.value) {
            const filtered = target.value.replace(/[^a-zA-Z0-9@._%+\-]/g, '')
            if (filtered !== target.value) target.value = filtered
        } else if (isPlainNumber.value) {
            const filtered = sanitizeNumber(target.value)
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
        clearTimeout(suggest.timer)
        suggest.list = []
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
