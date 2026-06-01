<template>
    <div class="fancybox-item fancybox__item" itemscope itemtype="https://schema.org/ImageGallery">
        <a
            class="fancybox-item__link"
            :data-fancybox="isDocument ? null : `fansy-box__${props.id}`"
            :href="setUrl"
            :target="isDocument ? '_blank' : null"
            :rel="isDocument ? 'noopener' : null"
            :download="isDownload ? (props.image?.name ?? '') : null"
            itemprop="url"
        >
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

    // Иконки-заглушки означают, что это документ (не изображение):
    // его нужно открыть/скачать настоящим файлом, а не показывать в галерее fancybox.
    const documentIcons = ['pdf.svg', 'pdfSmall.svg', 'undefinedFile.svg', 'word.svg', 'xls.svg']
    // Эти типы браузер не отображает — их скачиваем.
    const downloadIcons = ['undefinedFile.svg', 'word.svg', 'xls.svg']

    const isDocument = computed(() => {
        return !!props.image?.thumbnail_path && documentIcons.some(icon => props.image.thumbnail_path.endsWith(icon))
    })

    const isDownload = computed(() => {
        return !!props.image?.thumbnail_path && downloadIcons.some(icon => props.image.thumbnail_path.endsWith(icon))
    })

    const setUrl = computed(() => {
        // Всегда ссылаемся на настоящий файл: изображение покажет fancybox,
        // документ (pdf/excel/word) откроет/скачает браузер.
        if (props.image?.path && props.image?.thumbnail_path) {
            return props.image.path
        } else {
            return null
        }
    })
</script>
