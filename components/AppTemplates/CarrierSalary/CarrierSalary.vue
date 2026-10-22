<template>
    <div class="carrier-salary">
        <div class="page__header carrier-salary__header">
            <AppH1 id="mobile-menu-target">
                Зарплата перевозчиков
            </AppH1>
            <AppDateFilterRange v-model="range" />
        </div>

        <div class="carrier-salary__tables">
            <section class="ps-table">
                <div class="ps-table__title">Перевозчики за {{ periodLabel }}</div>
                <div class="ps-table__scroll">
                    <table class="ps-table__grid">
                        <thead>
                            <tr>
                                <th class="ps-table__th">Компания</th>
                                <th class="ps-table__th ps-table__th_num" v-for="col in sumColumns" :key="col.key">{{ col.title }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="row in companies"
                                :key="row.id"
                                class="ps-table__row"
                                :class="{ 'ps-table__row_active': selectedCompany === row.id }"
                                @click="selectCompany(row.id)"
                            >
                                <td class="ps-table__td">{{ row.name }}</td>
                                <td class="ps-table__td ps-table__td_num" v-for="col in sumColumns" :key="col.key">{{ col.format(row[col.key]) }}</td>
                            </tr>
                            <tr v-if="companies.length > 0" class="ps-table__row_total">
                                <td class="ps-table__td"><b>Итого</b></td>
                                <td class="ps-table__td ps-table__td_num" v-for="col in sumColumns" :key="col.key"><b>{{ col.format(companiesTotal[col.key]) }}</b></td>
                            </tr>
                            <tr v-if="!loadingCompanies && companies.length === 0">
                                <td class="ps-table__td ps-table__empty" :colspan="sumColumns.length + 1">Нет маршрутов с компанией перевозчика за выбранный период</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ps-table__loader" v-if="loadingCompanies">Загрузка…</div>
                </div>
            </section>

            <section class="ps-table" v-if="selectedCompany !== null">
                <div class="ps-table__title">Автопарк «{{ selectedCompanyName }}»</div>
                <div class="ps-table__scroll">
                    <table class="ps-table__grid">
                        <thead>
                            <tr>
                                <th class="ps-table__th">Машина</th>
                                <th class="ps-table__th ps-table__th_num" v-for="col in sumColumns" :key="col.key">{{ col.title }}</th>
                            </tr>
                        </thead>
                        <tbody v-if="cars">
                            <tr
                                v-for="row in carRows"
                                :key="row.key"
                                class="ps-table__row"
                                :class="{ 'ps-table__row_active': selectedCar === row.key, 'ps-table__row_all': row.key === CAR_ALL }"
                                @click="selectCar(row.key)"
                            >
                                <td class="ps-table__td">
                                    <b v-if="row.key === CAR_ALL || row.key === CAR_NONE">{{ row.name }}</b>
                                    <template v-else>{{ row.name }}</template>
                                </td>
                                <td class="ps-table__td ps-table__td_num" v-for="col in sumColumns" :key="col.key">{{ col.format(row[col.key]) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ps-table__loader" v-if="loadingCars">Загрузка…</div>
                </div>
            </section>

            <section class="ps-table_routes" v-if="selectedCompany !== null && selectedCar !== null">
                <div class="ps-table__loader" v-if="loadingRoutes">Загрузка…</div>
                <AppVirtualTable
                    v-else-if="routesTable"
                    :key="`${from}_${to}_${selectedCompany}_${selectedCar}`"
                    :slug="'routes'"
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
                        title: routesTitle
                    }"
                    :table="routesTable"
                    @openModal="item => emit('openModal', item)"
                />
            </section>
        </div>
    </div>
</template>

<script setup>
    import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AppDateFilterRange from '@AppComponents/DateFilter/Range.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import api from '@/helpers/api.js';
    import routes from '@/helpers/routes.js';
    import { format, startOfMonth } from 'date-fns';

    const emit = defineEmits([
        'openModal'
    ]);

    const RANGE_STORAGE_KEY = 'carrier-salary:range';
    const CAR_ALL = 'all';
    const CAR_NONE = 'none';

    const toDay = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd');
    };

    const restoreRange = () => {
        try {
            const raw = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY) || 'null') : null;
            if (Array.isArray(raw) && toDay(raw[0]) && toDay(raw[1])) return [toDay(raw[0]), toDay(raw[1])];
        } catch (e) {}
        return [format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd')];
    };

    const range = ref(restoreRange());
    const companies = ref([]);
    const meta = ref({ pay_title: 'Стоимость доставки', has_paid: false });
    const cars = ref(null);
    const routesTable = ref(null);
    const selectedCompany = ref(null);
    const selectedCar = ref(null);
    const loadingCompanies = ref(false);
    const loadingCars = ref(false);
    const loadingRoutes = ref(false);

    const from = computed(() => toDay(Array.isArray(range.value) ? range.value[0] : null) ?? format(new Date(), 'yyyy-MM-dd'));
    const to = computed(() => toDay(Array.isArray(range.value) ? (range.value[1] ?? range.value[0]) : null) ?? from.value);
    const periodQuery = computed(() => `from=${from.value}&to=${to.value}`);
    const formatDay = (day) => day.split('-').reverse().join('.');
    const periodLabel = computed(() => from.value === to.value ? formatDay(from.value) : `${formatDay(from.value)} — ${formatDay(to.value)}`);

    const formatNum = (n) => {
        const num = Number(n || 0);
        return num.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    };
    const formatMoney = (n) => `${formatNum(n)} руб`;

    const sumColumns = computed(() => {
        const columns = [
            { key: 'routes_count', title: 'Маршрутов', format: formatNum },
            { key: 'mileage', title: 'Пробег, км', format: formatNum },
            { key: 'weight', title: 'Вес, кг', format: formatNum },
            { key: 'pay_sum', title: meta.value.pay_title || 'Стоимость доставки', format: formatMoney }
        ];
        if (meta.value.has_paid) {
            columns.push(
                { key: 'paid_sum', title: 'Оплачено', format: formatMoney },
                { key: 'unpaid_sum', title: 'К оплате', format: formatMoney }
            );
        }
        return columns;
    });

    const companiesTotal = computed(() => {
        const total = {};
        for (const col of sumColumns.value) {
            total[col.key] = companies.value.reduce((sum, row) => sum + Number(row[col.key] || 0), 0);
        }
        return total;
    });

    const selectedCompanyName = computed(() => companies.value.find(row => row.id === selectedCompany.value)?.name ?? '');

    const carRows = computed(() => {
        if (!cars.value) return [];
        const rows = [{ key: CAR_ALL, name: 'Все', ...(cars.value.all || {}) }];
        if (Number(cars.value.none?.routes_count || 0) > 0) {
            rows.push({ key: CAR_NONE, name: 'Без автопарка', ...cars.value.none });
        }
        for (const car of cars.value.cars || []) {
            rows.push({ key: String(car.id), ...car });
        }
        return rows;
    });

    const routesTitle = computed(() => {
        const car = carRows.value.find(row => row.key === selectedCar.value);
        const suffix = !car || car.key === CAR_ALL ? '' : `, ${car.key === CAR_NONE ? 'без автопарка' : car.name}`;
        return `Маршруты «${selectedCompanyName.value}»${suffix} за ${periodLabel.value}`;
    });

    const loadCompanies = async () => {
        const keepCompany = selectedCompany.value;
        cars.value = null;
        routesTable.value = null;
        loadingCompanies.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.carrierSalary.companies}?${periodQuery.value}`);
            const data = response.data ?? {};
            companies.value = Array.isArray(data.companies) ? data.companies : [];
            meta.value = { ...meta.value, ...(data.meta || {}) };
        } catch (error) {
            console.log('carrier-salary companies', error);
            companies.value = [];
        } finally {
            loadingCompanies.value = false;
        }
        if (keepCompany !== null && companies.value.some(row => row.id === keepCompany)) {
            await loadCars(keepCompany, selectedCar.value);
        } else {
            selectedCompany.value = null;
            selectedCar.value = null;
        }
    };

    const loadCars = async (companyId, keepCar = CAR_ALL) => {
        selectedCompany.value = companyId;
        cars.value = null;
        routesTable.value = null;
        loadingCars.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.carrierSalary.cars}?${periodQuery.value}&company_id=${companyId}`);
            cars.value = response.data ?? null;
        } catch (error) {
            console.log('carrier-salary cars', error);
            cars.value = null;
        } finally {
            loadingCars.value = false;
        }
        const car = carRows.value.some(row => row.key === keepCar) ? keepCar : CAR_ALL;
        await loadRoutes(car);
    };

    const loadRoutes = async (car) => {
        selectedCar.value = car;
        routesTable.value = null;
        loadingRoutes.value = true;
        try {
            const response = await api.callMethod('GET', `${routes.carrierSalary.routes}?${periodQuery.value}&company_id=${selectedCompany.value}&car=${encodeURIComponent(car)}`);
            routesTable.value = response.data ?? null;
        } catch (error) {
            console.log('carrier-salary routes', error);
            routesTable.value = null;
        } finally {
            loadingRoutes.value = false;
        }
    };

    const selectCompany = (id) => {
        if (selectedCompany.value === id) return;
        loadCars(id);
    };

    const selectCar = (key) => {
        if (selectedCar.value === key) return;
        loadRoutes(key);
    };

    watch(range, (value) => {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify([from.value, to.value]));
            }
        } catch (e) {}
        loadCompanies();
    }, { deep: true });

    onMounted(() => {
        loadCompanies();
    });
</script>

<style lang="scss" scoped>
    .carrier-salary__header {
        display: flex;
        align-items: center;
        gap: 30px;
        flex-wrap: wrap;
    }

    .carrier-salary__tables {
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
        white-space: nowrap;
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

    .ps-table__row_total .ps-table__td {
        border-bottom: none;
        background: #fafafc;
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

    .ps-table_routes :deep(.section-table) {
        height: 500px;
        margin-bottom: 0;
    }
</style>
