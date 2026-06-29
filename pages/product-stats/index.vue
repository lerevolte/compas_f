<template>
    <main>
        <AppProductStats @openModal="item => emit('openModal', item)" />
    </main>
</template>

<script setup>
    import AppProductStats from '@AppTemplates/ProductStats/ProductStats.vue';

    const emit = defineEmits([
        'openModal'
    ]);

    onMounted(() => {
        useHead({ title: 'Статистика товаров по дням | Compas.pro' });
    });
</script>
