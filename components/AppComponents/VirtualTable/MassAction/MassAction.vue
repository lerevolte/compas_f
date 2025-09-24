<template>
    <div class="section-table__mass-action mass-action" v-if="isChoosed">
        <div v-if="isChoosed && table.state != 'edit'" class="mass-action__groups" style="--grid-columns: 1fr auto">
            <div class="mass-action__group">
                <AppButton class="button_icon" @click="table.edit(table.body.filter(item => item.isChoose))">
                    <IconActionEdit />
                    Редактировать
                </AppButton>
                <AppButton @click="table.cancel()">
                    Отмена
                </AppButton>
            </div>
            <div class="mass-action__group">
                <AppButton class="button_icon" @click="table.initDelete(table.body.filter(item => item.isChoose))">
                    <IconActionDeleteCross />
                    Удалить
                </AppButton>
            </div>
        </div>

        <div class="mass-action__groups" style="--grid-columns: 1fr" v-else-if="isChoosed && table.state == 'edit'">
            <div class="mass-action__group">
                <AppButton class="button_fill" :class="{'skeleton' : table.saving}" @click="table.save()">
                    Сохранить
                </AppButton>
                <AppButton @click="table.cancel()">
                    Отмена
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

    const table = inject('table')

    const isChoosed = computed(() => {
        return table.value.body.filter(item => item.isChoose).length > 0
    })
</script>
