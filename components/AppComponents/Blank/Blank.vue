
<template>
    <div class="blank">
        <span class="blank__title">
            {{ props.item.title }}
        </span>
        <a 
            v-if="props.options.isLink && props.item.link"
            :href="props.item.link" 
            target="_blank" 
            class="blank__link" 
            :class="{'blank__text_empty': props.options.isCheckEmpty && !props.item.text, 'blank__text_default': !props.item.link}"
        >
            {{ props.item.text ? props.item.text.value ?? props.item.text : '' }}
        </a>
        <p 
            v-else 
            class="blank__text" 
            :class="{
                'blank__text_empty': props.options.isCheckEmpty && !props.item.text
            }"
            :style="{'--colorText': props.options?.color ?? '#000'}"
        >
            {{ props.item.text ? props.item.text.value ?? props.item.text : '' }}
        </p>
    </div>
</template>

<script setup>
    import './Blank.scss';
    
    const props = defineProps({
        item: {
            default: {
                title: '',
                link: '',
                text: ''
            },
            type: Object
        },
        options: {
            default: {
                color: null,
                isCheckEmpty: false,
                isLink: false
            },
            type: Object
        }
    })
</script>
