<template>
    <main>
        <AppCarrierSalary @openModal="item => emit('openModal', item)" />
    </main>
</template>

<script setup>
    import AppCarrierSalary from '@AppTemplates/CarrierSalary/CarrierSalary.vue';

    const emit = defineEmits([
        'openModal'
    ]);

    onMounted(() => {
        useHead({ title: 'Зарплата перевозчиков | Compas.pro' });
    });
</script>
