<template>
    <div class="deal-stages deal-stages_bar" v-if="stages.length > 0">
        <div class="deal-stages__bar" @pointerleave="hoverIndex = null">
            <div
                class="deal-stages__segment"
                v-for="(stage, index) in stages"
                :key="stage.value"
                :class="{
                    'deal-stages__segment_active': index <= paintIndex,
                    'deal-stages__segment_hovered': hoverIndex === index
                }"
                :style="{ '--stage-color': paintColor }"
                :title="stage.label"
                @pointerenter="e => isEditable && e.pointerType == 'mouse' && (hoverIndex = index)"
                @click="isEditable && stage.value != current ? confirmStage = stage : null"
            >
                <span class="deal-stages__segment-name">
                    {{ stage.label }}
                </span>
            </div>
        </div>

        <teleport to="#menu__overlay" v-if="confirmStage">
            <AppModalWarning
                :options="{
                    title: `Изменить «${props.options.title}»?`,
                    desc: `Будет установлено значение «${confirmStage.label}»`,
                    action: 'confirm',
                    actionTitle: 'Изменить',
                    template: 'text'
                }"
                :loading="loading"
                @confirm="applyStage(confirmStage)"
                @close="confirmStage = null"
            />
        </teleport>
    </div>
</template>

<script setup>
    import '@AppComponents/DealStages/DealStages.scss'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    const props = defineProps({
        options: {
            default: {},
            type: Object
        },
        pageId: {
            default: null,
            type: [String, Number]
        },
        slug: {
            default: null,
            type: String
        }
    })

    const emit = defineEmits([
        'changed'
    ])

    const confirmStage = ref(null)
    const loading = ref(false)
    const hoverIndex = ref(null)

    const unwrap = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value.value : value
    const value = ref(unwrap(props.options.value))

    watch(() => props.options.value, (next) => {
        value.value = unwrap(next)
    })

    const stages = computed(() => (Array.isArray(props.options.options) ? props.options.options : [])
        .filter(option => option?.label && !option.label.is_hidden)
        .map(option => ({
            value: option.value,
            label: option.label.text ?? '',
            color: option.label.color || '#39a8ef'
        })))

    const current = computed(() => value.value)
    const currentIndex = computed(() => stages.value.findIndex(stage => stage.value == current.value))
    const paintIndex = computed(() => hoverIndex.value ?? currentIndex.value)
    const paintColor = computed(() => stages.value[paintIndex.value]?.color || '#39a8ef')
    const isEditable = computed(() => !!props.pageId && !!props.slug && !!props.options.can_edit && !props.options.readonly)

    const applyStage = async (stage) => {
        if (!stage || loading.value) return
        loading.value = true
        try {
            const raw = props.options.value
            const next = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw, value: stage.value } : stage.value
            const response = await api.callMethod('POST', routes.detail.edit_fields.replaceAll('${slug}', props.slug), {
                rows: [{ id: props.pageId, [props.options.key]: next }]
            })
            if (response?.status == 200) {
                value.value = stage.value
                emit('changed', stage.value)
            }
        } catch (error) {
            console.log(error)
        } finally {
            loading.value = false
            confirmStage.value = null
            hoverIndex.value = null
        }
    }
</script>
