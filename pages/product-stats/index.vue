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
                <AppVirtualTable
                    v-if="bottomTable"
                    :key="'bottom_' + selectedProduct"
                    :slug="'logistic_tasks'"
                    :table="bottomTable"
                    :options="{
                        isLocalTable: true,
                        isShort: true,
                        isPermanentEdit: false,
                        isHaveQuery: false,
                        isHaveFilter: false,
                        isHaveTopHeader: false,
                        isHaveFooter: false,
                        isDisableSockets: true,
                        isDisableMassAction: true,
                        isTrash: false,
                        isDraggable: false,
                        updatingCount: 0
                    }"
                />
                <div class="ps-table__loader" v-if="loadingTasks">Загрузка…</div>
            </section>
        </div>
    </main>
</template>

<script setup>
    import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
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
    .product-stats {
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

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
        flex: 1;
        min-height: 0;
    }

    .ps-table {
        background: #fff;
        border-radius: 10px;
        border: 1px solid #ededf0;
        overflow: hidden;
        flex-shrink: 0;
    }

    .ps-table:not(.ps-table_tasks) .ps-table__scroll {
        max-height: 38vh;
        overflow-y: auto;
    }

    .ps-table_tasks {
        flex: 1;
        min-height: 280px;
        display: flex;
        flex-direction: column;
        overflow: visible;

        :deep(.section-table) {
            flex: 1;
            min-height: 0;
            margin-bottom: 0;
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
