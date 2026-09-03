<template>
    <main :class="{'page_categories': isCatalog}">
		<div class="page__header page__header_table">
			<AppH1 id="mobile-menu-target">
				{{ metaJSON[pageSlug]?.title }}
			</AppH1>

			<div id="filter-container"></div>

			<div class="page__header-actions">
				<AppQrScanner />

				<AppButton v-if="canCreate" class="button_fill" @click="emit('openModal', {
					type: 'create',
					slug: pageSlug,
					id: '0'
				})">
					<AppIconPlus />
					<span class="text">
						Создать
					</span>
				</AppButton>
				<AppButton v-else class="button_fill page__header__create-placeholder" aria-hidden="true" tabindex="-1">
					<AppIconPlus />
					<span class="text">
						Создать
					</span>
				</AppButton>
			</div>
		</div>

		<AppCategories
			v-if="isCatalog"
			:options="{
				isHaveHeaderActions: canCreate
			}"
			@action="action => catalog[action.action](action.value)"
		>
			<template #name>
				Каталог
			</template>
			<div class="categories__item" :class="{'categories__item_active': catalog.active == null}">
				<span class="categories__text" @click="catalog.set(null)">
					Все категории
				</span>
			</div>
			<CategoriesTreeItem
				v-for="item in catalog.tree"
				:key="item.id"
				:item="item"
				:active="catalog.active"
				:modalActions="canCreate ? catalog.modalActions : []"
				@action="action => catalog[action.action](action.value)"
			/>
		</AppCategories>

		<AppVirtualTable
			v-if="!isCatalog"
			ref="tableComp"
			:slug="router.params.slug"
			:key="router.path"
			@openModal="item => emit('openModal', item)"
		/>
		<AppVirtualTable
			v-else
			ref="tableComp"
			:slug="router.params.slug"
			:key="router.path"
			:options="{
				title: null,
				isCheckClicked: false,
				isLocalTable: false,
				isHaveQuery: true,
				isShort: false,
				query: catalog.query,
				disabledKeys: [],
				isDisableSockets: false,
				isDisableSort: false,
				isDisablePull: false,
				isHaveFilter: true,
				isPermanentEdit: false,
				isTrash: false,
				isHaveTopHeader: true,
				isHaveFooter: true,
				isHaveLocalFilter: false,
				localFilter: [],
				updatingCount: catalog.keyUpdate
			}"
			@openModal="item => emit('openModal', item)"
		/>

		<teleport to="#menu__overlay" v-if="isCatalog && catalog.modal.state">
			<AppModalWarning
				:options="{
					title: catalog.modal.title,
					action: catalog.modal.action,
					actionTitle: catalog.modal.actionTitle,
					template: 'slot'
				}"
				:loading="catalog.modal.loading"
				@delete="catalog.delete()"
				@update="catalog.update()"
				@create="catalog.create()"
				@close="catalog.modal.state = false"
			>
				<template v-if="catalog.modal.action == 'delete'">
					<p class="warning__text">
						{{ catalog.modal.text }}
					</p>
				</template>
				<template v-else-if="catalog.modal.action == 'create' || catalog.modal.action == 'update'">
					<div class="modal__fields">
						<AppInput
							v-model="catalog.modal.content.name"
							:options="{
								id: 'category_name',
								title: 'Название',
								type: 'text',
								name: 'name'
							}"
						/>
						<AppSelect
							:isPreventBottom="true"
							:options="{
								id: 'category_parent',
								title: 'Категория',
								type: 'select_dropdown',
								list: catalog.parentOptions(),
								name: 'parent_id',
								edit: true,
								searchable: false,
								required: false,
								isHaveNull: true,
								multiple: false,
								placeholder: 'Без родительской категории'
							}"
							v-model="catalog.modal.content.parent_id"
						/>
					</div>
				</template>
			</AppModalWarning>
		</teleport>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
	import AppButton from '@AppComponents/Button/Button.vue'
	import AppIconPlus from '@AppIcons/Plus.vue'
	import AppQrScanner from '@AppComponents/QrScanner/QrScanner.vue'
	import AppCategories from '@AppComponents/Categories/Categories.vue';
	import CategoriesTreeItem from '@AppComponents/Categories/TreeItem.vue';
	import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
	import AppInput from '@AppComponents/Inputs/Input/Input.vue';
	import AppSelect from '@AppComponents/Inputs/Select/Select.vue';

	import metaJSON from '/meta.json'
	import api from '@/helpers/api.js'
	import routes from '@/helpers/routes.js'

	const emit = defineEmits([
		'openModal',
		'init'
	])

	const router = useRoute()

	const tableComp = ref(null)
	const canCreate = computed(() => tableComp.value?.table?.permissions?.create_p !== 'N')
	const pageSlug = computed(() => props.slug || router.params.slug)
	const isCatalog = computed(() => pageSlug.value == 'products')

	class Catalog {
		constructor() {
			this.tree = []
			this.active = null
			this.keyUpdate = 0
			this.query = { category_id: null }
			this.modalActions = [
				{ name: 'Изменить', action: 'initUpdate', enabled: true },
				{ name: 'Удалить', action: 'initDelete', enabled: true }
			]
			this.modal = {
				state: false,
				title: '',
				actionTitle: '',
				action: 'create',
				text: null,
				content: {},
				loading: false
			}
		}

		async load() {
			try {
				const response = await api.callMethod('GET', routes.product_categories.get)
				this.tree = this.normalize(Array.isArray(response.data) ? response.data : [])
			} catch (error) {
				console.log(error)
			}
		}

		normalize(list) {
			for (const item of (list || [])) {
				if (typeof item.name == 'string' && item.name.startsWith('{')) {
					try {
						const parsed = JSON.parse(item.name)
						if (parsed && typeof parsed == 'object' && 'value' in parsed) {
							item.name = parsed.value
						}
					} catch (error) {}
				}
				this.normalize(item.children)
			}
			return list
		}

		set(category) {
			this.active = category ? category.id : null
			this.query.category_id = this.active
			this.keyUpdate++
		}

		flatten(list, level = 0, excludeId = null, result = []) {
			for (const item of (list || [])) {
				if (excludeId && item.id == excludeId) continue
				result.push({
					value: item.id,
					label: `${'.. '.repeat(level)}${item.name}`
				})
				this.flatten(item.children, level + 1, excludeId, result)
			}
			return result
		}

		parentOptions() {
			return this.flatten(this.tree, 0, this.modal.content.id ?? null)
		}

		initCreate() {
			this.modal = {
				state: true,
				title: 'Создание группы',
				actionTitle: 'Сохранить',
				action: 'create',
				text: null,
				content: {
					name: '',
					parent_id: this.active
				},
				loading: false
			}
		}

		async create() {
			if (!this.modal.content.name) return
			try {
				this.modal.loading = true
				await api.callMethod('POST', routes.product_categories.create, {
					name: this.modal.content.name,
					parent_id: this.modal.content.parent_id || null
				})
				await this.load()
			} catch (error) {
				console.log(error)
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}

		initUpdate(category) {
			this.modal = {
				state: true,
				title: 'Изменение группы',
				actionTitle: 'Сохранить',
				action: 'update',
				text: null,
				content: {
					id: category.id,
					name: category.name,
					parent_id: category.parent_id ?? null
				},
				loading: false
			}
		}

		async update() {
			if (!this.modal.content.name) return
			try {
				this.modal.loading = true
				await api.callMethod('PUT', routes.product_categories.update.replace('${id}', this.modal.content.id), {
					name: this.modal.content.name,
					parent_id: this.modal.content.parent_id || null
				})
				await this.load()
			} catch (error) {
				console.log(error)
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}

		initDelete(category) {
			this.modal = {
				state: true,
				title: 'Удаление группы',
				actionTitle: 'Удалить',
				action: 'delete',
				text: `Будет удалена группа «${category.name}» вместе с вложенными группами. Товары останутся без категории. Продолжить?`,
				content: {
					id: category.id
				},
				loading: false
			}
		}

		async delete() {
			try {
				this.modal.loading = true
				await api.callMethod('DELETE', routes.product_categories.delete.replace('${id}', this.modal.content.id))
				if (this.active) {
					this.active = null
					this.query.category_id = null
				}
				await this.load()
				this.keyUpdate++
			} catch (error) {
				console.log(error)
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}
	}

	const catalog = ref(new Catalog())

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
		if (isCatalog.value) {
			catalog.value.load()
		}

		setTimeout(() => {
			const title = metaJSON[pageSlug.value]?.title
			if (title) {
				useHead({
					title: `${title} | Compas.pro`
				})
			}
		}, 100);
	})

</script>
