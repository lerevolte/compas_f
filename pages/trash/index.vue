<template>
    <main>
        <IconLoader 
            v-if="tabs.loading"
        />
        <AppTabs 
            v-if="!tabs.loading"
            :tabs="tabs.list"
            :activeTab="tabs.active ? tabs.active.tab : null"
            @action="item => tabs[item.action](item.value)"
        />
		<div class="page__header page__header_trash page__header_table">
			<AppH1 id="mobile-menu-target">
                <template v-if="!tabs.loading">
                    {{ tabs.active?.title }}
                </template>
			</AppH1>

			<div id="filter-container"></div>
			
            <div></div>
		</div>

		<AppVirtualTable
            v-if="!tabs.loading && tabs.active" 
            :options="{
                updatingCount: tabs.updatingCount,
                isHaveQuery: true,
                isPermanentEdit: false,
                query: {
                    trash_tab: tabs.active?.tab,
                    trashed: true
                },
                isHaveFilter: true,
                isTrash: true
            }"
            :slug="tabs.active?.tab"
            @openModal="item => emit('openModal', item)"
        />

        <div v-if="!tabs.loading && !tabs.active" class="trash-empty">
            <p>Корзина пуста</p>
        </div>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import IconLoader from '@AppIcons/Loader.vue';
    import AppTabs from '@AppComponents/Tabs/Tabs.vue';
    import { Common }  from '@/helpers/classes.js'
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
            this.updatingCount = 0
            this.loading = true
            this.modal = {
                state: false,
                loading: false
            }
        }

        async get() {
            try {
                this.loading = true
                const response = await api.callMethod('GET', routes.trash.get_tabs)
                this.list = response.data.filter(p => p.enabled)
                const query = common.getQueryUrl()
                if (query && query.trash_tab) {
                    this.active = this.list.find(p => p.tab == query.trash_tab)
                } else {
                    this.active = this.list[0] ?? null
                }

            } catch (error) {
                console.log(error);
            } finally {
                this.loading = false
            }
        }

        // Установка активного таба
        set(tab) {
            this.active = tab.tab
            this.updatingCount++
        }
    }

    const tabs = ref(new Tabs())
    const common = new Common()
    
	onMounted(async () => {
		useHead({
			title: `Корзина | Compas.pro`
		})
        await tabs.value.get()
	})
</script>