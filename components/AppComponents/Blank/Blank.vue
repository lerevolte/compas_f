
<template>
    <div class="blank">
        <span class="blank__title">
            {{ props.item.title }}
        </span>
        <p class="blank__text">
            {{ props.item.text }}
        </p>
    </div>
</template>

<script setup>
    import './Blank.scss';
    
    const props = defineProps({
        item: {
            default: {
                title: '',
                text: ''
            },
            type: Object
        }
    })
</script>
