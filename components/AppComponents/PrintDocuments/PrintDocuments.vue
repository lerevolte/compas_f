<template>
    <div class="print-docs">
        <IconLoader class="print-docs__loader" v-if="loading" />

        <template v-else>
        <div
            class="print-docs__card print-docs__card_upd"
            v-if="isUpdSlug"
            :class="{ 'print-docs__card_checked': updChecked }"
            @click="updChecked = !updChecked"
        >
            <AppCheckbox
                class="print-docs__checkbox"
                :modelValue="updChecked"
                :options="{ title: '' }"
                @update:modelValue="updChecked = !updChecked"
                @click.stop
            />
            <div class="print-docs__info">
                <div class="print-docs__row">
                    <span class="print-docs__entity">{{ mainDoc.short }}</span>
                </div>
                <div class="print-docs__name">{{ mainDoc.title }}</div>
            </div>
            <div class="print-docs__copies" @click.stop>
                <button type="button" class="print-docs__copies-btn" @click="mainCopies = clampCopies(mainCopies - 1)">−</button>
                <input class="print-docs__copies-input" type="number" min="1" :max="MAX_COPIES" :value="mainCopies" @change="mainCopies = clampCopies($event.target.value)">
                <button type="button" class="print-docs__copies-btn" @click="mainCopies = clampCopies(mainCopies + 1)">+</button>
                <span class="print-docs__copies-label">экз.</span>
            </div>
        </div>

        <div class="print-docs__empty" v-if="!docs.length && !isUpdSlug">
            Связанных документов пока нет — создайте счет или накладную через «Создать на основании»
        </div>

        <template v-if="docs.length || isUpdSlug">
            <div
                class="print-docs__card"
                v-for="doc in docs"
                :key="`${doc.slug}_${doc.id}`"
                :class="{ 'print-docs__card_checked': isChecked(doc) }"
                @click="toggle(doc)"
            >
                <AppCheckbox
                    class="print-docs__checkbox"
                    :modelValue="isChecked(doc)"
                    :options="{ title: '' }"
                    @update:modelValue="toggle(doc)"
                    @click.stop
                />
                <div class="print-docs__info">
                    <div class="print-docs__row">
                        <span class="print-docs__entity">{{ doc.entity_title }}</span>
                        <span class="print-docs__date" v-if="doc.created_at">{{ doc.created_at }}</span>
                    </div>
                    <a
                        class="print-docs__name"
                        href="#"
                        @click.prevent.stop="emit('openModal', { slug: doc.slug, id: doc.id })"
                    >{{ doc.name || (doc.entity_title + ' #' + doc.id) }}</a>
                    <div class="print-docs__sum" v-if="doc.sum">Сумма: {{ doc.sum }} руб.</div>
                    <div class="print-docs__files" v-if="doc.files.length">
                        <a
                            class="print-docs__file"
                            v-for="(file, i) in doc.files"
                            :key="i"
                            :href="file.url"
                            target="_blank"
                            rel="noopener"
                            @click.stop
                        >{{ file.name }}</a>
                    </div>
                    <div class="print-docs__nofile" v-else>Файл для печати не сформирован</div>
                </div>
                <div class="print-docs__copies" v-if="isUpdSlug && doc.files.length" @click.stop>
                    <button type="button" class="print-docs__copies-btn" @click="setDocCopies(doc, docCopies(doc) - 1)">−</button>
                    <input class="print-docs__copies-input" type="number" min="1" :max="MAX_COPIES" :value="docCopies(doc)" @change="setDocCopies(doc, $event.target.value)">
                    <button type="button" class="print-docs__copies-btn" @click="setDocCopies(doc, docCopies(doc) + 1)">+</button>
                    <span class="print-docs__copies-label">экз.</span>
                </div>
            </div>

            <template v-if="isUpdSlug">
                <div class="print-docs__subtitle">Дополнительные документы</div>
                <div
                    class="print-docs__card"
                    v-for="att in attachments"
                    :key="`att_${att.id}`"
                    :class="{ 'print-docs__card_checked': isAttChecked(att) }"
                    @click="toggleAtt(att)"
                >
                    <AppCheckbox
                        class="print-docs__checkbox"
                        :modelValue="isAttChecked(att)"
                        :options="{ title: '' }"
                        @update:modelValue="toggleAtt(att)"
                        @click.stop
                    />
                    <div class="print-docs__info">
                        <div class="print-docs__row">
                            <span class="print-docs__entity">Загружен вручную</span>
                            <span class="print-docs__date" v-if="att.created_at">{{ att.created_at }}</span>
                        </div>
                        <a
                            class="print-docs__name"
                            :href="att.url"
                            target="_blank"
                            rel="noopener"
                            @click.stop
                        >{{ att.name }}</a>
                        <a class="print-docs__remove" href="#" @click.prevent.stop="removeAtt(att)">Удалить</a>
                    </div>
                    <div class="print-docs__copies" @click.stop>
                        <button type="button" class="print-docs__copies-btn" @click="saveAttCopies(att, att.copies - 1)">−</button>
                        <input class="print-docs__copies-input" type="number" min="1" :max="MAX_COPIES" :value="att.copies" @change="saveAttCopies(att, $event.target.value)">
                        <button type="button" class="print-docs__copies-btn" @click="saveAttCopies(att, att.copies + 1)">+</button>
                        <span class="print-docs__copies-label">экз.</span>
                    </div>
                </div>

                <div class="print-docs__upload">
                    <input
                        ref="fileInput"
                        class="print-docs__upload-input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        multiple
                        @change="upload"
                    >
                    <AppButton :class="{'skeleton': uploading}" @click="!uploading && fileInput?.click()">
                        {{ uploading ? 'Загружаем…' : '+ Загрузить документ' }}
                    </AppButton>
                    <div class="print-docs__copies">
                        <button type="button" class="print-docs__copies-btn" @click="uploadCopies = clampCopies(uploadCopies - 1)">−</button>
                        <input class="print-docs__copies-input" type="number" min="1" :max="MAX_COPIES" :value="uploadCopies" @change="uploadCopies = clampCopies($event.target.value)">
                        <button type="button" class="print-docs__copies-btn" @click="uploadCopies = clampCopies(uploadCopies + 1)">+</button>
                        <span class="print-docs__copies-label">экз.</span>
                    </div>
                    <span class="print-docs__hint">PDF, JPG или PNG до 20 МБ — печатается вместе с документами заказа</span>
                </div>
            </template>

            <div class="print-docs__actions">
                <AppButton
                    class="button_fill"
                    :class="{'skeleton': updLoading}"
                    :disabled="!checkedCount"
                    @click="print"
                >
                    Печатать{{ checkedCount ? ` (${checkedCount} экз.)` : '' }}
                </AppButton>
            </div>
        </template>
        </template>
    </div>
