<template>
    <div class="history">
        <div class="history__header">
            {{ props.title }}
            <slot name="actions" />
        </div>
        <div class="history__body">
            <div class="history__group history-group" v-for="group in Object.keys(history.list)" :key="group">
                <div class="history-group__header">
                    {{ format(group, 'dd.MM.yyyy') }}
                </div>

                <div class="history-group__list">
                    <div class="history-group__list-item" v-for="item in history.list[group]" :key="item.id">
                        <figure class='ibg history-group__icon'>
                            <img :src='history.icons[item.event ?? "default"]' alt=''>
                        </figure>

                        <div class="history-group__item history-item">
                            <div class="history-item__header">
                                <div class="history-item__group">
                                    <p class="text" :style="`--accentColor: ${item.color}`" v-if="!item.show_title">
                                        Изменение поля:
                                    </p>
                                    <div class="history-item__date">
                                        {{ item.created_at }}
                                    </div>
                                </div>


                                <figure class='ibg history-item__user' v-if="item.user?.id" :title="item.user.name" :style="`--backgroundColor: ${item.user.color};`" @click="history.openModal({slug: 'users', id: item.user.id}, false)">
                                    <img :src='item.user.icon' alt='' v-if="item.user.icon">
                                    <figcaption v-else>
                                        {{ item.user.ab }}
                                    </figcaption>
                                </figure>
                            </div>
                            <div class="history-item__body" v-if="item.show_title">
                                <div class="history-item__values">
                                    <strong 
                                        class="text"
                                        v-html="item.field.title"
                                        :style="`--accentColor: ${item.color}`" 
                                        @click="(e) => e.target.closest('span') && history.openModal(e.target.closest('span'), true)"
                                    ></strong>
                                </div>
                            </div>

                            <div class="history-item__body" v-else>
                                <p class="text"> {{ item.field.title }}: </p>
                                <div class="history-item__values">
                                    <p 
                                        class="text" 
                                        :class="{'text_empty': history.checkValue(item.field.prev_value)}" 
                                        v-html="item.field.prev_value"
                                        @click="(e) => e.target.closest('span') && history.openModal(e.target.closest('span'), true)"
                                    ></p> 
                                    <IconArrowBlue />
                                    <p 
                                        class="text" 
                                        :class="{'text_empty': history.checkValue(item.field.next_value)}" 
                                        v-html="item.field.next_value"
                                        @click="(e) => e.target.closest('span') && history.openModal(e.target.closest('span'), true)"
                                    ></p> 
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="history__footer">
            <AppButton 
                class="button_fill button_white" 
                v-if="history.pagination.current_page < history.pagination.last_page" 
                :class="{'skeleton' : props.loading}" 
                @click="history.showMore()"
            >
                Показать еще
            </AppButton>
        </div>
    </div>
</template>

<script setup>
    import './History.scss';
    
    import { format } from 'date-fns'
    import AppButton from '@AppComponents/Button/Button.vue';
    import IconArrowBlue from '@AppIcons/History/ArrowBlue.vue';

    
    const emit = defineEmits([
        'openModal',
        'showMoreHistory'
    ])

    const props = defineProps({
        history: {
            default: {
                data: [],
                last_page: 1,
                per_page: 20,
                current_page: 1
            },
            type: Object
        },
        loading: {
            default: false,
            type: Boolean
        },
        title: {
            default: 'События',
            type: String
        }
    })

    class History {
        constructor() {
            this.list = {}
            this.pagination = {
                last_page: 1,
                per_page: 20,
                current_page: 1
            }
            this.icons = {
                FIELD_UPDATED: '/icons/history/edit.svg',
                CHECKING_FINES: '/icons/history/checking.svg',
                OBJECT_CREATED: '/icons/history/create.svg',
                RELATION_ADDED: '/icons/history/createConnect.svg',
                OBJECT_DELETED: '/icons/history/delete.svg',
                RELATION_DELETED: '/icons/history/deleteConnect.svg',
                FINE_PAID: '/icons/history/payment.svg',
                OBJECT_RESTORED: '/icons/history/restore.svg',
                OBJECT_COPIED: '/icons/history/copy.svg',
                default: '/icons/history/edit.svg'
            }
        }

        // Получение значений
        get(response) {
            this.list = []
            this.setPagination(response)

            for (let field of response.data) {
                if (this.list[field.date] == undefined) {
                    this.list[field.date] = [field]
                } else {
                    this.list[field.date].push(field)
                }
            }
        }

        // Установка пагинации
        setPagination(data) {
            this.pagination = {
                last_page: data.last_page,
                per_page: data.per_page,
                current_page: data.current_page
            }
        }

        // Проверка значения
        checkValue(field) {
            return field == null || field == undefined || field.trim() == ''
        }

        // Показать еще
        showMore() {
            emit('showMoreHistory', this.pagination.current_page + 1)
        }

        openModal(target, isEvent = true) {
            emit('openModal', {
                slug: isEvent ? target.dataset.slug : target.slug,
                id: isEvent ? target.dataset.id : target.id
            })
        }
    }

    const history = ref(new History())

    onMounted(() => {
        history.value.get(props.history)
    })

    watch(() => props.history.data, () => {
        history.value.get(props.history)
    }, {deep: true})
</script>
