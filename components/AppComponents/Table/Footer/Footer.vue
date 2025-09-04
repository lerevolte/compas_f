<template>
    <div class="table__footer" :class="{'table__footer_prevent': props.loading}">
        <div class="pagination">
            <IconChangePage v-show="table.pages.current != 1" @click="table.changePage(table.pages.current - 1)"/>

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
            <IconChangePage v-show="table.pages.current != table.pages.total" @click="table.changePage(table.pages.current + 1)"/>
        </div>
    </div>
</template>

<script setup>
    import './Footer.scss';
    
    import IconChangePage from '@AppIcons/Table/ChangePage.vue'

    const table = inject('table')

    const props = defineProps({
        loading: {
            default: false,
            type: Boolean
        }
    })
</script>
