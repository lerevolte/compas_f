<template>
    <AppMenu />

    <main>
		<AppH1 id="mobile-menu-target">
            {{ entity.active?.title }}
		</AppH1>

        <TemplateTablePage 
			:slug="route.params.slug"
			@openModal="item => entity.openModal(item)"
		/>

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
    import AppMenu from '@AppComponents/Menu/Menu.vue';
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import TemplateTablePage from '@AppTemplates/TablePage/TablePage.vue'
	import AppWarningLarge from '@AppComponents/Modal/Large/Large.vue'


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