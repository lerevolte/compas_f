<template>
    <div class="loader"></div>
</template>

<style lang="scss">
    .loader {
        color: #0584fe;
        position: absolute;
        height: 100%;
        width: 100%;

        &:after {
            animation: loaderAnimate 1s ease infinite;
            border: 4px solid #0584fe;
            border-radius: 50%;
            border-top-color: #fff;
            bottom: 0;
            content: "";
            left: 0;
            margin: auto;
            position: absolute;
            right: 0;
            top: 0;
            width: 30px;
            aspect-ratio: 1;
        }
    }


    @keyframes loaderAnimate {
        from {
        transform: rotate(0turn);
        }

        to {
        transform: rotate(1turn);
        }
    }

</style>