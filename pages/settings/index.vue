<template>
    <main class="page_categories">
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
				Настройки портала
			</AppH1>
		</div>

		<AppCategories 
			:list="categories.list" 
			:active="categories.active" 
			:modalActions="null"
			@action="action => categories[action.action](action.value)"
		>
			<template #name>
				Каталог
			</template>
		</AppCategories>

		<AppTileSection 
			class="page__section"
			v-if="categories.active == 'common'"
			:section="common.section"
			:options="common.options"
			:sectionClass="common"
		/>
		<AppTileSection 
			class="page__section"
			v-else-if="categories.active == 'logistics'"
			:section="moduleLogistics.section"
			:options="moduleLogistics.options"
			:sectionClass="moduleLogistics"
		/>

		<AppVirtualTable 
			v-else-if="categories.active == 'entities'"
			:slug="null"
			:path="`/entities/compose`"
			:options="{
				isHaveQuery: false,
				query: {},
				isPermanentEdit: true,
				isHaveFilter: false,
				isHaveFooter: false,
				isHaveTopHeader: false,
				isTrash: false,
				updatingCount: categories.keyUpdate
			}"
		/>
    </main>

	
	<div class="detail__actions">
		<MassAction 
			v-if="categories.active == 'common'"
			:isChoosed="common.buffer.backup.length > 0"
			:actions="{
				save: common.buffer.backup.length > 0,
				edit: false,
				cancel: true,
				delete: false
			}"
			:loading="common.buffer.loading"
			@action="action => common[action.action](action.value)"
		/>
		<MassAction 
			v-else-if="categories.active == 'logistics'"
			:isChoosed="moduleLogistics.buffer.backup.length > 0"
			:actions="{
				save: moduleLogistics.buffer.backup.length > 0,
				edit: false,
				cancel: true,
				delete: false
			}"
			:loading="moduleLogistics.buffer.loading"
			@action="action => moduleLogistics[action.action](action.value)"
		/>
	</div>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
	
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import MassAction from '@AppComponents/MassAction/MassAction.vue'
	import AppCategories from '@AppComponents/Categories/Categories.vue';
	import AppTileSection from '@AppComponents/TileSection/TileSection.vue';
	import { Settings } from '@/helpers/classes.js'

	const emit = defineEmits([
		'openModal'
	])

	class Categories {
		constructor() {
			this.list = [
				{
					label: 'Общие настройки',
					value: 'common',
					id: 'common'
				},
				{
					label: 'Сущности',
					value: 'entities',
					id: 'entities'
				},
				{
					label: 'Модули',
					value: 'modules',
					children: [
						{
							label: 'Логистика',
							value: 'logistics',
							id: 'logistics'
						}
					]
				}
			]
			this.keyUpdate = 0
			this.active = 1
		}

		// Установка активной категории
		set(category) {
			this.active = category.id
			this.keyUpdate++

			switch (this.active) {
				case 'common':
					common.value.get()
					break;

				case 'logistics':
					moduleLogistics.value.get()
					break;

				default:
					break;
			}
		}
	}

	const categories = ref(new Categories())

	const common = ref(new Settings({
		category: 'common',
		title: 'Общая информация'
	}))
	const entitles = ref(new Settings({
		category: 'entitles',
		title: ''
	}))
	const moduleLogistics = ref(new Settings({
		category: 'logistics',
		title: 'Настройка модуля Логистика'
	}))

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
			title: `Настройки портала | Compas.pro`
		})

		categories.value.set(categories.value.list[0])
	})

</script>