<template>
    <figure class='icon_plus'>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11"><path fill="#1253a2" fill-rule="evenodd" d="M5.5 0a.5.5 0 0 1 .5.5V5h4.5a.5.5 0 1 1 0 1H6v4.5a.5.5 0 1 1-1 0V5.999L.5 6a.5.5 0 1 1 0-1L5 4.999V.5a.5.5 0 0 1 .5-.5"/></svg>
    </figure>
</template>

<style scoped lang="scss">
    @use '@/assets/variables.scss' as variables;
    @use '@/assets/mixins.scss' as mixins;

    .icon_plus {
        display: flex;
    }

    button {
        .icon_plus {
            svg {
                @include mixins.resolution(18px, 18px);
            }
        }
    }
</style>