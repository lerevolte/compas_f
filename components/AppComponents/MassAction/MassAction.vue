<template>
    <div class="section-table__mass-action mass-action" v-if="props.isChoosed">
        <div
            v-if="props.isChoosed"
            class="mass-action__groups"
        >
            <div class="mass-action__group mass-action__group_checked" v-if="props.checkedCount > 0">
                <span class="text text_accent">Выбрано:</span>
                <span class="text">{{ props.checkedCount }}</span>
            </div>
            <div class="mass-action__group mass-action__group_main">
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
            <div class="mass-action__group mass-action__group_delete">
                <AppButton class="button_icon" v-if="props.actions.delete" @click="emit('action', {action: 'initDelete', value: true})">
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
        checkedCount: {
            default: 0,
            type: Number
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
