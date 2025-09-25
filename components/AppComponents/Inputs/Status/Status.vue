<template>
    <div class="form__item form__item_status">
        <span class="form__item-title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </span>

        <div class="status" ref="statusRef" :class="{ 'status_open': status.state.isOpen }">
            <div class="status__content" @click="event => status.toggleOptions(event)">
                <IconWarning v-if="props.options.required && !activeOption"/>
                <figure class="status__value">
                    <div class="status__rect">
                        <img class="status__value-rect" v-if="activeOption?.label?.file != '' && activeOption?.label?.file != null" :src="activeOption?.label?.file" />
                        <div class="status__value-rect" v-else :style="`--bgColor: ${activeOption?.label?.color}`"></div>
                        <figure class='status__arrow'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="3" fill="none" viewBox="0 0 4 3"><path fill="#888" d="M0 0h4L2 3z"/></svg>
                        </figure>
                    </div>

                    <figcaption class="status__value-text">
                        {{ activeOption?.label.text }}
                    </figcaption>
                </figure>
            </div>
            <div class="status__options">
                <div class="status__option" v-if="props.options.isHaveNull" :value="null" @click="status.changeValue({ value: null })">
                    Не выбрано
                </div>

                <div 
                    class="status__option" 
                    v-for="option in status.state.list.filter(p => !p.label.is_hidden)"
                    :class="{ 'status__option_active': props.modelValue && (props.modelValue == option.value || (Array.isArray(props.modelValue) && props.modelValue.includes(option.value)))}" 
                    :value="option.value" 
                    @click="status.changeValue(option)"
                >
                    <span class="value__text">
                        {{ option.label.text ? option.label.text : option.label }} 
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Status.scss';
    
    import IconWarning from '@AppIcons/Warning.vue';

    const statusRef = ref(null)

    const emit = defineEmits([
        'update:modelValue'
    ])

    class Status {
        constructor() {
            this.statusRef = statusRef;

            this.state = reactive({
                list: [],
                isOpen: false
            });

            // Закрытие опций
            this.closeOptions = (event) => {
                if (this.statusRef.value && !this.statusRef.value.contains(event.target)) {
                    this.state.isOpen = false;
                    this.state.list = props.options.list
                    document.removeEventListener('click', this.closeOptions);
                }
            };
        }

        // Получение активных опций
        getActiveOptions(value) {
            return this.state.list ? this.state.list.find(p => p.value == value) ?? this.state.list[0] : this.state.list[0]
        }

        // Изменение значения
        changeValue(option) {
            this.toggleOptions()
            emit('update:modelValue', option.value)
        }

        // Открытие/закрытие опций
        toggleOptions() {
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                document.addEventListener('click', this.closeOptions);
            } else {
                this.state.list = props.options.list

                console.log(this.state.list);
                
                document.removeEventListener('click', this.closeOptions);
            }
        }
    }

    const status = new Status(statusRef)
    const activeOption = computed(() => status.getActiveOptions(props.modelValue))

    const props = defineProps({
        options: {
            default: {
                id: 0,
                title: '',
                list: [],
                name: '',
                required: false,
                isHaveNull: false,
                type: 'status',
                placeholder: '' 
            },
            type: Object
        },
        modelValue: null
    })

    onMounted(() => {
        status.state.list = props.options.list ?? []
    })

    watch(() => props.options.list, () => {
        status.state.list = props.options.list ?? []
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', status.closeOptions);
    });
</script>
