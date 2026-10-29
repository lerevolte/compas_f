<template>
    <div class="products-check" v-if="warnings.length">
        <div class="products-check__title">
            Расхождения с документом «{{ parent?.name }}» ({{ parent?.entity_title }})
        </div>
        <ul class="products-check__list">
            <li class="products-check__item" v-for="(warning, index) in warnings" :key="index">
                <b>{{ warning.name }}</b>: {{ warning.text }}
            </li>
        </ul>
    </div>
</template>

<script setup>
    import './ProductsCheck.scss'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common } from '@AppHelpers/classes.js'

    const props = defineProps({
        slug: {
            default: null,
            type: String
        },
        id: {
            default: null,
            type: [Number, String]
        },
        rows: {
            default: () => [],
            type: Array
        },
        source: {
            default: null,
            type: Object
        }
    })

    const common = new Common()
    const parent = ref(null)
    const limits = ref([])
    const priceKey = ref('product_price')
    const relationsVersion = useState('object-relations-version', () => 0)

    const load = async () => {
        const isDraft = !props.id || props.id == 0
        if (!props.slug || (isDraft && !(props.source?.slug && props.source?.id))) {
            parent.value = null
            limits.value = []
            return
        }
        try {
            let url = routes.relations.productsCheck.replace('${slug}', props.slug).replace('${id}', isDraft ? 0 : props.id)
            if (isDraft) {
                url += `?parent_slug=${encodeURIComponent(props.source.slug)}&parent_id=${encodeURIComponent(props.source.id)}`
            }
            const response = await api.callMethod('GET', url)
            parent.value = response?.status == 200 ? (response.data?.parent ?? null) : null
            limits.value = response?.status == 200 ? (response.data?.limits ?? []) : []
            priceKey.value = response?.status == 200 ? (response.data?.price_key ?? 'product_price') : 'product_price'
        } catch (e) {
            parent.value = null
            limits.value = []
        }
    }

    const limitFor = (row) => {
        const id = Number(row.id || row.product_id?.value?.[0] || 0)
        const name = String(row.product_name ?? '').trim().toLowerCase()
        return limits.value.find(l => (id && l.id === id) || (!id && name && String(l.name).trim().toLowerCase() === name))
    }

    const format = (value) => common.transformPrice(Number(value || 0), 2)

    const warnings = computed(() => {
        if (!parent.value || !limits.value.length) return []
        const result = []
        for (const row of props.rows || []) {
            const limit = limitFor(row)
            const name = String(row.product_name ?? '').trim() || 'Товар'
            if (!limit) {
                result.push({ name, text: 'нет в составе документа-основания' })
                continue
            }
            const count = Number(row.product_count || 0)
            const price = Number(row[priceKey.value] || 0)
            if (limit.is_service) {
                if (Number(limit.price) > 0) {
                    const lineTotal = price * (count > 0 ? count : 1)
                    const limitTotal = Number(limit.price) * (Number(limit.count) > 0 ? Number(limit.count) : 1)
                    const othersPrice = Number(limit.used_others_price || 0)
                    if (lineTotal + othersPrice > limitTotal + 0.0001) {
                        result.push({
                            name,
                            text: `стоимость услуги ${format(lineTotal)}${othersPrice ? ` + в других документах ${format(othersPrice)}` : ''} — превышает ${format(limitTotal)} в основании`
                        })
                    }
                }
            } else {
                const total = count + Number(limit.used_others || 0)
                if (total > Number(limit.count) + 0.0001) {
                    const others = Number(limit.used_others || 0)
                    result.push({
                        name,
                        text: `в основании ${format(limit.count)} шт, здесь ${format(count)} шт${others ? ` + в других документах ${format(others)} шт` : ''} — превышение на ${format(total - Number(limit.count))} шт`
                    })
                }
                if (Number(limit.price) > 0 && price > Number(limit.price) + 0.0001) {
                    result.push({ name, text: `цена ${format(price)} выше цены в основании ${format(limit.price)}` })
                }
            }
        }
        return result
    })

    onMounted(load)
    watch(() => [props.slug, props.id, props.source?.slug, props.source?.id, relationsVersion.value], load)
</script>
