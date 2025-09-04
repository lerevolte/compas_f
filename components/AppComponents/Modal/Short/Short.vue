<template>
    <dialog class="modal modal_short" open>
        <div class="modal__background" @click="emit('close', true)"></div>

        <div class="modal__content">
            <div class="modal__close" @click="emit('close', true)">
                <IconClose />
                Закрыть
            </div>

            <div class="modal__body">
                <div class="modal__header" @click="emit('close', true)">
                    <IconSelectArrow />
                    <AppH2>
                        {{ props.options.title }}
                    </AppH2>
                </div>
    
                <div class="modal__fields">
                    <template v-for="field in form.fields">
                        <AppBlank 
                            v-if="!field.edit"
                            :class="{'modal__field_hide': field.hide_in_modal}"
                            :item="{
                                title: field.title,
                                text: form.setValue(field)
                            }"
                        />
                        <template v-else>
                            <AppSelect 
                                v-if="field.type == 'select' || (field.type == 'relation' && field.formatter != 'file') "
                                :options="field"
                                v-model="form.request[field.key]"
                            />
                            <AppFile 
                                v-else-if="field.type == 'file' || field.formatter == 'file'" 
                                :options="field"
                                v-model="form.request[field.key]"
                            />
                            <AppInput
                                v-else
                                :options="field"
                                v-model="form.request[field.key]"
                            />
                        </template>
                    </template>
                </div>
    
                <div class="modal__buttons">
                    <AppButton 
                        class="button_fill" 
                        :class="[`button_${props.options.type}`, {'skeleton' : props.loading}]" 
                        @click="emit('action', {
                            action: props.options.action,
                            value: form.request
                        })">
                        {{ props.options.actionTitle }}
                    </AppButton>
                    <AppButton @click="emit('close', true)">
                        Отмена
                    </AppButton>
                </div>
            </div>
        </div>
    </dialog>
</template>

<script setup>
    import './Short.scss';
    
    import IconClose from '@AppIcons/Close.vue';
    import AppH2 from '@AppComponents/Headers/H2/H2.vue';
    import AppButton from '@AppComponents/Button/Button.vue';
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
    import AppBlank from '@AppComponents/Blank/Blank.vue';
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue';
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import IconSelectArrow from '@AppIcons/Input/SelectArrow.vue';
    import { format  } from 'date-fns'

    const emit = defineEmits([
        'close',
        'action'
    ])

    const props = defineProps({
        options: {
            default: {
                title: '',
                desc: '',
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

    class Form {
        constructor() {
            this.fields = []
            this.request = {}
        }

        get() {
            this.fields = JSON.parse(JSON.stringify(props.fields))

            this.fields.forEach(element => {
                this.request[element.key] = props.options.value ? props.options.value[element.key] ? JSON.parse(JSON.stringify(props.options.value[element.key])) : null : null

                if (element.type == 'relation' && element.formatter != 'file') {
                    element.list = this.request[element.key] ? [{
                        label: this.request[element.key]?.name,
                        value: this.request[element.key]?.id
                    }] : []

                    this.request[element.key] = this.request[element.key]?.id
                }
            });
        }

        setValue(field) {
            if (field.type == 'date') {
                return format(form.value.request[field.key], 'dd.MM.yyyy')
            } else if (field.key == 'total_amount') {
                // Преобразование цены
                const transformPrice = (text) => {
                    return parseFloat(text).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                return transformPrice(Number(form.value.request.quantity) * Number(form.value.request.price))
            } else {
                return form.value.request[field.key]
            } 
        }
    }

    const form = ref(new Form())
    
    onMounted(() => {
        form.value.get()
    })
</script>
