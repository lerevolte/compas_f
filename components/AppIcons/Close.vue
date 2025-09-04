<template>
    <figure class='icon__close'>
        <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0.5L1.00001 19.5" stroke="#404040" stroke-linecap="round"/>
            <path d="M1 0.5L20 19.5" stroke="#404040" stroke-linecap="round"/>
        </svg>
    </figure>
</template>

<style lang="scss">
    @use '@/assets/variables.scss' as variables;

    .icon__close {
        &:hover {
            svg {
                * {
                    stroke: variables.$color-icon-active;
                }
            }
        }
    }
</style>