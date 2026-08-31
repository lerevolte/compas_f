<template>
    <div class="related">
        <IconLoader class="related__loader" v-if="loading" />

        <div class="related__empty" v-else-if="!nodes.length">
            Связанные объекты не найдены
        </div>

        <template v-else>
            <div
                class="related__card"
                v-for="node in nodes"
                :key="`${node.slug}_${node.id}`"
                :class="{ 'related__card_current': node.is_current }"
                :style="{ marginLeft: `${node.level * 30}px` }"
                @click="emit('openModal', { slug: node.slug, id: node.id })"
            >
                <div class="related__row">
                    <span class="related__entity">{{ node.entity_title }}:</span>
                    <span class="related__date" v-if="node.created_at">{{ node.created_at }}</span>
                </div>
                <div class="related__row">
                    <span class="related__label">Название:</span>
                    <span class="related__value">{{ node.name }}</span>
                </div>
                <div class="related__row">
                    <span class="related__label">ID:</span>
                    <span class="related__value">{{ node.id }}</span>
                </div>
                <div class="related__row related__products" v-if="node.products && node.products.length">
                    <span class="related__label">Состав:</span>
                    <span class="related__value">
                        <template v-for="(product, index) in node.products" :key="index">{{ index ? ', ' : '' }}{{ product.name }} <b>{{ product.count }} шт.</b></template>
                    </span>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
    import './RelatedObjects.scss'

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue'

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

    const nodes = ref([])
    const loading = ref(false)
    const relationsVersion = useState('object-relations-version', () => 0)

    const flatten = (node, level = 0, acc = []) => {
        if (!node) return acc
        acc.push({ ...node, level })
        for (const child of node.children ?? []) {
            flatten(child, level + 1, acc)
        }
        return acc
    }

    const load = async () => {
        if (!props.id || !props.slug) return
        loading.value = true
        try {
            const url = routes.relations.tree.replace('${slug}', props.slug).replace('${id}', props.id)
            const response = await api.callMethod('GET', url)
            nodes.value = response.status == 200 ? flatten(response.data?.data ?? null) : []
        } catch (e) {
            nodes.value = []
        } finally {
            loading.value = false
        }
    }

    onMounted(load)
    watch(() => [props.slug, props.id, relationsVersion.value], load)
</script>
