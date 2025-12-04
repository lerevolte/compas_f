<template>
    <section 
        class="resize" 
        :style="`
            --heightSection: ${props.options.height}; 
            --widthSection: ${props.options.width}
        `">
        <slot></slot>
    </section>
</template>

<script setup>
    import './Resize.scss';
    
    const props = defineProps({
        options: {
            default: {
               height: '100%',
               width: '100%' 
            },
            type: Object
        }
    })
</script>
