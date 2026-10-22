<template>
    <div class="product-stats" :class="{ 'product-stats_modal': props.isModal }">
        <div class="page__header product-stats__header">
            <AppH1 id="mobile-menu-target">
                Статистика товаров по дням
            </AppH1>
            <AppDateFilter v-model="activeDate" @update:modelValue="loadProducts" />
        </div>

        <div class="ps-types" style="display: none" v-if="actionTypes.length > 0">
            <div
                class="ps-types__item"
                :class="{ 'ps-types__item_active': selectedAction === ALL_ACTIONS }"
                @click="selectAction(ALL_ACTIONS)"
            >
                Все
                <span class="ps-types__count">{{ actionTypesTotal }}</span>
            </div>
            <div
                v-for="type in actionTypes"
                :key="type.id"
                class="ps-types__item"
                :class="{ 'ps-types__item_active': selectedAction === type.id }"
                @click="selectAction(type.id)"
            >
                <span class="ps-types__dot" v-if="type.color" :style="{ background: type.color }"></span>
                {{ type.value }}
                <span class="ps-types__count">{{ type.count }}</span>
            </div>
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
                                v-if="products.length > 0 || allOrderCount > 0"
                                class="ps-table__row ps-table__row_all"
                                :class="{ 'ps-table__row_active': selectedProduct === ALL_PRODUCTS }"
                                @click="selectProduct(ALL_PRODUCTS)"
                            >
                                <td class="ps-table__td"><b>Все товары</b></td>
                                <td class="ps-table__td ps-table__td_num">{{ allOrderCount }}</td>
                                <td class="ps-table__td ps-table__td_num">{{ formatNum(allTotalCount) }}</td>
                            </tr>
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
                            <tr v-if="!loadingProducts && products.length === 0 && allOrderCount === 0">
                                <td class="ps-table__td ps-table__empty" colspan="3">Нет товаров на выбранную дату</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ps-table__loader" v-if="loadingProducts">Загрузка…</div>
                </div>
            </section>

            <section class="ps-table_tasks" v-if="selectedProduct !== null">
                <div class="ps-table__loader" v-if="loadingTasks">Загрузка…</div>
                <AppVirtualTable
                    v-else-if="bottomTable"
                    :key="`${apiDate}_${selectedProduct}`"
                    :slug="'logistic_tasks'"
                    :path="null"
                    :options="{
                        isHaveQuery: false,
                        isPermanentEdit: false,
                        isHaveFilter: false,
                        isHaveFooter: false,
                        isHaveTopHeader: true,
                        isDisableSockets: true,
                        isTrash: false,
                        isLocalTable: true,
                        title: selectedProduct === ALL_PRODUCTS ? 'Задачи логистики (все товары)' : `Задачи логистики с товаром «${selectedProduct}»`
                    }"
                    :table="bottomTable"
                    @openModal="item => emit('openModal', item)"
                />
            </section>
        </div>
    </div>
</template>

<script setup>
    import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import api from '@/helpers/api.js';
    import routes from '@/helpers/routes.js';
    import { format } from 'date-fns';

    const props = defineProps({
        isModal: {
            type: Boolean,
            default: false
        }
    });

    const emit = defineEmits([
        'openModal'
    ]);

    const DATE_STORAGE_KEY = 'product-stats:date';
    const restoreDate = () => {
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DATE_STORAGE_KEY) : null;
            if (raw) {
                const d = new Date(`${raw}T00:00:00`);
                if (!Number.isNaN(d.getTime())) return d;
            }
        } catch (e) {}
        return new Date();
    };

    const ALL_PRODUCTS = '__all_products__';
    const ALL_ACTIONS = 'all';

    const activeDate = ref(restoreDate());
    const products = ref([]);
    const allOrderCount = ref(0);
    const allTotalCount = ref(0);
    const bottomTable = ref(null);
    const selectedProduct = ref(null);
    const loadingProducts = ref(false);
    const loadingTasks = ref(false);
    const actionTypes = ref([]);
    const selectedAction = ref(ALL_ACTIONS);

    const actionTypesTotal = computed(() => actionTypes.value.reduce((sum, type) => sum + Number(type.count || 0), 0));
    const actionQuery = computed(() => selectedAction.value === ALL_ACTIONS ? '' : `&action_type=${encodeURIComponent(selectedAction.value)}`);

    const apiDate = computed(() => format(activeDate.value, 'yyyy-MM-dd'));
    const formattedDate = computed(() => format(activeDate.value, 'dd.MM.yyyy'));

    watch(activeDate, (d) => {
        try {
            if (typeof localStorage !== 'undefined' && d) {
                localStorage.setItem(DATE_STORAGE_KEY, format(d, 'yyyy-MM-dd'));
            }
        } catch (e) {}
    });

    const formatNum = (n) => {
        const num = Number(n || 0);
        return Number.isInteger(num) ? num : num.toFixed(2);
    };

    const loadProducts = async () => {
        selectedProduct.value = null;
        bottomTable.value = null;
        loadingProducts.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.productStats.products}?delivery_date=${apiDate.value}${actionQuery.value}`);
            const data = response.data ?? {};
            actionTypes.value = Array.isArray(data.action_types) ? data.action_types : [];
            if (selectedAction.value !== ALL_ACTIONS && !actionTypes.value.some(type => type.id === selectedAction.value)) {
                selectedAction.value = ALL_ACTIONS;
                loadingProducts.value = false;
                return loadProducts();
            }
            products.value = Array.isArray(data.products) ? data.products : [];
            allOrderCount.value = Number(data.all_order_count ?? 0);
            allTotalCount.value = Number(data.all_total_count ?? 0);
        } catch (error) {
            console.log('product-stats products', error);
            products.value = [];
            actionTypes.value = [];
            allOrderCount.value = 0;
            allTotalCount.value = 0;
        } finally {
            loadingProducts.value = false;
        }
    };

    const selectProduct = async (name) => {
        selectedProduct.value = name;
        bottomTable.value = null;
        loadingTasks.value = true;
        try {
            const query = name === ALL_PRODUCTS
                ? `delivery_date=${apiDate.value}&all=1`
                : `delivery_date=${apiDate.value}&product=${encodeURIComponent(name)}`;
            const response = await api.callMethod('GET', `${routes.productStats.tasks}?${query}${actionQuery.value}`);
            bottomTable.value = response.data ?? null;
        } catch (error) {
            console.log('product-stats tasks', error);
            bottomTable.value = null;
        } finally {
            loadingTasks.value = false;
        }
    };

    const selectAction = (id) => {
        if (selectedAction.value === id) return;
        selectedAction.value = id;
        loadProducts();
    };

    onMounted(() => {
        loadProducts();
    });
</script>

<style lang="scss" scoped>
    .product-stats_modal {
        padding: 25px 15px;
    }

    .product-stats__header {
        display: flex;
        align-items: center;
        gap: 30px;
        flex-wrap: wrap;
    }

    .ps-types {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
    }

    .ps-types__item {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #bcbcbc;
        border-radius: 5px;
        color: #8f8f8f;
        cursor: pointer;
        padding: 10px 15px;
        white-space: nowrap;
        background: #fff;

        &.ps-types__item_active {
            border-color: #0584fe;
            color: #000;
            cursor: default;
        }
    }

    .ps-types__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .ps-types__count {
        color: #8f8f8f;
        font-size: 12px;
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

    .ps-table_tasks :deep(.section-table) {
        height: 500px;
        margin-bottom: 0;
    }
</style>
