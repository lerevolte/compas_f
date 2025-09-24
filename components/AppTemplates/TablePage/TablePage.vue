<template>
    <AppVirtualTable 
        :slug="props.slug"
        @openModal="item => emit('openModal', item)"
    />
    <div id="mass-action-container"></div>
</template>

<script setup>
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';

    const props = defineProps({
        slug: {
            default: '',
            type: String
        }
    })

    const emit = defineEmits([
        'openModal'
    ])
</script>
