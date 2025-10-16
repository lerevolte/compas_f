<template>
    <main>
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
				{{ entity.active?.title }}
			</AppH1>
			<AppFilter 
				
			/>
			<AppButton class="button_fill">
				<AppIconPlus />
				Создать
			</AppButton>
		</div>

		<AppVirtualTable 
			:slug="route.params.slug"
			@openModal="item => entity.openModal(item)"
		/>
		<div id="mass-action-container"></div>

		<teleport to="#detail__overlay" v-if="entity.modal.length > 0">
			<AppWarningLarge v-for="modal in entity.modal" @close="entity.modal.pop()">
				<h1>
					{{ modal.type == 'create' ? 'Создание' : modal.type == 'copy' ? 'Копирование' : 'Просмотр' }} {{ modal.item ? `ID: ${modal.item.id}` : '' }}
				</h1>
			</AppWarningLarge>
		</teleport>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
	import AppWarningLarge from '@AppComponents/Modal/Large/Large.vue'
	import AppFilter from '@AppComponents/Filter/Filter.vue'
	import AppButton from '@AppComponents/Button/Button.vue'
	import AppIconPlus from '@AppIcons/Plus.vue'


	import metaJSON from './meta.json'

	const route = useRoute()

	class Entity {
		constructor() {
			this.modal = []
			this.active = metaJSON[route.params.slug]
		}

		openModal(item) {
			console.log(item)
			this.modal.push(item)
		}
	}

	const entity = ref(new Entity())

</script>