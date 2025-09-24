<template>
    <AppVirtualTable 
        :slug="props.slug"
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
</script>
