<template>
    <div class="form__item form__item_waybills" v-if="enabled">
        <label class="blank__title" v-if="props.options?.title && props.options.title != ''">
            <span>{{ props.options.title }}</span>
        </label>

        <div class="waybills">
            <div class="waybills__list" v-if="orders.length">
                <div class="waybills__item waybills__item_order" v-for="item in orders" :key="'order_' + item.id">
                    <div class="waybills__info">
                        <span class="waybills__number">Заказ № {{ item.number }}</span>
                        <span class="waybills__date" v-if="item.date">от {{ item.date }}</span>
                        <span class="waybills__state" :class="'waybills__state_' + item.state_code">{{ item.state_label }}</span>
                    </div>
                    <div class="waybills__loading-task" v-if="item.last_event">Последнее событие: {{ item.last_event }}</div>
                    <div class="waybills__loading-task" v-if="item.mass_method_label">Метод определения массы: {{ item.mass_method_label }}</div>
                    <div class="waybills__loading-task" v-if="item.loading_task">
                        <span>Склад погрузки:</span>
                        <a class="waybills__link" :href="'/objects/logistic_tasks/' + item.loading_task.id" target="_blank" rel="noopener">{{ item.loading_task.name || ('Задача #' + item.loading_task.id) }}</a>
                    </div>
                    <div class="waybills__actions">
                        <a class="waybills__link" v-if="item.cabinet_url" :href="item.cabinet_url" target="_blank" rel="noopener">Открыть в Saby</a>
                        <a class="waybills__link" v-if="item.pdf_url" :href="item.pdf_url" target="_blank" rel="noopener">PDF заказа</a>
                        <button class="waybills__link waybills__link_button" type="button" :disabled="refreshing === 'order_' + item.id" @click="refreshOrder(item)">{{ refreshing === 'order_' + item.id ? 'Обновляется…' : 'Обновить' }}</button>
                        <template v-if="confirmDelete === 'order_' + item.id">
                            <span class="waybills__confirm">Удалить заказ?</span>
                            <button class="waybills__link waybills__link_button waybills__link_danger" type="button" :disabled="deleting === 'order_' + item.id" @click="removeOrder(item)">{{ deleting === 'order_' + item.id ? 'Удаляется…' : 'Да, удалить' }}</button>
                            <button class="waybills__link waybills__link_button" type="button" :disabled="deleting === 'order_' + item.id" @click="confirmDelete = null">Отмена</button>
                        </template>
                        <button v-else class="waybills__link waybills__link_button waybills__link_danger" type="button" @click="confirmDelete = 'order_' + item.id">Удалить</button>
                    </div>

                    <div class="waybills__sub" v-if="item.waybill">
                        <div class="waybills__info">
                            <span class="waybills__number">Транспортная накладная № {{ item.waybill.number || '—' }}</span>
                            <span class="waybills__date" v-if="item.waybill.date">от {{ item.waybill.date }}</span>
                            <span class="waybills__status" v-if="item.waybill.state">{{ item.waybill.state }}</span>
                            <span class="waybills__status" v-if="item.waybill.stage">· {{ item.waybill.stage }}</span>
                        </div>
                        <div class="waybills__actions">
                            <a class="waybills__link" v-if="item.waybill.pdf_url" :href="item.waybill.pdf_url" target="_blank" rel="noopener">Печать</a>
                            <a class="waybills__link" v-if="item.waybill.archive_url" :href="item.waybill.archive_url" target="_blank" rel="noopener">Архив</a>
                            <a class="waybills__link" v-if="item.waybill.cabinet_url" :href="item.waybill.cabinet_url" target="_blank" rel="noopener">Открыть в Saby</a>
                            <button class="waybills__link waybills__link_button" type="button" v-if="item.waybill.qr_url" @click="toggleQr('order_' + item.id, item.waybill.qr_url)">{{ openedQr === 'order_' + item.id ? 'Скрыть QR' : 'QR для ГИБДД' }}</button>
                        </div>
                        <div class="waybills__qr" v-if="openedQr === 'order_' + item.id && qrImages['order_' + item.id]">
                            <div class="waybills__qr-image" v-html="qrImages['order_' + item.id]"></div>
                            <a class="waybills__link" :href="item.waybill.qr_url" target="_blank" rel="noopener">Ссылка для проверки</a>
                        </div>
                    </div>
                    <div class="waybills__sub waybills__sub_empty" v-else>
                        {{ item.state_code == '7' ? 'Заказ утверждён — транспортная накладная появится здесь, как только перевозчик оформит её в Saby' : 'Транспортная накладная появится после утверждения заказа перевозчиком' }}
                    </div>
                </div>
            </div>

            <div class="waybills__list" v-if="waybills.length">
                <div class="waybills__legacy-title">Накладные, созданные напрямую</div>
                <div class="waybills__item" v-for="item in waybills" :key="'wb_' + item.id">
                    <div class="waybills__info">
                        <span class="waybills__number">№ {{ item.number }}</span>
                        <span class="waybills__date" v-if="item.date">от {{ item.date }}</span>
                        <span class="waybills__status" v-if="item.status">{{ item.status }}</span>
                    </div>
                    <div class="waybills__actions">
                        <a class="waybills__link" v-if="item.pdf_url" :href="item.pdf_url" target="_blank" rel="noopener">Печать</a>
                        <a class="waybills__link" v-if="item.cabinet_url" :href="item.cabinet_url" target="_blank" rel="noopener">Открыть в Saby</a>
                        <button class="waybills__link waybills__link_button" type="button" v-if="item.qr_url" @click="toggleQr('wb_' + item.id, item.qr_url)">{{ openedQr === 'wb_' + item.id ? 'Скрыть QR' : 'QR для ГИБДД' }}</button>
                        <button class="waybills__link waybills__link_button" type="button" :disabled="refreshing === 'wb_' + item.id" @click="refreshWaybill(item)">{{ refreshing === 'wb_' + item.id ? 'Обновляется…' : 'Обновить' }}</button>
                        <template v-if="confirmDelete === 'wb_' + item.id">
                            <span class="waybills__confirm">Удалить накладную?</span>
                            <button class="waybills__link waybills__link_button waybills__link_danger" type="button" :disabled="deleting === 'wb_' + item.id" @click="removeWaybill(item)">{{ deleting === 'wb_' + item.id ? 'Удаляется…' : 'Да, удалить' }}</button>
                            <button class="waybills__link waybills__link_button" type="button" :disabled="deleting === 'wb_' + item.id" @click="confirmDelete = null">Отмена</button>
                        </template>
                        <button v-else class="waybills__link waybills__link_button waybills__link_danger" type="button" @click="confirmDelete = 'wb_' + item.id">Удалить</button>
                    </div>
                    <div class="waybills__qr" v-if="openedQr === 'wb_' + item.id && qrImages['wb_' + item.id]">
                        <div class="waybills__qr-image" v-html="qrImages['wb_' + item.id]"></div>
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
                v-if="!orders.length && !picker.open"
                :disabled="loading || creating || pickerLoading"
                @click="openPicker"
            >
                {{ pickerLoading ? 'Загрузка маршрута…' : (creating ? 'Создаётся…' : 'Создать заказ в Саби') }}
            </button>

            <div class="waybills__picker" v-if="picker.open">
                <div class="waybills__picker-title" v-if="picker.tasks.length > 1">Выберите точку погрузки — её адрес и план. время уйдут в заказ</div>
                <div class="waybills__picker-scroll" v-if="picker.tasks.length > 1">
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
                <div class="waybills__picker-field">
                    <AppSelect
                        :isPreventBottom="true"
                        :options="{
                            id: 'saby_order_mass_method',
                            title: 'Метод определения массы',
                            list: picker.massMethods,
                            isHaveNull: true
                        }"
                        v-model="picker.massMethod"
                    />
                </div>
                <div class="waybills__picker-actions">
                    <button
                        class="waybills__button"
                        type="button"
                        :disabled="(picker.tasks.length > 1 && !picker.selected) || creating"
                        @click="createOrder"
                    >{{ creating ? 'Создаётся…' : 'Создать заказ' }}</button>
                    <button class="waybills__link waybills__link_button" type="button" :disabled="creating" @click="picker.open = false">Отмена</button>
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
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'

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

    const orders = ref([])
    const waybills = ref([])
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
        massMethod: null,
        massMethods: [],
        tasks: [],
        selected: null
    })

    const toggleQr = async (key, url) => {
        if (openedQr.value === key) {
            openedQr.value = null
            return
        }
        if (!qrImages.value[key]) {
            try {
                const { renderSVG } = await import('uqr')
                qrImages.value[key] = renderSVG(url, { pixelSize: 5, border: 2 })
            } catch (e) {
                errors.value = ['Не удалось построить QR-код']
                return
            }
        }
        openedQr.value = key
    }

    const load = async () => {
        if (!props.pageId || props.isExternal) return
        loading.value = true
        try {
            const url = routes.logistic.sabyOrders.replace('${id}', props.pageId)
            const response = await api.callMethod('GET', url)
            if (response.status == 200) {
                enabled.value = response.data?.enabled !== false
                orders.value = response.data?.data || []
                waybills.value = response.data?.waybills || []
            }
        } catch (e) {
            console.log('saby orders', e)
        } finally {
            loading.value = false
        }
    }

    const openPicker = async () => {
        if (creating.value || pickerLoading.value || !props.pageId) return
        errors.value = []
        pickerLoading.value = true
        try {
            const url = routes.logistic.waybillRouteTasks.replace('${id}', props.pageId)
            const response = await api.callMethod('GET', url)
            const tasks = response.status == 200 ? (response.data?.data || []) : []
            let savedMassMethod = null
            try {
                savedMassMethod = localStorage.getItem('saby_mass_method') || null
            } catch (e) {}
            const methods = response.data?.mass_methods || []
            if (savedMassMethod && !methods.some(m => String(m.value) === String(savedMassMethod))) {
                savedMassMethod = null
            }
            picker.value = {
                open: true,
                tasks,
                selected: null,
                massMethod: savedMassMethod,
                massMethods: methods
            }
        } catch (e) {
            errors.value = ['Не удалось загрузить данные маршрута']
        } finally {
            pickerLoading.value = false
        }
    }

    const selectLoadingTask = (row) => {
        if (row.is_current) return
        picker.value.selected = picker.value.selected === row.id ? null : row.id
    }

    const createOrder = async () => {
        if (picker.value.tasks.length > 1 && !picker.value.selected) return
        if (creating.value || !props.pageId) return
        creating.value = true
        errors.value = []
        try {
            const url = routes.logistic.sabyOrders.replace('${id}', props.pageId)
            const body = {}
            if (picker.value.selected) body.loading_task_id = picker.value.selected
            if (picker.value.massMethod) {
                body.mass_method = picker.value.massMethod
                try {
                    localStorage.setItem('saby_mass_method', String(picker.value.massMethod))
                } catch (e) {}
            }
            const response = await api.callMethod('POST', url, body)
            if (response.status == 200 && response.data?.data) {
                orders.value = [response.data.data, ...orders.value]
                picker.value.open = false
                common.showNotification({ title: 'Заказ в Саби', description: `Заказ № ${response.data.data.number} создан. Отправьте его перевозчику в Saby` }, 'success')
            } else {
                errors.value = response.data?.errors || []
                if (!errors.value.length && response.data?.message) {
                    errors.value = [response.data.message]
                }
            }
        } catch (e) {
            errors.value = ['Не удалось создать заказ']
        } finally {
            creating.value = false
        }
    }

    const refreshOrder = async (item) => {
        if (refreshing.value) return
        refreshing.value = 'order_' + item.id
        errors.value = []
        try {
            const url = routes.logistic.sabyOrderRefresh.replace('${id}', item.id)
            const response = await api.callMethod('POST', url, {})
            if (response.status == 200 && response.data?.data) {
                orders.value = orders.value.map(row => row.id === item.id ? response.data.data : row)
            } else if (response.data?.message) {
                errors.value = [response.data.message]
            }
        } catch (e) {
            errors.value = ['Не удалось обновить состояние заказа']
        } finally {
            refreshing.value = null
        }
    }

    const removeOrder = async (item) => {
        if (deleting.value) return
        deleting.value = 'order_' + item.id
        errors.value = []
        try {
            const url = routes.logistic.sabyOrderDelete.replace('${id}', item.id)
            const response = await api.callMethod('DELETE', url)
            if (response.status == 200) {
                orders.value = orders.value.filter(row => row.id !== item.id)
                if (openedQr.value === 'order_' + item.id) openedQr.value = null
                common.showNotification({ title: 'Заказ в Саби', description: `Заказ № ${item.number} удалён` }, 'success')
            } else if (response.data?.message) {
                errors.value = [response.data.message]
            }
        } catch (e) {
            errors.value = ['Не удалось удалить заказ']
        } finally {
            deleting.value = null
            confirmDelete.value = null
        }
    }

    const refreshWaybill = async (item) => {
        if (refreshing.value) return
        refreshing.value = 'wb_' + item.id
        errors.value = []
        try {
            const url = routes.logistic.waybillRefresh.replace('${id}', item.id)
            const response = await api.callMethod('POST', url, {})
            if (response.status == 200 && response.data?.data) {
                waybills.value = waybills.value.map(row => row.id === item.id ? response.data.data : row)
            } else if (response.data?.message) {
                errors.value = [response.data.message]
            }
        } catch (e) {
            errors.value = ['Не удалось обновить статус накладной']
        } finally {
            refreshing.value = null
        }
    }

    const removeWaybill = async (item) => {
        if (deleting.value) return
        deleting.value = 'wb_' + item.id
        errors.value = []
        try {
            const url = routes.logistic.waybillDelete.replace('${id}', item.id)
            const response = await api.callMethod('DELETE', url)
            if (response.status == 200) {
                waybills.value = waybills.value.filter(row => row.id !== item.id)
                if (openedQr.value === 'wb_' + item.id) openedQr.value = null
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
