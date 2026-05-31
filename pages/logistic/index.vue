<template>
    <main>
		<div class="page__header logistic-header">
			<div class="logistic-header__group">
				<AppH1 id="mobile-menu-target">
					Логистика
				</AppH1>
				<AppDateFilter 
					v-model="logisticPage.activeDate"
					@update:modelValue="logisticPage.set()"
				/>
			</div>
			<div class="logistic-header__group">
				<AppPopup class="logistic-header__statistic">
					<template #header>
						<IconChart />
					</template>
					<template #content>
						<div class="logistic-header__statistic-content">
							<div class="stat-layout">
								<!-- Left: stats grid -->
								<div class="stat-body" v-if="activeStatsData">
									<div class="stat-grid">
										<div class="stat-grid__item stat-grid__item_wide">
											<div class="stat-grid__label">Статистика по заказам</div>
											<div class="stat-grid__value stat-order-stats">
												<template v-for="(s, i) in activeStatsData.order_stats" :key="s.status_id">
													<span v-if="i > 0" class="stat-order-divider">|</span>
													<span class="stat-order-count" :style="{ color: s.color }">{{ s.count }}</span>
												</template>
											</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Кол-во машин, шт</div>
											<div class="stat-grid__value">{{ activeStatsData.car_count }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Длина маршрутов, км</div>
											<div class="stat-grid__value">{{ activeStatsData.mileage }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Длительность, час</div>
											<div class="stat-grid__value">{{ formatDuration(activeStatsData.duration) }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Заложено на доставку, руб</div>
											<div class="stat-grid__value">{{ activeStatsData.reserve_for_delivery }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Цена доставки, руб</div>
											<div class="stat-grid__value">{{ activeStatsData.delivery_price }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Общий вес, кг</div>
											<div class="stat-grid__value">{{ activeStatsData.total_weight }}</div>
										</div>
										<div class="stat-grid__item">
											<div class="stat-grid__label">Процент прибыли</div>
											<div class="stat-grid__value" :class="{ 'stat-grid__value_negative': activeStatsData.arrival_percent < 0 }">
												{{ activeStatsData.arrival_percent }}%
											</div>
										</div>
									</div>
								</div>
								<div class="stat-body stat-loading" v-else>Загрузка...</div>

								<!-- Right: sidebar with routes/carriers -->
								<div class="stat-sidebar">
									<div 
										class="stat-sidebar__item"
										:class="{ 'stat-sidebar__item_active': statView === 'total' }"
										@click="statView = 'total'; carriersOpen = false"
									>Маршруты</div>
									<div 
										class="stat-sidebar__item stat-sidebar__item_expandable"
										:class="{ 'stat-sidebar__item_active': statView === 'carrier' }"
										@click="carriersOpen = !carriersOpen"
									>
										Перевозчики
										<span class="stat-sidebar__arrow" :class="{ 'stat-sidebar__arrow_open': carriersOpen }">›</span>
									</div>
									<template v-if="carriersOpen">
										<div 
											v-for="c in (daySummary?.carriers || [])" 
											:key="c.id"
											class="stat-sidebar__item stat-sidebar__item_child"
											:class="{ 'stat-sidebar__item_active': statView === 'carrier' && activeCarrierId === c.id }"
											@click="statView = 'carrier'; activeCarrierId = c.id"
										>{{ c.name }}</div>
									</template>
								</div>
							</div>
						</div>
					</template>
				</AppPopup>
				<!--
					@update:modelValue убран — onTaskSearchSelected
					зовётся ТОЛЬКО через watch на taskSearchValue ниже.
					Иначе при повторном выборе той же задачи
					@update-handler не срабатывал у AppRelation (внутренний
					state считал её уже выбранной), а watch на самом
					ref'е срабатывает безусловно при любом изменении
					значения через v-model.
				-->
				<AppRelation
					v-model="taskSearchValue"
					:isPreventBottom="true"
					:options="{
						id: 0,
						title: null,
						list: [],
						name: 'logistic_tasks',
						edit: true,
						slug: 'logistic_tasks',
						relation_type: 'logistic_tasks',
						searchable: true,
						required: false,
						isHaveNull: true,
						multiple: false,
						type: 'select',
						isSetDefault: false,
						placeholder: 'Поиск по задаче'
					}"
				/>
			</div>
		</div>
		
		<LogisticTemplate
			ref="logisticRef"
			:filterTabs="logisticPage.filter"
			:activeDate="logisticPage.activeDate"
			:activeRoute="logisticPage.activeRoute"
			:activeTaskId="logisticPage.activeTaskId"
			@openModal="item => emit('openModal', item)"
			@routeChanged="loadDaySummary"
		/>
    </main>
</template>

<script setup>
	import api from '@/helpers/api.js'
	import routes from '@/helpers/routes.js'
	import { Common } from '@/helpers/classes.js'
	import { format } from 'date-fns'
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
	import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue';
	import LogisticTemplate from '@AppTemplates/Logistic/Logistic.vue'
	import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'
	import AppPopup from '@AppComponents/Popup/Popup.vue'
	import IconChart from '@AppIcons/Actions/Chart.vue'

	const common = new Common()

	class LogisticPage {
		constructor() {
			this.activeDate = new Date()
			this.activeRoute = null
			this.activeTaskId = null
			this.activeChart = null
			this.charts = []
		}
		async getStatistics() {
			const response = await api.callMethod('GET', routes.logistic.getStatistics)
			this.charts = response.data
			this.activeChart = this.charts[0]
		}
		get() {
			const query = common.getQueryUrl()
			this.activeDate = query && query['active-date'] ? format(new Date(query['active-date']), 'yyyy-MM-dd') : new Date()
			// route_id и task_id приходят из поиска по задачам (см. onTaskSearchSelected)
			// либо при прямой ссылке. Маршрут оборачиваем в формат, который понимает
			// LogisticTemplate.updateActiveRoute (использует activeRoute.value[0]).
			this.activeRoute = query && query['route_id']
				? { value: [Number(query['route_id'])], localOptions: [null] }
				: null
			this.activeTaskId = query && query['task_id'] ? Number(query['task_id']) : null
		}
		set() {
			common.setQueryUrl(`?active-date=${format(this.activeDate, 'yyyy-MM-dd')}`)
		}
	}

	const logisticPage = ref(new LogisticPage())
	const logisticRef = ref(null)
	const statView = ref('total')
	const daySummary = ref(null)
	const activeCarrierId = ref(null)
	const carriersOpen = ref(false)

	// Поиск по задачам логистики. v-model значение сбрасываем сразу после
	// клика, потому что само поле — это просто триггер навигации, а не
	// постоянное «состояние страницы».
	const taskSearchValue = ref({ value: [null], localOptions: [null] })

	// Safety-net: иногда AppRelation эмитит update:modelValue, но
	// слушатель @update:modelValue на родителе по неясной причине не
	// дёргает onTaskSearchSelected при повторном выборе той же опции.
	// Watch на самом taskSearchValue гарантированно срабатывает на
	// любое изменение модели (v-model его обновляет независимо от
	// отдельных слушателей).
	watch(taskSearchValue, (newVal) => {
		const opt = newVal?.localOptions?.find(o => o && o.value) || null
		if (opt && opt.value) {
			onTaskSearchSelected(newVal)
		}
	}, { deep: true })

	const onTaskSearchSelected = (newValue) => {
		const opt = newValue?.localOptions?.find(o => o && o.value) || null
		if (!opt || !opt.value) return

		const taskId = opt.value
		const routeId = opt.label?.route_id ?? null
		const deliveryDate = opt.label?.delivery_date ?? null

		// dispatchMapFocus сразу первым — до любых ранних return / любых
		// async tick'ов. Window-event это бесусловный сигнал карте даже
		// если последующая логика спотыкнётся.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('logistic:focusTask', {
				detail: { taskId: Number(taskId) }
			}))
		}

		// Сбрасываем выбор в самом поле — иначе локально остаётся «выбран»
		// тот элемент, на который только что кликнули.
		nextTick(() => {
			taskSearchValue.value = { value: [null], localOptions: [null] }
		})

		if (!routeId && !deliveryDate) {
			navigateTo(`/objects/logistic_tasks?filter[id]=${taskId}`)
			return
		}

		const date = routeId
			? (deliveryDate ?? format(new Date(), 'yyyy-MM-dd'))
			: deliveryDate
		const targetPath = routeId
			? `/logistic?active-date=${date}&route_id=${routeId}&task_id=${taskId}`
			: `/logistic?active-date=${date}&task_id=${taskId}`

		// Если мы УЖЕ на /logistic — НЕ дёргаем navigateTo, иначе watch
		// route.fullPath дёрнет logisticPage.get(), который перепишет
		// state из URL и устроит race с нашим reset/set'ом activeTaskId.
		// Обновляем state напрямую (logisticPage.activeDate / activeRoute
		// / activeTaskId), а URL обновляем silent'ом через
		// history.replaceState — bookmarkability сохраняется, Vue Router
		// не дёргается.
		// Универсальная отправка фокуса карте — через window-event.
		// LogisticMap ловит его и сам ретраит focusTaskWithRetry пока
		// маркер не появится. Не зависит от Vue ref/expose/prop-watch'ей.
		const dispatchMapFocus = () => {
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('logistic:focusTask', {
					detail: { taskId: Number(taskId) }
				}))
			}
		}

		if (route.path === '/logistic') {
			const wantRouteId = routeId ? Number(routeId) : null

			// activeDate — обычное сравнение/set (если пользователь сменил
			// дату вручную через AppDateFilter, v-model уже синхронизировал
			// logisticPage.activeDate, так что сравнение даст правильный
			// результат — не надо перезагружать дату без нужды).
			if (String(logisticPage.value.activeDate) !== String(date)) {
				logisticPage.value.activeDate = date
			}

			// activeRoute — ВСЕГДА reset → nextTick → set. Когда
			// пользователь ВРУЧНУЮ кликает другой маршрут в таблице,
			// меняется только logistic.machine_tasks.route_id внутри
			// LogisticTemplate. logisticPage.activeRoute снаружи остаётся
			// прежним, и сравнение «тот же route — ничего не делаем» не
			// даёт prop watch'у стрельнуть. В результате поиск повторно
			// той же задачи (которая в её исходном маршруте) не
			// переключает карту обратно. Reset через null гарантирует
			// transition null → значение независимо от того, что снаружи
			// помнит logisticPage.
			logisticPage.value.activeRoute = null
			logisticPage.value.activeTaskId = null
			nextTick(() => {
				logisticPage.value.activeRoute = wantRouteId
					? { value: [wantRouteId], localOptions: [null] }
					: null
				logisticPage.value.activeTaskId = Number(taskId)
				logisticRef.value?.focusTaskById?.(Number(taskId))
				dispatchMapFocus()
			})
			if (typeof window !== 'undefined') {
				window.history.replaceState({}, '', targetPath)
			}
			return
		}

		// Не на /logistic — обычная навигация. На /logistic state
		// проинициализируется через get() в onMounted и фоновый
		// fullPath watch. Окно-евент тоже шлём — LogisticMap при
		// маунте подцепит listener и focusTaskWithRetry отретраит
		// до появления маркера (после загрузки route-данных).
		navigateTo(targetPath)
		nextTick(() => {
			dispatchMapFocus()
		})
	}

	const activeStatsData = computed(() => {
		if (!daySummary.value) return null;
		if (statView.value === 'total') return daySummary.value.total;
		if (statView.value === 'carrier' && activeCarrierId.value !== null) {
			return daySummary.value.carriers?.find(c => c.id === activeCarrierId.value) || null;
		}
		return daySummary.value.total;
	});

	const formatDuration = (minutes) => {
		if (!minutes) return '0';
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m} м`;
		return `${h} ч ${m} м`;
	};

	const loadDaySummary = async () => {
		try {
			const dateStr = typeof logisticPage.value.activeDate === 'string' 
				? logisticPage.value.activeDate 
				: format(logisticPage.value.activeDate, 'yyyy-MM-dd');
			const response = await api.callMethod('GET', `/analytics/logistics-day-summary?date=${dateStr}`);
			daySummary.value = response.data || response;
			if (daySummary.value.carriers?.length) {
				activeCarrierId.value = daySummary.value.carriers[0].id;
			}
		} catch (e) {
			console.error('Failed to load day summary:', e);
			daySummary.value = null;
		}
	};

	const props = defineProps({
        entity: {
            default: null
        },
	})

	const emit = defineEmits([
		'openModal'
	])

	onMounted(() => {
		logisticPage.value.get()
        useHead({
			title: `Логистика | Compas.pro`
		})
		logisticPage.value.getStatistics()
		loadDaySummary()
	})

	// Перенавигация в пределах /logistic (например, из поиска по задачам) не
	// размонтирует страницу — приходится вручную перечитать query-параметры.
	const route = useRoute()
	watch(() => route.fullPath, () => {
		logisticPage.value.get()
	})

	// Reload summary when date changes
	watch(() => logisticPage.value.activeDate, () => {
		loadDaySummary()
	})
</script>

<style lang="scss" scoped>
.logistic-header__statistic-content {
    padding: 0;
    overflow: hidden;
}
.logistic-header__statistic {
    .popup__content {
        max-width: none;
        min-width: auto;
        width: auto;
        overflow: visible;
    }

    .stat-layout {
        width: 100%;
        min-width: 500px;
    }
}

.stat-layout {
    display: flex;
    width: 100%;
    min-width: 480px;
}

.stat-body {
	flex: 1;
	padding: 14px 16px;
	min-width: 0;
}

.stat-sidebar {
	width: 150px;
	border-left: 1px solid #eee;
	padding: 0;
	flex-shrink: 0;

	&__item {
		padding: 8px 16px;
		font-size: 13px;
		cursor: pointer;
		color: #555;
		transition: background 0.12s;
		display: flex;
		align-items: center;
		justify-content: space-between;

		&:hover {
			background: #f5f7fa;
		}

		&_active {
			background: #e8f0fe;
			color: #1a56a0;
			font-weight: 500;
		}

		&_child {
			padding-left: 28px;
			font-size: 12px;
		}

		&_expandable {
			user-select: none;
		}
	}

	&__arrow {
		font-size: 14px;
		font-weight: 600;
		color: #aaa;
		transition: transform 0.2s;

		&_open {
			transform: rotate(90deg);
		}
	}
}

.stat-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px 16px;

	&__item {
		&_wide {
			grid-column: 1 / -1;
		}
	}

	&__label {
		font-size: 11px;
		color: #999;
		margin-bottom: 1px;
	}

	&__value {
		font-size: 17px;
		font-weight: 600;
		color: #222;

		&_negative {
			color: #e53935;
		}
	}
}

.stat-order-stats {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-wrap: wrap;
}

.stat-order-count {
	font-size: 17px;
	font-weight: 700;
}

.stat-order-divider {
	color: #ccc;
	font-weight: 400;
	margin: 0 2px;
}

.stat-loading {
	padding: 30px;
	text-align: center;
	color: #999;
	font-size: 13px;
}
</style>