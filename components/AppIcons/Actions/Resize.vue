<template>
    <figure class='ibg icon__resize' ref="iconRef">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_2237_59)">
                <path d="M0.353516 6.71729L6.71748 0.353324" stroke="#A6B7D4"></path>
                <path d="M3.04004 6.57568L6.57557 3.04015" stroke="#A6B7D4"></path>
                <path d="M5.02051 7.14111L7.14183 5.01979" stroke="#A6B7D4"></path>
            </g>
            <defs>
                <clipPath id="clip0_2237_59">
                    <rect width="9" height="5" fill="white" transform="translate(0 6.36377) rotate(-45)"></rect>
                </clipPath>
            </defs>
        </svg>
    </figure>
</template>

<script setup>
    const iconRef = ref(null)

    defineExpose({ iconRef });
</script>