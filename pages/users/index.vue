<template>
    <main>
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
				Пользователи
			</AppH1>

			<div id="filter-container"></div>

			<AppButton class="button_fill" @click="emit('openModal', {
				type: 'create',
				slug: 'users',
				id: '0'
			})">
				<AppIconPlus />
				Создать
			</AppButton>
		</div>

		<AppVirtualTable 
			:slug="'users'"
			@openModal="item => emit('openModal', item)"
		/>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
	import AppButton from '@AppComponents/Button/Button.vue'
	import AppIconPlus from '@AppIcons/Plus.vue'

	const emit = defineEmits([
		'openModal'
	])

	onMounted(() => {
		useHead({
			title: `Пользователи | Compas.pro`
		})
	})

</script>