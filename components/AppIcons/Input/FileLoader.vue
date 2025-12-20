<template>
    <figure class="icon__loader-progress">
        <svg width="24" height="24">
            <circle cx="12" cy="12" r="10" :style="`stroke-dasharray: ${circumference}, ${circumference}; stroke-dashoffset: ${dashOffset};`"></circle>
        </svg>
    </figure>
</template>

<script setup>
    import { computed } from 'vue'

    const props = defineProps({
        progress: {
            default: 0,
            type: Number
        }
    })

    // Длина окружности: 2 * π * r = 2 * π * 10 ≈ 62.8
    const circumference = 2 * Math.PI * 10

    // Вычисляем offset: когда прогресс 0% - offset = circumference (круг не виден)
    // когда прогресс 100% - offset = 0 (круг полностью виден)
    const dashOffset = computed(() => {
        const progressPercent = Math.min(Math.max(props.progress, 0), 100) // Ограничиваем от 0 до 100
        return circumference - (circumference * progressPercent / 100)
    })

</script>

<style lang="scss">
    @use '@/assets/variables.scss' as variables;
    @use '@/assets/mixins.scss' as mixins;

    .icon__loader-progress {
        svg {
            stroke-width: 4;
            stroke: #0584fe;
            fill: none;
            transform-origin: center;
            transform: rotate(-90deg);
            z-index: 999;

            circle {
                transition: 0.6s ease;
            }
        }
    }
</style>