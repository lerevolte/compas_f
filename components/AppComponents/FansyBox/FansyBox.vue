<template>
    <div class="fansy-box" ref="fansyBoxRef">
        <slot></slot>
    </div>
</template>

<script setup>
    import './FansyBox.scss';
    import '@fancyapps/ui/dist/fancybox/fancybox.css';

    import { ref, onMounted } from 'vue';
    import { Fancybox } from '@fancyapps/ui';

    const options = {
        dragToClose: false,
        Carousel: {
            infinite: true
        }
    };

    const fansyBoxRef = ref(null);

    onMounted(() => {
        Fancybox.bind(fansyBoxRef.value, '[data-fancybox]', options);
    });

    defineExpose({ fansyBoxRef });
</script>