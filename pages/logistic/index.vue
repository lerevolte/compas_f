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
							<AppChart 
								v-if="logisticPage.activeChart"
								class="logistic-header__chart"
								:options="{
									slug: logisticPage.activeChart.type,
									date_range: {
										start: logisticPage.activeDate,
										end:logisticPage.activeDate
									},
									type: logisticPage.activeChart.type
								}"
								:settings="{
									detail: null,
									type: 'line',
									height: 220,
									isLabelEnable: false,
									isShowGrid: false,
									isEnableRows: true
								}"
							/>
							<div class="logistic-header__categories" v-if="logisticPage.charts">
								<div 
									v-for="category in logisticPage.charts"
									class="logistic-header__category" 
									:class="{'logistic-header__category_active': category.type == logisticPage.activeChart.type}"
									@click="logisticPage.activeChart = category"
								>
									{{ category.title }}
								</div>
							</div>
						</div>
					</template>
				</AppPopup>
				<AppRelation 
					v-model="logisticPage.activeRoute"
					:isPreventBottom="true"
					:options="{
						id: 0,
						title: null,
						list: [],
						name: 'routes',
						edit: true,
						slug: 'routes',
						relation: '3121',
						searchable: true,
						required: false,
						isHaveNull: true,
						multiple: false,
						type: 'select',
						isSetDefault: false,
						placeholder: 'Поиск по маршруту' 
					}"
				/>
			</div>
		</div>
		
		<LogisticTemplate 
			:filterTabs="logisticPage.filter"
			:activeDate="logisticPage.activeDate"
			:activeRoute="logisticPage.activeRoute"
			@openModal="item => emit('openModal', item)"
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
	import AppChart from '@AppComponents/Chart/Chart.vue'

	const common = new Common()

	class LogisticPage {
		constructor() {
			this.activeDate = new Date()
			this.activeRoute = null
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
		}

		set() {
			common.setQueryUrl(`?active-date=${format(this.activeDate, 'yyyy-MM-dd')}`)
		}
	}

	const logisticPage = ref(new LogisticPage())

	const props = defineProps({
        entity: {
            default: null
        },
	})

	const emit = defineEmits([
		'openModal'
	])

	onMounted(() => {
		console.log();
		logisticPage.value.get()
		
        useHead({
			title: `Логистика | Compas.pro`
		})
		logisticPage.value.getStatistics()
	})
</script>