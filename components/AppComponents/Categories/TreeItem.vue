<template>
    <div class="categories__node">
        <div class="categories__item categories__item_tree" :class="{'categories__item_active': props.item.id == props.active}">
            <span
                class="categories__toggle"
                :class="{'categories__toggle_hidden': !hasChildren, 'categories__toggle_closed': !open}"
                @click.stop="hasChildren ? open = !open : null"
            >
                <IconTriangle />
            </span>
            <span class="categories__text" @click="emit('action', {action: 'set', value: props.item})">
                {{ props.item.name }}
            </span>

            <AppShowMore
                v-if="props.modalActions && props.modalActions.length"
                :isPreventBottom="true"
                :options="props.modalActions"
                @initClick="action => emit('action', {action: action, value: props.item})"
            />
        </div>
        <div class="categories__children" v-if="open && hasChildren">
            <TreeItem
                v-for="child in props.item.children"
                :key="child.id"
                :item="child"
                :active="props.active"
                :modalActions="props.modalActions"
                @action="action => emit('action', action)"
            />
        </div>
    </div>
</template>

<script setup>
    import './Categories.scss';
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'

    const emit = defineEmits([
        'action'
    ])

    const props = defineProps({
        active: {
            default: null
        },
        item: {
            default: {},
            type: Object
        },
        modalActions: {
            default: [],
            type: Array
        }
    })

    const open = ref(false)

    const hasChildren = computed(() => {
        return Array.isArray(props.item.children) && props.item.children.length > 0
    })
</script>
