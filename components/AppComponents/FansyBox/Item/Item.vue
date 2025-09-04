<template>
    <div class="fancybox-item fancybox__item" itemscope itemtype="https://schema.org/ImageGallery">
        <a class="fancybox-item__link" :data-fancybox="`fansy-box__${props.id}`" :href="props.image?.path" itemprop="url">
            <figure class="ibg fancybox-item__img" itemprop="image">
                <img :src="props.image?.thumbnail_path" :alt="props.image?.name" :title="props.image?.name" />
            </figure>
        </a>
    </div>
</template>

<script setup>
    import './Item.scss';

    const props = defineProps({
        id: String,
        image: {
            default: {
                path: "/undefined.svg",
                thumbnail_path: "/undefined.svg"
            },
            type: Object
        },
    })
</script>
