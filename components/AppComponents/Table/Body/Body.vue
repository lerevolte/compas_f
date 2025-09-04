<template>
    <tbody class="table__body">
        <tr class="table__row" v-for="(tr, index) in table.body">
            <td class="table__item" v-for="td in table.header">
                <span class="table__label" :class="{ 'skeleton': props.loading || props.filtering }">
                    {{ td.title }}
                </span>
                <div 
                    v-if="td.type === 'date'" 
                    class="table__item-text" 
                    :class="{ 'skeleton': props.loading || props.filtering }"
                >
                    {{ tr[td.key] ? format(new Date(tr[td.key]), 'dd.MM.yyyy') : null }}
                </div>
                <template v-else-if="td.type == 'file' || td.formatter == 'file'" >
                    <figure class='ibg fancybox-item__img' v-if="!tr[td.key] || !tr[td.key].path">
                        <img src='/undefined.svg' alt=''>
                    </figure>
                    <FansyBox v-else :class="{ 'skeleton': props.loading || props.filtering }">
                        <FansyBoxItem 
                            :image="tr[td.key]"
                        />
                    </FansyBox>
                </template>
                <AppSelect 
                    v-else-if="td.type == 'select'"
                    :options="td"
                    v-model="tr[td.key]"
                />
                <div 
                    v-else-if="td.key == 'price'" 
                    class="table__item-text" 
                    :class="{ 'skeleton': props.loading || props.filtering }"
                >
                    {{ common.transformPrice(tr.price ?? 0, 0) }}
                </div>

                <div 
                    v-else 
                    class="table__item-text" 
                    :class="{ 'skeleton': props.loading || props.filtering }"
                >
                    {{ tr[td.key] }}
                </div>
            </td>

            <td class="table__item table__item_actions" v-if="!props.loading">
                <div class="table__icon" v-for="action in table.actions" :data-key="action">
                    <component
                        :is="actions[action].component"
                        :title="actions[action].name"
                        @click="table.emitRowAction({ type: actions[action].type, action: actions[action].action, value: tr })"
                    />
                </div>
            </td>
        </tr>
    </tbody>
</template>

<script setup>
    import './Body.scss';
    
    import FansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import FansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import { format  } from 'date-fns'
    import { Common } from '@/helpers/classes.js'

    const table = inject('table')

    const props = defineProps({
        loading: {
            default: false,
            type: Boolean
        },
        filtering: {
            default: false,
            type: Boolean
        },
        localLoading: {
            default: false,
            type: Boolean
        }
    })

    const actions = {
        edit: {
            name: 'Редактирование',
            type: 'modal',
            action: 'edit', 
            component: markRaw(defineAsyncComponent(() => import('@AppIcons/Actions/Edit.vue')))
        },
        delete: {
            name: 'Удаление',
            type: 'modal',
            action: 'delete',
            component: markRaw(defineAsyncComponent(() => import('@AppIcons/Actions/Delete.vue')))
        }
    }

    const common = new Common()
</script>
