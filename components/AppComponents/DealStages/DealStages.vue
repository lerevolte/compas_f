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
        <div class="deal-stages__bar" v-if="stages.length > 0" @pointerleave="hoverIndex = null">
            <div
                class="deal-stages__segment"
                v-for="(stage, index) in processStages"
                :key="stage.value"
                :class="{
                    'deal-stages__segment_active': index <= paintIndex,
                    'deal-stages__segment_hovered': hoverIndex === index
                }"
                :style="{ '--stage-color': paintColor }"
                :title="stage.label"
                @pointerenter="e => e.pointerType == 'mouse' && (hoverIndex = index)"
                @click="props.options.edit == false ? null : confirmStage = stage"
            >
                <span class="deal-stages__segment-name">
                    {{ stage.label }}
                </span>
            </div>
            <div
                class="deal-stages__segment"
                v-if="finalStages.length"
                :class="{
                    'deal-stages__segment_active': finalIndex <= paintIndex,
                    'deal-stages__segment_hovered': hoverIndex === finalIndex
                }"
                :style="{ '--stage-color': paintColor }"
                :title="finalLabel"
                @pointerenter="e => e.pointerType == 'mouse' && (hoverIndex = finalIndex)"
                @click="props.options.edit == false ? null : finalModal = 'choice'"
            >
                <span class="deal-stages__segment-name">
                    {{ finalLabel }}
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
                @confirm="applyStage(confirmStage)"
                @close="confirmStage = null"
            />
        </teleport>

        <teleport to="#menu__overlay" v-if="finalModal">
            <dialog class="modal modal_warning" open>
                <div class="modal__background" @click="finalModal = null"></div>

                <div class="modal__content">
                    <IconClose class="modal__close" @click="finalModal = null" />

                    <AppH2>
                        {{ finalModal == 'choice' ? 'Завершение сделки' : 'Выберите стадию отмены' }}
                    </AppH2>

                    <div class="deal-stages__final" v-if="finalModal == 'choice'">
                        <AppButton
                            v-if="successStage"
                            class="button_fill deal-stages__final-button"
                            :class="{'skeleton': loading}"
                            :style="{ '--stage-color': successStage.color }"
                            @click="applyStage(successStage)"
                        >
                            {{ successStage.label }}
                        </AppButton>
                        <AppButton
                            v-if="failureStages.length"
                            class="button_fill button_warning deal-stages__final-button"
                            :class="{'skeleton': loading}"
                            @click="failureStages.length == 1 ? applyStage(failureStages[0]) : finalModal = 'failure'"
                        >
                            Сделка проиграна
                        </AppButton>
                    </div>

                    <div class="deal-stages__final" v-else>
                        <AppButton
                            v-for="stage in failureStages"
                            :key="stage.value"
                            class="deal-stages__final-button"
                            :class="{'skeleton': loading}"
                            @click="applyStage(stage)"
                        >
                            {{ stage.label }}
                        </AppButton>
                    </div>

                    <div class="modal__buttons">
                        <AppButton v-if="finalModal == 'failure'" @click="finalModal = 'choice'">
                            Назад
                        </AppButton>
                        <AppButton @click="finalModal = null">
                            Отмена
                        </AppButton>
                    </div>
                </div>
            </dialog>
        </teleport>
    </div>
</template>

<script setup>
    import './DealStages.scss'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppH2 from '@AppComponents/Headers/H2/H2.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import IconClose from '@AppIcons/Close.vue'

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
    const finalModal = ref(null)
    const loading = ref(false)
    const hoverIndex = ref(null)

    watch(() => props.options.value, (next) => {
        value.value = typeof next === 'object' && next !== null ? next.value : next
    })

    const semanticsOf = (stage) => {
        if (stage.semantics == 'success' || stage.semantics == 'failure') return stage.semantics
        const v = String(stage.value ?? '')
        if (/(^|:)WON$/.test(v)) return 'success'
        if (/(^|:)(LOSE\d*|APOLOGY)$/.test(v)) return 'failure'
        return null
    }

    const processStages = computed(() => stages.value.filter(s => !semanticsOf(s)))
    const finalStages = computed(() => stages.value.filter(s => semanticsOf(s)))
    const successStage = computed(() => finalStages.value.find(s => semanticsOf(s) == 'success') ?? null)
    const failureStages = computed(() => finalStages.value.filter(s => semanticsOf(s) == 'failure'))

    const current = computed(() => stages.value.find(s => s.value == value.value) ?? null)
    const isFinalCurrent = computed(() => current.value != null && semanticsOf(current.value) != null)

    const finalIndex = computed(() => processStages.value.length)
    const finalLabel = computed(() => isFinalCurrent.value ? current.value.label : 'Завершить сделку')

    const currentIndex = computed(() => {
        if (isFinalCurrent.value) return finalIndex.value
        return processStages.value.findIndex(s => s.value == value.value)
    })

    const paintIndex = computed(() => hoverIndex.value ?? currentIndex.value)
    const paintColor = computed(() => {
        if (paintIndex.value == finalIndex.value && finalStages.value.length) {
            if (hoverIndex.value == null || isFinalCurrent.value) {
                return (isFinalCurrent.value ? current.value.color : null) || successStage.value?.color || '#39a8ef'
            }
            return successStage.value?.color || '#39a8ef'
        }
        return processStages.value[paintIndex.value]?.color || '#39a8ef'
    })

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

    const applyStage = async (stage) => {
        if (!stage || loading.value) return
        loading.value = true
        try {
            const response = await api.callMethod(
                'POST',
                routes.bitrix24.change_stage.replace('${id}', props.pageId),
                { stage: stage.value }
            )
            if (response.status == 200) {
                value.value = stage.value
                emit('changed', value.value)
            }
        } catch (error) {
            console.log(error)
        } finally {
            loading.value = false
            confirmStage.value = null
            finalModal.value = null
        }
    }

    onMounted(() => {
        load()
    })
</script>
