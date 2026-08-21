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
                    <div class="waybills__loading-task" v-if="item.loading_task">
                        <span>Склад погрузки:</span>
                        <a class="waybills__link" :href="'/objects/logistic_tasks/' + item.loading_task.id" target="_blank" rel="noopener">{{ item.loading_task.name || ('Задача #' + item.loading_task.id) }}</a>
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
                        <button
                            class="waybills__link waybills__link_button"
                            type="button"
                            v-if="item.qr_url"
                            @click="toggleQr(item)"
                        >{{ openedQr === item.id ? 'Скрыть QR' : 'QR для ГИБДД' }}</button>
                        <button
                            class="waybills__link waybills__link_button"
                            type="button"
                            :disabled="refreshing === item.id"
                            @click="refresh(item)"
                        >{{ refreshing === item.id ? 'Обновляется…' : 'Обновить' }}</button>
                        <template v-if="confirmDelete === item.id">
                            <span class="waybills__confirm">Удалить накладную?</span>
                            <button
                                class="waybills__link waybills__link_button waybills__link_danger"
                                type="button"
                                :disabled="deleting === item.id"
                                @click="remove(item)"
                            >{{ deleting === item.id ? 'Удаляется…' : 'Да, удалить' }}</button>
                            <button
                                class="waybills__link waybills__link_button"
                                type="button"
                                :disabled="deleting === item.id"
                                @click="confirmDelete = null"
                            >Отмена</button>
                        </template>
                        <button
                            v-else
                            class="waybills__link waybills__link_button waybills__link_danger"
                            type="button"
                            @click="confirmDelete = item.id"
                        >Удалить</button>
                    </div>

                    <div class="waybills__qr" v-if="openedQr === item.id && qrImages[item.id]">
                        <div class="waybills__qr-image" v-html="qrImages[item.id]"></div>
                        <a class="waybills__link" :href="item.qr_url" target="_blank" rel="noopener">Ссылка для проверки</a>
                    </div>
                </div>
            </div>

            <ul class="waybills__errors" v-if="errors.length">
                <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
            </ul>

            <button
                class="waybills__button"
                type="button"
                v-if="!list.length && !picker.open"
                :disabled="loading || creating || pickerLoading"
                @click="create"
            >
                {{ pickerLoading ? 'Загрузка маршрута…' : (creating ? 'Формируется…' : 'Сформировать накладную') }}
            </button>

            <div class="waybills__picker" v-if="picker.open">
                <div class="waybills__picker-title">Выберите точку погрузки — её адрес и план. время уйдут в накладную</div>
                <div class="waybills__picker-scroll">
                    <table class="waybills__picker-table">
                        <thead>
                            <tr>
                                <th>№</th>
                                <th>Задача</th>
                                <th>Адрес</th>
                                <th>План. время</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(row, index) in picker.tasks"
                                :key="row.id"
                                :class="{
                                    'waybills__picker-row_current': row.is_current,
                                    'waybills__picker-row_selected': picker.selected === row.id
                                }"
                                @click="selectLoadingTask(row)"
                            >
                                <td>{{ index + 1 }}</td>
                                <td>{{ row.name || ('Задача #' + row.id) }}</td>
                                <td>{{ row.address }}</td>
                                <td>{{ row.plan_time }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="waybills__picker-actions">
                    <button
                        class="waybills__button"
                        type="button"
                        :disabled="!picker.selected || creating"
                        @click="createWithLoading"
                    >{{ creating ? 'Формируется…' : 'Сформировать' }}</button>
                    <button
                        class="waybills__link waybills__link_button"
                        type="button"
                        :disabled="creating"
                        @click="picker.open = false"
                    >Отмена</button>
                </div>
            </div>
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
        pageId: {
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
    const confirmDelete = ref(null)
    const deleting = ref(null)
    const openedQr = ref(null)
    const qrImages = ref({})
    const pickerLoading = ref(false)
    const picker = ref({
        open: false,
        tasks: [],
        selected: null
    })

    const toggleQr = async (item) => {
        if (openedQr.value === item.id) {
            openedQr.value = null
            return
        }
        if (!qrImages.value[item.id]) {
            try {
                const { renderSVG } = await import('uqr')
                qrImages.value[item.id] = renderSVG(item.qr_url, { pixelSize: 5, border: 2 })
            } catch (e) {
                errors.value = ['Не удалось построить QR-код']
                return
            }
        }
        openedQr.value = item.id
    }

    const load = async () => {
        if (!props.pageId || props.isExternal) return
        loading.value = true
        try {
            const url = routes.logistic.waybills.replace('${id}', props.pageId)
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
        if (creating.value || pickerLoading.value || !props.pageId) return
        errors.value = []
        pickerLoading.value = true
        try {
            const url = routes.logistic.waybillRouteTasks.replace('${id}', props.pageId)
            const response = await api.callMethod('GET', url)
            const tasks = response.status == 200 ? (response.data?.data || []) : []
            if (tasks.length > 1) {
                picker.value = {
                    open: true,
                    tasks,
                    selected: null
                }
                return
            }
        } catch (e) {
            console.log('waybill route tasks', e)
        } finally {
            pickerLoading.value = false
        }
        await send(null)
    }

    const selectLoadingTask = (row) => {
        if (row.is_current) return
        picker.value.selected = picker.value.selected === row.id ? null : row.id
    }

    const createWithLoading = async () => {
        if (!picker.value.selected) return
        await send(picker.value.selected)
        if (!errors.value.length) {
            picker.value.open = false
        }
    }

    const send = async (loadingTaskId) => {
        if (creating.value || !props.pageId) return
        creating.value = true
        errors.value = []
        try {
            const url = routes.logistic.waybills.replace('${id}', props.pageId)
            const response = await api.callMethod('POST', url, loadingTaskId ? { loading_task_id: loadingTaskId } : {})
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

    const remove = async (item) => {
        if (deleting.value) return
        deleting.value = item.id
        errors.value = []
        try {
            const url = routes.logistic.waybillDelete.replace('${id}', item.id)
            const response = await api.callMethod('DELETE', url)
            if (response.status == 200) {
                list.value = list.value.filter(row => row.id !== item.id)
                if (openedQr.value === item.id) openedQr.value = null
                common.showNotification({ title: 'Транспортная накладная', description: `№ ${item.number} удалена` }, 'success')
            } else if (response.data?.message) {
                errors.value = [response.data.message]
            }
        } catch (e) {
            errors.value = ['Не удалось удалить накладную']
        } finally {
            deleting.value = null
            confirmDelete.value = null
        }
    }

    onMounted(load)
    watch(() => props.pageId, load)
</script>
