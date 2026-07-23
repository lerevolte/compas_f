<template>
    <main>
        <div class="page__header">
            <AppH1 id="mobile-menu-target"></AppH1>
        </div>
        <IconLoader class="detail_loader" />
    </main>
</template>

<script setup>
    import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import IconLoader from '@AppIcons/Loader.vue';

    useHead({
        title: 'Compas.pro'
    })
</script>
