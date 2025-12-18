<template>
    <div class="validate__header">
        <p class="text">
            ID: <strong> {{ props.id }} </strong>
        </p>
        <p class="text">
            Необходимо заполнить обязательные поля
        </p>
    </div>
    <AppTileSection 
        class="validate__section"
        :section="props.section"
        :options="{
            isDisableFooter: true,
            isGlobalEdit: true,
        }"
        :sectionClass="props.sectionClass"
    />
</template>

<script setup>
    import './Validate.scss';

	import AppTileSection from '@AppComponents/TileSection/TileSection.vue';

    const props = defineProps({
        id: {
            default: 0
        },
        sectionClass: {
            default: null,
            type: Object
        },
        section: {
            default: null,
            type: Object
        }
    })

    onMounted(() => {
        console.log('props', props);
    })
</script>
