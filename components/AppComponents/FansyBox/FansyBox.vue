<template>
    <div class="fansy-box" ref="fansyBoxRef">
        <slot></slot>
    </div>
</template>

<script setup>
    import './FansyBox.scss';
    import '@fancyapps/ui/dist/fancybox/fancybox.css';

    import {Fancybox} from "@fancyapps/ui";

    const options = {
        Carousel: {
            infinite: false,
        },
        idle: false
    }

    const fansyBoxRef = ref(null);

    onMounted(() => {
        Fancybox.bind(fansyBoxRef.value, '[data-fancybox]', {
            ...(options || {}),
        });
    });

    defineExpose({ fansyBoxRef })
</script>