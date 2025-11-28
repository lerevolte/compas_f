<template>
    <main>
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
				{{ metaJSON[props.slug]?.title }}
			</AppH1>

			<div id="filter-container"></div>

			<AppButton class="button_fill" @click="emit('openModal', {
				type: 'create',
				slug: props.slug,
				id: '0'
			})">
				<AppIconPlus />
				Создать
			</AppButton>
		</div>

		<AppVirtualTable 
			:slug="router.params.slug"
			:key="router.path"
			@openModal="item => emit('openModal', item)"
		/>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
	import AppButton from '@AppComponents/Button/Button.vue'
	import AppIconPlus from '@AppIcons/Plus.vue'

	import metaJSON from '/meta.json'

	const emit = defineEmits([
		'openModal'
	])

	const router = useRoute()

	const props = defineProps({
		entity: {
			default: {
				modal: [],
				active: null,
				addresses: []
			},
			type: Object
		},
		slug: {
			default: '',
			type: String
		}
	})
	
	onMounted(() => {
		useHead({
			title: `${metaJSON[props.slug]?.title} | Compas.pro`
		})
	})

</script>