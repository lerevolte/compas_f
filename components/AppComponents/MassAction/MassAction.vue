<template>
    <div class="section-table__mass-action mass-action" v-if="props.isChoosed">
        <div 
            v-if="props.isChoosed" 
            class="mass-action__groups" 
            :style="`--grid-columns: ${props.actions.delete ? '1fr auto' : '1fr'}`"
        >
            <div class="mass-action__group">
                <AppButton 
                    class="button_fill" 
                    v-if="props.actions.restore"
                    @click="emit('action', {action: 'initRestore', value: true})"
                >
                    Восстановить
                </AppButton>
                <AppButton 
                    class="button_icon" 
                    v-else-if="props.actions.edit"
                    @click="emit('action', {action: 'initEdit', value: true})"
                >
                    <IconActionEdit />
                    Редактировать
                </AppButton>
                <AppButton 
                    v-else-if="props.actions.save"
                    class="button_fill" 
                    :class="{'skeleton' : props.loading}" 
                    @click="emit('action', {action: 'save', value: true})"
                >
                    Сохранить
                </AppButton>
                <AppButton @click="emit('action', {action: 'cancel', value: true})">
                    Отмена
                </AppButton>
            </div>
            <div class="mass-action__group" v-if="props.actions.delete">
                <AppButton class="button_icon" @click="emit('action', {action: 'initDelete', value: true})">
                    <IconActionDeleteCross />
                    Удалить
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './MassAction.scss';
    
    import AppButton from '@AppComponents/Button/Button.vue';
    import IconActionEdit from '@AppIcons/Actions/Edit.vue';
    import IconActionDeleteCross from '@AppIcons/Actions/DeleteCross.vue';

    const emit = defineEmits([
        'action'
    ])

    const props = defineProps({
        isChoosed: {
            default: false,
            type: Boolean
        },
        actions: {
            default: {
                save: false,
                edit: false,
                cancel: false,
                delete: false,
                restore: false
            },
            type: Object
        },
        loading: {
            default: false,
            type: Boolean
        }
    })
</script>
