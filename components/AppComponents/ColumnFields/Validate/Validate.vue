<template>
    <AppModalWarning>
        <AppTileSection 
            class="page__section"
            :section="documents.section"
            :options="{
                isDisableFooter: true,
                isGlobalEdit: false,
            }"
            :sectionClass="props.sectionClass"
        />
    </AppModalWarning>

</template>

<script setup>
    import './Validate.scss';

    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
	import AppTileSection from '@AppComponents/TileSection/TileSection.vue';

    const props = defineProps({
        sectionClass: {
            default: null,
            type: Object
        }
    })
</script>
