<template>
    <div class="fancybox-item fancybox__item" itemscope itemtype="https://schema.org/ImageGallery">
        <a class="fancybox-item__link" :data-fancybox="`fansy-box__${props.id}`" :href="setUrl" itemprop="url">
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

    const setUrl = computed(() => {
        if (props.image?.path && props.image?.thumbnail_path) {
            return ['pdf.svg', 'pdfSmall.svg', 'undefinedFile.svg', 'word.svg', 'xls.svg'].some(icon => props.image.thumbnail_path.endsWith(icon)) ? props.image.thumbnail_path : props.image.path 
        } else {
            return null
        }
    })
</script>
