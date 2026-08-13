<template>
    <div class="form__item form__item_waybills" v-if="enabled">
        <label class="blank__title" v-if="props.options?.title && props.options.title != ''">
            <span>{{ props.options.title }}</span>
        </label>

        <div class="waybills">
            <div class="waybills__list" v-if="list.length">
                <div class="waybills__item" v-for="item in list" :key="item.id">
                    <div class="waybills__info">
                        <span class="waybills__number">№ {{ item.number }}</span>
                        <span class="waybills__date" v-if="item.date">от {{ item.date }}</span>
                        <span class="waybills__status" v-if="item.status">{{ item.status }}</span>
                    </div>
                    <div class="waybills__actions">
                        <a
                            class="waybills__link"
                            v-if="item.pdf_url"
                            :href="item.pdf_url"
                            target="_blank"
                            rel="noopener"
                        >Печать</a>
                        <a
                            class="waybills__link"
                            v-if="item.cabinet_url"
                            :href="item.cabinet_url"
                            target="_blank"
                            rel="noopener"
                        >Открыть в Saby</a>
                        <a
                            class="waybills__link"
                            v-if="item.qr_url"
                            :href="item.qr_url"
                            target="_blank"
                            rel="noopener"
                        >QR для ГИБДД</a>
                        <button
                            class="waybills__link waybills__link_button"
                            type="button"
                            :disabled="refreshing === item.id"
                            @click="refresh(item)"
                        >{{ refreshing === item.id ? 'Обновляется…' : 'Обновить' }}</button>
                    </div>
                </div>
            </div>
            <div class="waybills__empty" v-else-if="!loading">
                Накладные ещё не формировались
            </div>

            <ul class="waybills__errors" v-if="errors.length">
                <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
            </ul>

            <button
                class="waybills__button"
                type="button"
                :disabled="loading || creating"
                @click="create"
            >
                {{ creating ? 'Формируется…' : 'Сформировать накладную' }}
            </button>
        </div>
    </div>
</template>

<script setup>
    import './Waybills.scss'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common } from '@/helpers/classes.js'

    const common = new Common()

    const props = defineProps({
        routeId: {
            default: null,
            type: [Number, String]
        },
        options: {
            default: () => ({}),
            type: Object
        },
        isExternal: {
            default: false,
            type: Boolean
        }
    })

    const list = ref([])
    const errors = ref([])
    const enabled = ref(false)
    const loading = ref(false)
    const creating = ref(false)
    const refreshing = ref(null)

    const load = async () => {
        if (!props.routeId || props.isExternal) return
        loading.value = true
        try {
            const url = routes.logistic.waybills.replace('${id}', props.routeId)
            const response = await api.callMethod('GET', url)
            if (response.status == 200) {
                enabled.value = response.data?.enabled !== false
                list.value = response.data?.data || []
            }
        } catch (e) {
            console.log('waybills', e)
        } finally {
            loading.value = false
        }
    }

    const create = async () => {
        if (creating.value || !props.routeId) return
        creating.value = true
        errors.value = []
        try {
            const url = routes.logistic.waybills.replace('${id}', props.routeId)
            const response = await api.callMethod('POST', url, {})
            if (response.status == 200 && response.data?.data) {
                list.value = [response.data.data, ...list.value]
                common.showNotification({ title: 'Транспортная накладная', description: `№ ${response.data.data.number} сформирована` }, 'success')
            } else {
                errors.value = response.data?.errors || []
                if (!errors.value.length && response.data?.message) {
                    errors.value = [response.data.message]
                }
            }
        } catch (e) {
            errors.value = ['Не удалось сформировать накладную']
        } finally {
            creating.value = false
        }
    }

    const refresh = async (item) => {
        if (refreshing.value) return
        refreshing.value = item.id
        errors.value = []
        try {
            const url = routes.logistic.waybillRefresh.replace('${id}', item.id)
            const response = await api.callMethod('POST', url, {})
            if (response.status == 200 && response.data?.data) {
                list.value = list.value.map(row => row.id === item.id ? response.data.data : row)
            } else if (response.data?.message) {
                errors.value = [response.data.message]
            }
        } catch (e) {
            errors.value = ['Не удалось обновить статус накладной']
        } finally {
            refreshing.value = null
        }
    }

    onMounted(load)
    watch(() => props.routeId, load)
</script>
