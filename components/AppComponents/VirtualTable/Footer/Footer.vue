<template>
    <div class="table-footer">
        <div class="table-footer__checked">
            <span class="text text_accent">
                Выбрано:
            </span>
            <span class="text"> {{ table.body.filter(p => p.isChoose).length }} </span>
        </div>


        <div class="table-footer__group">
            <span class="text text_accent">
                Страница:
            </span>
            <div class="pagination">
                <template v-if="table.pages.total <= 10">
                    <div class="pagination__item" v-for="item in table.pages.total" :class="{ 'pagination__item_active': item == table.pages.current }" @click="table.changePage(item)">
                        {{ item }}
                    </div>
                </template>
                <template v-else>
                    <template v-if="table.pages.current < 7">
                        <div class="pagination__item" v-for="item in 7" :class="{ 'pagination__item_active': item == table.pages.current }" @click="table.changePage(item)">
                            {{ item }}
                        </div>
                        <div class="pagination__item pagination__item_none">
                            ...
                        </div>
                        <div class="pagination__item" v-for="item in [3, 2, 1]" :class="{ 'pagination__item_active': table.pages.total - item + 1 == table.pages.current }" @click="table.changePage(table.pages.total - item + 1)">
                            {{ table.pages.total - item + 1 }}
                        </div>
                    </template>
                    <template v-else-if="table.pages.current >= 7 && table.pages.current <= table.pages.total - 6">
                        <div class="pagination__item" v-for="item in 3" :class="{ 'pagination__item_active': item == table.pages.current }" @click="table.changePage(item)">
                            {{ item }}
                        </div>
                        <div class="pagination__item pagination__item_none">
                            ...
                        </div>
                        <div class="pagination__item" v-for="item in 5" :class="{ 'pagination__item_active': table.pages.current + item - 3 == table.pages.current }" @click="table.changePage(table.pages.current + item - 3)">
                            {{ table.pages.current + item - 3 }}
                        </div>
                        <div class="pagination__item pagination__item_none">
                            ...
                        </div>
                        <div class="pagination__item" v-for="item in [3, 2, 1]" :class="{ 'pagination__item_active': table.pages.total - item + 1 == table.pages.current }" @click="table.changePage(table.pages.total - item + 1)">
                            {{ table.pages.total - item + 1 }}
                        </div>
                    </template>
                    <template v-else>
                        <div class="pagination__item" v-for="item in 3" :class="{ 'pagination__item_active': item == table.pages.current }" @click="table.changePage(item)">
                            {{ item }}
                        </div>
                        <div class="pagination__item pagination__item_none">
                            ...
                        </div>
                        <div class="pagination__item" v-for="item in [7, 6, 5, 4, 3, 2, 1]" :class="{ 'pagination__item_active': table.pages.total - item + 1 == table.pages.current }" @click="table.changePage(table.pages.total - item + 1)">
                            {{ table.pages.total - item + 1 }}
                        </div>
                    </template>
                </template>
            </div>
        </div>

        <AppSelect 
            class="table-footer__count"
            v-model="table.pages.limit"
            :options="{
                title: 'На странице:',
                isHaveNull: false,
                list: countList
            }"
        />
    </div>
</template>

<script setup>
    import './Footer.scss';
    
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'

    const table = inject('table');

    const countList = [
        { value: 12, label: '12' },
        { value: 25, label: '25' },
        { value: 50, label: '50' },
        { value: 100, label: '100' }
    ]
</script>
