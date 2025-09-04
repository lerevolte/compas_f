<template>
    <AppMenu />

    <main>
		<AppH1 id="mobile-menu-target">
            {{ entity.active?.title }}
		</AppH1>

        <!-- <TemplateTablePage /> -->
    </main>
</template>

<script setup>
    import AppMenu from '@AppComponents/Menu/Menu.vue';
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    // import TemplateTablePage from '@AppTemplates/TablePage/TablePage.vue'


	import metaJSON from './meta.json'

	const route = useRoute()

	class Entity {
		constructor() {
			this.active = metaJSON[route.params.slug]
		}
	}

	const entity = new Entity()

</script>