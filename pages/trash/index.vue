<template>
    <main>
        <AppTabs 
            :tabs="tabs.list"
            :activeTab="tabs.active ? tabs.active.tab : null"
            @action="item => tabs[item.action](item.value)"
        />
		<div class="page__header page__header_table">
			<AppH1 id="mobile-menu-target">
				{{ tabs.active?.title }}
			</AppH1>

			<div id="filter-container"></div>
			
            <div></div>
		</div>

		<AppVirtualTable 
            :options="{
                isHaveQuery: true,
                query: {
                    trashed: true
                },
                isHaveFilter: true,
                isTrash: true
            }"
			:slug="tabs.active ? tabs.active.tab : null"
			@openModal="item => emit('openModal', item)"
		/>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import AppTabs from '@AppComponents/Tabs/Tabs.vue';
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';

	const emit = defineEmits([
		'openModal'
	])

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
	
    // Табы
    class Tabs {
        constructor() {
            this.active = null
            this.list = []
            this.modal = {
                state: false,
                loading: false
            }
        }

        async get() {
            const response = await api.callMethod('GET', routes.trash.get_tabs)
            this.list = response.data.filter(p => p.enabled)
            this.active = this.list[0] ?? null
        }

        // Установка активного таба
        setTab(tab) {
            this.active = tab.tab
            console.log(this.active);
        }
    }

    const tabs = ref(new Tabs())
    
	onMounted(() => {
		useHead({
			title: `Корзина | Compas.pro`
		})
        tabs.value.get()
	})
</script>