</template>

<script setup>
    import './PrintDocuments.scss'

    import axios from 'axios'
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import { openUpdPdf, Common } from '@AppHelpers/classes.js'
    import { useUserStore } from '@/stores/userStore.js'

    const UPD_SLUGS = ['logistic_tasks', 'pickups']
    const MAX_COPIES = 20

    const props = defineProps({
        id: {
            default: null,
            type: [Number, String]
        },
        slug: {
            default: null,
            type: String
        }
    })

    const emit = defineEmits(['openModal'])

    const common = new Common()
    const docs = ref([])
    const attachments = ref([])
    const isReceipt = ref(false)
    const isTransfer = ref(false)
    const mainDoc = computed(() => {
        if (isTransfer.value) return { short: 'Перемещение', title: 'Перемещение запасов' }
        if (isReceipt.value) return { short: 'Чек', title: 'Товарный чек' }
        return { short: 'УПД', title: 'Универсальный передаточный документ' }
    })
    const loading = ref(false)
    const checked = ref({})
    const copies = ref({})
    const attChecked = ref({})
    const mainCopies = ref(1)
    const uploadCopies = ref(1)
    const uploading = ref(false)
    const fileInput = ref(null)
    const relationsVersion = useState('object-relations-version', () => 0)

    const clampCopies = value => {
        const n = parseInt(value, 10)
        if (!Number.isFinite(n)) return 1
        return Math.min(MAX_COPIES, Math.max(1, n))
    }

    const key = doc => `${doc.slug}_${doc.id}`
    const isChecked = doc => !!checked.value[key(doc)]
    const toggle = doc => {
        if (!doc.files.length) return
        checked.value[key(doc)] = !checked.value[key(doc)]
    }
    const docCopies = doc => copies.value[key(doc)] ?? 1
    const setDocCopies = (doc, value) => {
        copies.value[key(doc)] = clampCopies(value)
    }

    const isAttChecked = att => attChecked.value[att.id] !== false
    const toggleAtt = att => {
        attChecked.value[att.id] = !isAttChecked(att)
    }

    const checkedDocs = computed(() => docs.value.filter(doc => checked.value[key(doc)] && doc.files.length))
    const checkedAtts = computed(() => attachments.value.filter(isAttChecked))

    const checkedFiles = computed(() => checkedDocs.value.flatMap(doc => doc.files))

    const isUpdSlug = computed(() => UPD_SLUGS.includes(props.slug))
    const updChecked = ref(true)
    const updLoading = ref(false)
    const checkedCount = computed(() => {
        if (!isUpdSlug.value) return checkedFiles.value.length
        return checkedDocs.value.reduce((sum, doc) => sum + doc.files.length * docCopies(doc), 0)
            + checkedAtts.value.reduce((sum, att) => sum + att.copies, 0)
            + (updChecked.value ? mainCopies.value : 0)
    })

    const attachmentsUrl = () => routes.relations.printAttachments.replace('${slug}', props.slug).replace('${id}', props.id)

    const notifyError = (description) => common.showNotification({ title: 'Документы для заказа', description }, 'error')

    const upload = async (event) => {
        const files = Array.from(event.target.files || [])
        event.target.value = ''
        if (!files.length || uploading.value) return
        uploading.value = true
        const userStore = useUserStore()
        try {
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('copies', uploadCopies.value)
                const response = await axios.post(`${routes.domain}/api${attachmentsUrl()}`, formData, {
                    headers: { Authorization: `Bearer ${userStore.token}`, Accept: 'application/json' },
                    validateStatus: () => true
                })
                if (response.status == 200 && response.data?.data) {
                    attachments.value.push(response.data.data)
                } else {
                    const errors = response.data?.errors ? Object.values(response.data.errors).flat() : []
                    notifyError(`${file.name}: ${errors[0] || response.data?.message || 'не удалось загрузить'}`)
                }
            }
        } catch (e) {
            notifyError('Не удалось загрузить документ')
        } finally {
            uploading.value = false
        }
    }

    const saveAttCopies = async (att, value) => {
        const next = clampCopies(value)
        if (next === att.copies) return
        const prev = att.copies
        att.copies = next
        const response = await api.callMethod('PUT', `${attachmentsUrl()}/${att.id}`, { copies: next }).catch(() => null)
        if (response?.status != 200) {
            att.copies = prev
            notifyError('Не удалось сохранить количество экземпляров')
        }
    }

    const removeAtt = async (att) => {
        const response = await api.callMethod('DELETE', `${attachmentsUrl()}/${att.id}`).catch(() => null)
        if (response?.status == 200) {
            attachments.value = attachments.value.filter(item => item.id !== att.id)
        } else {
            notifyError('Не удалось удалить документ')
        }
    }

    const print = async () => {
        if (updLoading.value) return
        const includeUpd = isUpdSlug.value && updChecked.value
        if (!isUpdSlug.value) {
            for (const file of checkedFiles.value) {
                window.open(file.url, '_blank', 'noopener')
            }
            return
        }
        const docKeys = [
            ...checkedDocs.value.map(doc => `${doc.slug}#${doc.id}*${docCopies(doc)}`),
            ...checkedAtts.value.map(att => `attachment#${att.id}*${att.copies}`)
        ]
        if (!includeUpd && !docKeys.length) return
        updLoading.value = true
        try {
            await openUpdPdf(props.slug, [props.id], true, { docKeys, includeUpd, mainCopies: mainCopies.value })
        } finally {
            updLoading.value = false
        }
    }

    const load = async () => {
        if (!props.id || !props.slug) return
        loading.value = true
        try {
            const url = routes.relations.printDocs.replace('${slug}', props.slug).replace('${id}', props.id)
            const response = await api.callMethod('GET', url)
            const ok = response.status == 200
            docs.value = ok ? (response.data?.data ?? []) : []
            attachments.value = ok ? (response.data?.attachments ?? []) : []
            isReceipt.value = ok && !!response.data?.is_receipt
            isTransfer.value = ok && !!response.data?.is_transfer
            mainCopies.value = ok ? clampCopies(response.data?.main_copies ?? 1) : 1
            checked.value = {}
            copies.value = {}
            attChecked.value = {}
        } catch (e) {
            docs.value = []
            attachments.value = []
            isReceipt.value = false
            isTransfer.value = false
        } finally {
            loading.value = false
        }
    }

    onMounted(load)
    watch(() => [props.slug, props.id, relationsVersion.value], load)
</script>
