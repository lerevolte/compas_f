<template>
    <div class="print-docs">
        <IconLoader class="print-docs__loader" v-if="loading" />

        <template v-else>
        <div class="print-docs__card print-docs__card_upd" v-if="isUpdSlug">
            <div class="print-docs__info">
                <div class="print-docs__row">
                    <span class="print-docs__entity">УПД</span>
                </div>
                <div class="print-docs__name">Универсальный передаточный документ</div>
            </div>
            <AppButton class="button_fill" :class="{'skeleton': updLoading}" @click="printUpd">
                Распечатать УПД
            </AppButton>
        </div>

        <div class="print-docs__empty" v-if="!docs.length">
            Связанных документов пока нет — создайте счет или накладную через «Создать на основании»
        </div>

        <template v-if="docs.length">
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
            </div>

            <div class="print-docs__actions">
                <AppButton
                    class="button_fill"
                    :disabled="!checkedFiles.length"
                    @click="print"
                >
                    Печатать{{ checkedFiles.length ? ` (${checkedFiles.length})` : '' }}
                </AppButton>
            </div>
        </template>
        </template>
    </div>
</template>

<script setup>
    import './PrintDocuments.scss'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'
    import { openUpdPdf } from '@AppHelpers/classes.js'

    const UPD_SLUGS = ['logistic_tasks', 'pickups']

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

    const docs = ref([])
    const loading = ref(false)
    const checked = ref({})
    const relationsVersion = useState('object-relations-version', () => 0)

    const key = doc => `${doc.slug}_${doc.id}`
    const isChecked = doc => !!checked.value[key(doc)]
    const toggle = doc => {
        if (!doc.files.length) return
        checked.value[key(doc)] = !checked.value[key(doc)]
    }

    const checkedFiles = computed(() => docs.value
        .filter(doc => checked.value[key(doc)])
        .flatMap(doc => doc.files))

    const isUpdSlug = computed(() => UPD_SLUGS.includes(props.slug))
    const updLoading = ref(false)
    const printUpd = async () => {
        if (updLoading.value) return
        updLoading.value = true
        try {
            await openUpdPdf(props.slug, [props.id])
        } finally {
            updLoading.value = false
        }
    }

    const print = () => {
        for (const file of checkedFiles.value) {
            window.open(file.url, '_blank', 'noopener')
        }
    }

    const load = async () => {
        if (!props.id || !props.slug) return
        loading.value = true
        try {
            const url = routes.relations.printDocs.replace('${slug}', props.slug).replace('${id}', props.id)
            const response = await api.callMethod('GET', url)
            docs.value = response.status == 200 ? (response.data?.data ?? []) : []
            checked.value = {}
        } catch (e) {
            docs.value = []
        } finally {
            loading.value = false
        }
    }

    onMounted(load)
    watch(() => [props.slug, props.id, relationsVersion.value], load)
</script>
