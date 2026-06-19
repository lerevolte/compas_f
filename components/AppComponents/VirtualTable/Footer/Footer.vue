<template>
    <div class="table-footer">
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
            @update:model-value="table.setCountPage()"
        />
    </div>
</template>

<script setup>
    import './Footer.scss';
    
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'

    const table = inject('table');

    // Текущий per_page (table.pages.limit) бывает не из набора 12/25/50/100 —
    // например у задач логистики сохранён per_page 500. Тогда select не находил
    // совпадающую опцию и показывался пустым (8463). Подмешиваем актуальное
    // значение в список, чтобы оно всегда отображалось как выбранное.
    const countList = computed(() => {
        const base = [12, 25, 50, 100]
        const limit = Number(table.value?.pages?.limit)
        const values = (!limit || base.includes(limit)) ? base : [...base, limit].sort((a, b) => a - b)
        return values.map(v => ({ value: v, label: String(v) }))
    })
</script>
