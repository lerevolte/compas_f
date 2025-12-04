<template>
    <main>
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
                Логистика
			</AppH1>
		</div>
		
		<LogisticTemplate 
			@openModal="item => emit('openModal', item)"
		/>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
	import LogisticTemplate from '@AppTemplates/Logistic/Logistic.vue'

	const emit = defineEmits([
		'openModal'
	])
</script>