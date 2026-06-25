<template>
    <main class="product-stats">
        <div class="page__header product-stats__header">
            <AppH1 id="mobile-menu-target">
                Статистика товаров
            </AppH1>
            <AppDateFilter v-model="activeDate" @update:modelValue="loadProducts" />
        </div>

        <div class="product-stats__tables">
            <section class="ps-table">
                <div class="ps-table__title">Товары на {{ formattedDate }}</div>
                <div class="ps-table__scroll">
                    <table class="ps-table__grid">
                        <thead>
                            <tr>
                                <th class="ps-table__th">Товар</th>
                                <th class="ps-table__th ps-table__th_num">Кол-во заказов</th>
                                <th class="ps-table__th ps-table__th_num">Кол-во</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="row in products"
                                :key="row.name"
                                class="ps-table__row"
                                :class="{ 'ps-table__row_active': selectedProduct === row.name }"
                                @click="selectProduct(row.name)"
                            >
                                <td class="ps-table__td">{{ row.name }}</td>
                                <td class="ps-table__td ps-table__td_num">{{ row.order_count }}</td>
                                <td class="ps-table__td ps-table__td_num">{{ formatNum(row.total_count) }}</td>
                            </tr>
                            <tr v-if="!loadingProducts && products.length === 0">
                                <td class="ps-table__td ps-table__empty" colspan="3">Нет товаров на выбранную дату</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ps-table__loader" v-if="loadingProducts">Загрузка…</div>
                </div>
            </section>

            <section class="ps-table ps-table_tasks" v-if="selectedProduct !== null">
                <div class="ps-table__title">Задачи логистики с товаром «{{ selectedProduct }}»</div>
                <div class="ps-table__scroll">
                    <table class="ps-table__grid">
                        <thead>
                            <tr>
                                <th class="ps-table__th">Статус задачи</th>
                                <th class="ps-table__th">Название задачи</th>
                                <th class="ps-table__th">Состав заказа</th>
                                <th class="ps-table__th ps-table__th_num">Кол-во, шт</th>
                                <th class="ps-table__th">Ответственный</th>
                                <th class="ps-table__th">Примечание</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in bottomRows" :key="row.id" class="ps-table__row ps-table__row_static">
                                <td class="ps-table__td">
                                    <AppStatus v-if="statusCol" :options="statusOptions(row)" :model-value="row.point_status" />
                                </td>
                                <td class="ps-table__td">{{ cellText(row.name) }}</td>
                                <td class="ps-table__td" v-html="row.products"></td>
                                <td class="ps-table__td ps-table__td_num">{{ formatNum(row.product_qty) }}</td>
                                <td class="ps-table__td">
                                    <AppRelation v-if="userCol" :options="userOptions(row)" :model-value="row.user_id" />
                                </td>
                                <td class="ps-table__td">{{ cellText(row.comment) }}</td>
                            </tr>
                            <tr v-if="!loadingTasks && bottomRows.length === 0">
                                <td class="ps-table__td ps-table__empty" colspan="6">Нет задач</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ps-table__loader" v-if="loadingTasks">Загрузка…</div>
                </div>
            </section>
        </div>
    </main>
</template>

