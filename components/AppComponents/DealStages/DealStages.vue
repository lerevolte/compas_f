<template>
    <div class="form__item deal-stages" v-if="props.options.mode == 'value'">
        <label class="blank__title" v-if="props.options.title">
            {{ props.options.title }}
        </label>

        <span class="deal-stages__value" v-if="current" :title="current.label">
            <span class="deal-stages__dot" :style="{ background: current.color || '#ccc' }"></span>
            {{ current.label }}
        </span>
        <span class="deal-stages__value deal-stages__value_empty" v-else>
            не заполнено
        </span>
    </div>

    <div class="deal-stages deal-stages_bar" v-else>
        <div class="deal-stages__bar" v-if="stages.length > 0" @mouseleave="hoverIndex = null">
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
                @mouseenter="hoverIndex = index"
                @click="props.options.edit == false ? null : confirmStage = stage"
            >
                <span class="deal-stages__segment-name">
                    {{ stage.label }}
                </span>
            </div>
        </div>

        <teleport to="#menu__overlay" v-if="confirmStage">
            <AppModalWarning
                :options="{
                    title: 'Изменить стадию?',
                    desc: `Сделка будет переведена в стадию «${confirmStage.label}» в Bitrix24`,
                    action: 'confirm',
                    actionTitle: 'Изменить',
                    template: 'text'
                }"
                :loading="loading"
                @confirm="applyStage()"
                @close="confirmStage = null"
            />
        </teleport>
    </div>
</template>

<script setup>
    import './DealStages.scss'
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
        }
    })

    const emit = defineEmits([
        'changed'
    ])

    const stages = ref([])
    const value = ref(typeof props.options.value === 'object' && props.options.value !== null
        ? props.options.value.value
        : props.options.value)
    const confirmStage = ref(null)
    const loading = ref(false)
    const hoverIndex = ref(null)

    watch(() => props.options.value, (next) => {
        value.value = typeof next === 'object' && next !== null ? next.value : next
    })

    const currentIndex = computed(() => stages.value.findIndex(s => s.value == value.value))
    const current = computed(() => stages.value[currentIndex.value] ?? null)

    const paintIndex = computed(() => hoverIndex.value ?? currentIndex.value)
    const paintColor = computed(() => stages.value[paintIndex.value]?.color || '#39a8ef')

    const load = async () => {
        try {
            const response = await api.callMethod('GET', routes.bitrix24.deal_stages)
            if (response.status == 200 && Array.isArray(response.data)) {
                stages.value = response.data
            }
        } catch (error) {
            console.log(error)
        }
    }

    const applyStage = async () => {
        if (!confirmStage.value || loading.value) return
        loading.value = true
        try {
            const response = await api.callMethod(
                'POST',
                routes.bitrix24.change_stage.replace('${id}', props.pageId),
                { stage: confirmStage.value.value }
            )
            if (response.status == 200) {
                value.value = confirmStage.value.value
                emit('changed', value.value)
            }
        } catch (error) {
            console.log(error)
        } finally {
            loading.value = false
            confirmStage.value = null
        }
    }

    onMounted(() => {
        load()
    })
</script>
