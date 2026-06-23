<template>
    <main>
		<div class="page__header page__header_table">
			<AppH1 id="mobile-menu-target">
				{{ metaJSON[props.slug]?.title }}
			</AppH1>

			<div id="filter-container"></div>

			<AppButton v-if="canCreate" class="button_fill" @click="emit('openModal', {
				type: 'create',
				slug: props.slug,
				id: '0'
			})">
				<AppIconPlus />
				<span class="text">
					Создать
				</span>
			</AppButton>
		</div>

		<AppVirtualTable
			ref="tableComp"
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
		'openModal',
		'init'
	])

	const router = useRoute()

	const tableComp = ref(null)
	const canCreate = computed(() => tableComp.value?.table?.permissions?.create_p !== 'N')

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

		setTimeout(() => {
			useHead({
				title: `${metaJSON[props.slug]?.title} | Compas.pro`
			})
		}, 100);
	})

</script>