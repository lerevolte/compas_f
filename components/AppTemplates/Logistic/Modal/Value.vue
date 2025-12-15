<template>
    <figure class='modal-step__icon'>
        <img 
            v-if="props.item.label.file"
            class="modal-step__icon-img"
            :src="props.item.label.file"
            alt=''
        >
        <div 
            v-else 
            class="img-text" 
            :style="{ 
                '--bgColor': props.item.label.color == '' || props.item.label.color ? '#a6b7d4' : props.item.label.color 
            }"
        >
            {{props.item.label.text ? props.item.label.text.slice(0, 1) ?? 'Н' : 'Н'}}
        </div>
        <figcaption class="modal-step__title">
            {{props.item.label.text}}
        </figcaption>
    </figure>
</template>

<script setup>
    const props = defineProps({
        item: {
            default: {
                label: {
                    text: null,
                    color: null,
                    file: null,
                },
                value: null
            },
            type: Object
        }
    })
</script>
