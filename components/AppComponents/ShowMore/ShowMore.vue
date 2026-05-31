<template>
    <AppPopup
        ref="popupRef"
        class="show-more settings"
        :parentContainer="props.parentContainer"
        :isPreventBottom="props.isPreventBottom"
        :forceFloating="true"
    >
        <template #header>
            <IconShowMore />
        </template>
        <template #content>
            <div 
                v-for="option in props.options" 
                class="popup__option" 
                :data-action="option.action" 
                :class="{ 
                    'popup__option_red': ['delete', 'initDelete'].includes(option.action),
                    'popup__option_disable': !option.enabled
                }" 
                @click="initClick(option.action)"
            >
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
        // Popup закрывает себя сам через делегированный @click по
        // .popup__option (см. Popup.vue → onContentClick). Раньше тут было
        // popupRef.value.popup.popupRef.classList.remove('popup_open'), но
        // после markRaw popupRef внутри Popup стал обычным Vue-ref'ом,
        // и `popup.popupRef.classList` снаружи — undefined → TypeError.
        emit('initClick', action)
    }

</script>
