<template>
    <Swiper 
        class="slider" 
        :modules="modules"
        :loop="true"
        :slides-per-view="props.options.perView ?? 1"
        :space-between="props.options.spaceBetween ?? 20"
        :centered-slides="props.options.centeredSlides ?? false"
        :autoplay="props.options.autoplay ?? {delay: 3000, disableOnInteraction: false}"
        navigation
        :pagination="props.options.pagination ?? {clickable: true}"
    >
        <slot name="slide"></slot>
    </Swiper>
</template>

<script setup>
    import './Slider.scss'
    import 'swiper/swiper-bundle.css';
    import { Swiper } from 'swiper/vue'; // Импорт компонентов
    import 'swiper/swiper-bundle.css'; // Импорт стилей, если ещё не импортированы
    import { Navigation, Pagination, Scrollbar, A11y, Autoplay  } from 'swiper/modules';

    const modules = [Navigation, Pagination, Scrollbar, A11y, Autoplay];

    const props = defineProps({
        options: {
            default: {
                perView: 1,
                spaceBetween: 20,
                centeredSlides: false,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: true
                },
                pagination: {
                    clickable: true
                }
            },
            type: Object
        }
    })
</script>