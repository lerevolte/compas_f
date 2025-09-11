<template>
    <AppPopup ref="popupRef" class="show-more settings">
        <template #header>
            <IconShowMore />
        </template>
        <template #content>
            <div class="popup__option" :class="{ 'popup__option_red': option.action == 'delete'}" v-for="option in props.options" @click="initClick(option.action)">
                {{ option.name }}
            </div>
            <slot></slot>
        </template>
    </AppPopup>
</template>

<script setup>
    import './ShowMore.scss';
    
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import IconShowMore from '@AppIcons/Actions/ShowMore.vue'

    const emit = defineEmits([
        'initClick'
    ])

    const props = defineProps({
        options: {
            default: [
                {
                    name: "",
                    action: ""
                }
            ],
            type: Object
        }
    })

    const popupRef = ref(null)

    const initClick = (action) => {
        popupRef.value.popup.popupRef.classList.remove('popup_open');
        emit('initClick', action)
    }

</script>
