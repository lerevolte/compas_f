<template>
    <aside class="categories">
        <div class="categories__header">
            <slot name="name"></slot>

            <AppButton v-if="props.options?.isHaveHeaderActions" class="button_text" @click="emit('action', {action: 'initCreate', value: null})">
                Создать
            </AppButton>
        </div>
        <div class="categories__body">
            <slot>
            <template v-for="item in props.list" :key="item.value">
                <details class="categories__item categories__item_details" v-if="item.children">
                    <summary class="categories__summary">
                        <IconTriangle />
                        {{ item.label }}
                    </summary>
                    <div class="categories__sublist">
                        <CategoriesItem 
                            v-for="child in item.children"
                            :active="props.active"
                            :item="child"
                            :modalActions="props.modalActions"
                            @action="action => emit('action', action)"
                        />
                    </div>
                </details>
                <CategoriesItem
                    v-else
                    :active="props.active"
                    :item="item"
                    :modalActions="props.modalActions"
                    @action="action => emit('action', action)"
                />
            </template>
            </slot>
        </div>
    </aside>
</template>

<script setup>
    import './Categories.scss';
    import AppButton from '@AppComponents/Button/Button.vue';
    import CategoriesItem from './Item.vue'
    import IconTriangle from '@AppIcons/Triangle.vue'

    const emit = defineEmits([
        'action'
    ])

    const props = defineProps({
        active: {
            default: null
        },
        list: {
            default: [
                {
                    label: 'label',
                    value: 'value'
                }
            ],
            type: Object
        },
        modalActions: {
            default: [
                {
                    name: 'label',
                    action: 'value'
                }
            ],
            type: Object
        },
        options: {
            isHaveHeaderActions: true
        }
    })
</script>
