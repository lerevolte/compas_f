<template>
    <main>
		<div class="page__header analytic-header">
			<div class="analytic-header__group">
				<AppH1 id="mobile-menu-target">
					Аналитика
				</AppH1>
			</div>
		</div>
		<div class="analytic__body">
			<AnalyticTemplate @openModal="item => emit('openModal', item)"/>
		</div>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
    import AnalyticTemplate from '@AppTemplates/Analytic/Analytic.vue';

	const emit = defineEmits([
		'openModal'
	])
</script>