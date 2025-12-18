<template>
    <figure class='arrow-back'>
        <svg width="6" height="9" viewBox="0 0 6 9" xmlns="http://www.w3.org/2000/svg"><path d="M.915 8.943 5.25 4.675a.344.344 0 0 0 .068-.222.344.344 0 0 0-.068-.222L.915.066a.587.587 0 0 0-.683.102C.027.35-.03.578.06.851l3.688 3.585L.06 8.056c-.114.25-.068.489.137.716.204.228.443.285.717.171z" fill="#000" fill-rule="evenodd"></path></svg>
    </figure>
</template>

<style scoped lang="scss">
    .arrow-back {
        display: flex;
        position: relative;
        align-items: center;

        svg {
            transform: rotate(180deg);
            position: absolute;
            top: 0px;
            left: 0px;
            width: 100%;
            height: 100%;
            object-fit: contain;

            * {
                fill: #a6b7d4;
            }
        }
    }
</style>