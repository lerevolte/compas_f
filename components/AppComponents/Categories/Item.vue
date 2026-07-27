<template>
    <div class="categories__item" :class="{'categories__item_active': props.item.value == props.active}">
        <span class="categories__text" @click="emit('action', {action: 'set', value: props.item})">
            {{ props.item.label }}
        </span>

        <AppShowMore
            v-if="props.item.value != 1 && actions.length > 0"
            :isPreventBottom="true"
            :options="actions"
            @initClick="action => emit('action', {action: action, value: props.item})"
        />
    </div>
</template>

<script setup>
    import './Categories.scss';

    import { computed } from 'vue'
	import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'

    const emit = defineEmits([
        'action'
    ])

    const props = defineProps({
        active: {
            default: null
        },
        item: {
            default: {
                label: 'label',
                value: 'value'
            },
            type: Object
        },
        modalActions: {
            default: [
                {
                    name: 'label',
                    action: 'value'
                }
            ],
            type: Object
        },
    })

    const actions = computed(() => {
        const list = props.modalActions || []
        return props.item?.is_permanent ? list.filter(a => a.action != 'initDelete') : list
    })
</script>
