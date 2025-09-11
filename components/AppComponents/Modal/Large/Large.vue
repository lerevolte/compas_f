<template>
    <dialog class="modal modal_large" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <div class="modal__close" @click="emit('close', true)">
                <IconClose />
                Закрыть
            </div>

            <div class="modal__body">
                <div class="modal_header">
                    <div class="modal__header" @click="emit('close', true)">
                        <SelectArrowSubmenu />
                        <AppH2>
                            {{ props.options.title }}
                        </AppH2>
                    </div>
                </div>


                <section class="modal__section">
                    <AppTable 
                        :table="table.content"
                        :loading="table.loading"
                        :localLoading="table.localLoading"
                        :filtering="table.filter.filtering"
                        @action="item => item.type == 'modal' ? table.modal[item.action](item.value) : table[item.action](item.value)"
                    />
                </section>

                <AppModalWarning 
                    v-if="table.modal.isOpen && table.modal.type == 'warning'" 
                    :options="table.modal.form"
                    :loading="table.modal.loading"
                    @action="item => table[item.action](item.value)"
                    @close="table.modal.toggleOpen(false)"
                />

                <AppModalShort 
                    v-if="table.modal.isOpen && table.modal.type == 'short'" 
                    :loading="table.modal.loading"
                    :fields="table.modal.fields.active"
                    :options="table.modal.form"
                    @action="item => table[item.action](item.value)"
                    @close="table.modal.toggleOpen(false)"
                />

            </div>
        </div>
    </dialog>
</template>

<script setup>
    import './Large.scss';
    
    import IconClose from '@AppIcons/Close.vue';
    import AppH2 from '@AppComponents/Headers/H2/H2.vue'
    import AppTable from '@AppComponents/Table/Table.vue'
    import AppModalShort from '@AppComponents/Modal/Short/Short.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import SelectArrowSubmenu from '@AppIcons/Input/SelectArrowSubmenu.vue';
    import { Table } from '@/helpers/classes.js'

    const emit = defineEmits([
        'close',
        'action'
    ])

    const props = defineProps({
        options: {
            default: {
                title: '',
                desc: '',
                slug: '',
                value: null,
                type: 'warning',
                action: 'submit',
                actionTitle: 'Принять'
            },
            type: Object
        },
        fields: {
            default: [],
            type: Array
        },
        loading: {
            default: false,
            type: Boolean
        }
    })

    const table = ref(new Table(props.options.slug, props.options.options.dependences))

    onMounted(() => {
        table.value.get()
    })
</script>
