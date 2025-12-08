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


        <div class="tariffs__group" v-if="categories.active == 'requisites'">
            <div class="tariffs__group-header">
                <AppButton class="button_fill button_small" @click="emit('openModal', {
                    type: 'create',
                    slug: 'requisites',
                    id: '0'
                })">
                    <AppIconPlus />
                    Создать
                </AppButton>
            </div>
            <AppVirtualTable 
                :slug="'requisites'"
                :options="{
                    title: 'Реквизиты',
                    isHaveQuery: false,
                    query: {},
                    isPermanentEdit: false,
                    isHaveFilter: false,
                    isHaveFooter: true,
                    isHaveTopHeader: true,
                    isTrash: false,
                    updatingCount: categories.keyUpdate
                }"
				@openModal="item => emit('openModal', item)"
            />
        </div>

        <div class="tariffs__group" v-else-if="categories.active == 'documents'">
            <AppTileSection 
                class="page__section"
				:section="documents.section"
				:options="documents.options"
				:sectionClass="documents"
            />
            <AppVirtualTable 
                :slug="'documents'"
                :options="{
                    title: 'Счета и акты',
                    isHaveQuery: false,
                    query: {},
                    isPermanentEdit: false,
                    isHaveFilter: false,
                    isHaveFooter: true,
                    isHaveTopHeader: true,
                    isTrash: false,
                    updatingCount: categories.keyUpdate
                }"
				@openModal="item => emit('openModal', item)"
			/>
        </div>
<!--         
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
			:path="`/entities`"
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
		/> -->
    </main>

	
	<div class="detail__actions">
		<MassAction 
			v-if="categories.active == 'documents'"
			:isChoosed="documents.buffer.backup.length > 0"
			:actions="{
				save: documents.buffer.backup.length > 0,
				edit: false,
				cancel: true,
				delete: false
			}"
			:loading="documents.buffer.loading"
			@action="action => documents[action.action](action.value)"
		/>
	</div>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';
	
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    import MassAction from '@AppComponents/MassAction/MassAction.vue'
	import AppCategories from '@AppComponents/Categories/Categories.vue';
	import AppTileSection from '@AppComponents/TileSection/TileSection.vue';
    import AppButton from '@AppComponents/Button/Button.vue';
	import { Tariffs, Settings } from '@/helpers/classes.js'
	import AppIconPlus from '@AppIcons/Plus.vue'

	import { useUserStore } from '@/stores/userStore.js'
	const userStore = useUserStore()


	const emit = defineEmits([
		'openModal'
	])

	class Categories {
		constructor() {
			this.list = [
				{
					label: 'Пополнение баланса',
					value: 'balance',
					id: 'balance'
				},
				{
					label: 'Настройки компаний Юр. Лица',
					value: 'requisites',
					id: 'requisites'
				},
                {
					label: 'Документы',
					value: 'documents',
					id: 'documents'
				},
			]
			this.keyUpdate = 0
			this.active = 1
		}

		// Установка активной категории
		set(category) {
			this.active = category.id
			// this.keyUpdate++

			if (this.active == 'documents') {
				documents.value.get()
			}
		}
	}

	const categories = ref(new Categories())
	const tariffs = ref(new Tariffs())

	const documents = ref(new Settings({
		title: 'Общие настройки',
		category: 'documents',
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
			title: `Тарифы | Compas.pro`
		})

		categories.value.set(categories.value.list[0])
	})

</script>