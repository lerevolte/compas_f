<template>
    <div class="form__item deal-stages">
        <label class="blank__title" v-if="props.options.title">
            {{ props.options.title }}
        </label>

        <div class="deal-stages__bar" v-if="stages.length > 0">
            <div
                class="deal-stages__segment"
                v-for="(stage, index) in stages"
                :key="stage.value"
                :class="{ 'deal-stages__segment_active': index <= currentIndex }"
                :style="{ '--stage-color': stage.color }"
                :title="stage.label"
                @click="confirmStage = stage"
            ></div>
        </div>
        <p class="deal-stages__name" v-if="current">
            {{ current.label }}
        </p>

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

    const stages = ref([])
    const value = ref(typeof props.options.value === 'object' && props.options.value !== null
        ? props.options.value.value
        : props.options.value)
    const confirmStage = ref(null)
    const loading = ref(false)

    const currentIndex = computed(() => stages.value.findIndex(s => s.value == value.value))
    const current = computed(() => stages.value[currentIndex.value] ?? null)

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