<script setup>
    import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue';
    import AppStatus from '@AppComponents/Inputs/Status/Status.vue';
    import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue';
    import api from '@/helpers/api.js';
    import routes from '@/helpers/routes.js';
    import { format } from 'date-fns';

    const activeDate = ref(new Date());
    const products = ref([]);
    const bottomTable = ref(null);
    const selectedProduct = ref(null);
    const loadingProducts = ref(false);
    const loadingTasks = ref(false);

    const apiDate = computed(() => format(activeDate.value, 'yyyy-MM-dd'));
    const formattedDate = computed(() => format(activeDate.value, 'dd.MM.yyyy'));

    const formatNum = (n) => {
        const num = Number(n || 0);
        return Number.isInteger(num) ? num : num.toFixed(2);
    };

    const bottomRows = computed(() => bottomTable.value?.list?.data ?? []);
    const bottomColumns = computed(() => bottomTable.value?.table ?? []);
    const statusCol = computed(() => bottomColumns.value.find(c => c.key === 'point_status'));
    const userCol = computed(() => bottomColumns.value.find(c => c.key === 'user_id'));

    const cellText = (v) => {
        if (v == null) return '';
        if (typeof v === 'object') return v.value ?? v.text ?? '';
        return v;
    };

    const statusOptions = (row) => ({
        id: `ps_status_${row.id}`,
        field_id: statusCol.value?.id,
        title: null,
        type: 'status',
        edit: false,
        list: statusCol.value?.options ?? [],
        name: 'point_status',
        required: false,
        isHaveNull: false,
        isCanCreate: false,
        placeholder: ''
    });

    const userOptions = (row) => ({
        id: `ps_user_${row.id}`,
        title: null,
        edit: false,
        type: 'relation',
        list: userCol.value?.options ?? [],
        slug: userCol.value?.related_table,
        name: 'user_id',
        relation: userCol.value?.id,
        searchable: false,
        required: false,
        isHaveNull: true,
        multiple: !!userCol.value?.is_plural,
        visibleCount: 5,
        placeholder: ''
    });

    const loadProducts = async () => {
        selectedProduct.value = null;
        bottomTable.value = null;
        loadingProducts.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.productStats.products}?delivery_date=${apiDate.value}`);
            products.value = Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.log('product-stats products', error);
            products.value = [];
        } finally {
            loadingProducts.value = false;
        }
    };

    const selectProduct = async (name) => {
        selectedProduct.value = name;
        bottomTable.value = null;
        loadingTasks.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.productStats.tasks}?delivery_date=${apiDate.value}&product=${encodeURIComponent(name)}`);
            bottomTable.value = response.data ?? null;
        } catch (error) {
            console.log('product-stats tasks', error);
            bottomTable.value = null;
        } finally {
            loadingTasks.value = false;
        }
    };

    onMounted(() => {
        useHead({ title: 'Статистика товаров | Compas.pro' });
        loadProducts();
    });
</script>

<style lang="scss" scoped>
    .product-stats__header {
        display: flex;
        align-items: center;
        gap: 30px;
        flex-wrap: wrap;
    }

    .product-stats__tables {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .ps-table {
        background: #fff;
        border-radius: 10px;
        border: 1px solid #ededf0;
        overflow: hidden;
    }

    .ps-table__row_static {
        cursor: default;

        &:hover {
            background: transparent;
        }
    }

    .ps-table__title {
        padding: 15px 20px;
        font-weight: 600;
        border-bottom: 1px solid #ededf0;
    }

    .ps-table__scroll {
        position: relative;
        overflow-x: auto;
    }

    .ps-table__grid {
        width: 100%;
        border-collapse: collapse;
    }

    .ps-table__th {
        text-align: left;
        font-weight: 500;
        color: #8f8f8f;
        padding: 12px 20px;
        border-bottom: 1px solid #ededf0;
        white-space: nowrap;
    }

    .ps-table__th_num,
    .ps-table__td_num {
        text-align: right;
    }

    .ps-table__td {
        padding: 12px 20px;
        border-bottom: 1px solid #f4f4f6;
        vertical-align: middle;
    }

    .ps-table__row {
        cursor: pointer;

        &:hover {
            background: #f7f8fc;
        }

        &.ps-table__row_active {
            background: #eef1fb;
        }
    }

    .ps-table__empty {
        color: #8f8f8f;
        text-align: center;
        cursor: default;
    }

    .ps-table__loader {
        padding: 20px;
        text-align: center;
        color: #8f8f8f;
    }

    .ps-status {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        color: #fff;
        font-size: 13px;
        white-space: nowrap;
    }
</style>
