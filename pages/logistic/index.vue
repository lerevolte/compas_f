<template>
    <main>
		<div class="page__header logistic-header">
			<div class="logistic-header__group">
				<AppH1 id="mobile-menu-target">
					Логистика
				</AppH1>
				<AppDateFilter 
					v-model="logisticPage.activeDate"
				/>
			</div>
			<div class="logistic-header__group">
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
			:activeDate="logisticPage.activeDate"
			:activeRoute="logisticPage.activeRoute"
			@openModal="item => emit('openModal', item)"
		/>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
	import AppDateFilter from '@AppComponents/DateFilter/DateFilter.vue';
	import LogisticTemplate from '@AppTemplates/Logistic/Logistic.vue'
	import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
	import AppRelation from '@AppComponents/Inputs/Relation/Relation.vue'

	class LogisticPage {
		constructor() {
			this.activeDate = new Date()
			this.activeRoute = null
		}
	}

	const logisticPage = ref(new LogisticPage())

	const emit = defineEmits([
		'openModal'
	])
</script>