<template>
    <AppPopup ref="popupRef" class="show-more settings" :parentContainer="props.parentContainer" :isPreventBottom="props.isPreventBottom">
        <template #header>
            <IconShowMore />
        </template>
        <template #content>
            <div class="popup__option" :data-action="option.action" :class="{ 'popup__option_red': ['delete', 'initDelete'].includes(option.action) }" v-for="option in props.options" @click="initClick(option.action)">
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
        },
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        parentContainer: {
            default: null
        }
    })

    const popupRef = ref(null)

    const initClick = (action) => {
        popupRef.value.popup.popupRef.classList.remove('popup_open');
        emit('initClick', action)
    }

</script>
