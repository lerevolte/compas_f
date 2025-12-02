<template>
    <main class="page_categories">
		<div class="page__header">
			<AppH1 id="mobile-menu-target">
				Настройка ролей сущности
			</AppH1>
		</div>

		<AppCategories 
			:list="userStore.roles" 
			:active="categories.active" 
			:modalActions="categories.modalActions"
			:options="{
				isHaveHeaderActions: true
			}"
			@action="action => categories[action.action](action.value)"
		>
			<template #name>
				Роли
			</template>
		</AppCategories>
		<AppVirtualTable 
			:slug="null"
			:path="`/roles/${categories.active}`"
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

		<teleport to="#menu__overlay" v-if="categories.modal.state">
            <AppModalWarning 
                :options="{
                    title: categories.modal.title,
                    action: categories.modal.action,
                    actionTitle: categories.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="categories.modal.loading"
                @delete="categories.delete()"
                @update="categories.update()"
                @create="categories.create()"
                @close="categories.modal.state = false"
            >
            <template v-if="categories.modal.action == 'delete'">
                <p class="warning__text">
                    {{ categories.modal.text }}
                </p>
            </template>
            <template v-else-if="categories.modal.action == 'create' || categories.modal.action == 'update'">
                <AppInput 
                    v-model="categories.modal.content.title"
                    :options="{
                        id: 0,
                        title: 'Имя роли',
                        type: 'text',
                        name: 'name'
                    }"
                />
            </template>
            </AppModalWarning>
        </teleport>
    </main>
</template>

<script setup>
	import AppH1 from '@AppComponents/Headers/H1/H1.vue';

	import routes from '@/helpers/routes.js'
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
	import AppCategories from '@AppComponents/Categories/Categories.vue';
	import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue';
	import api from '@/helpers/api.js'

	import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()

	const emit = defineEmits([
		'openModal'
	])

	const router = useRoute()

	class Categories {
		constructor() {
			this.keyUpdate = 0
			this.active = 1
			this.modalActions = [
				{
                    name: "Изменить имя",
                    action: "initUpdate"
				},
				{
                    name: "Удалить",
                    action: "initDelete"
				}
			]
			this.modal = {
                state: false,
                title: 'Создание роли',
                actionTitle: 'Удалить',
                action: 'delete',
                content: {},
                text: 'Вы действительно хотите удалить роль?'
            }
		}

		// Установка активной категории
		set(category) {
			this.active = category.id
			this.keyUpdate++
		}

		// Инициализация создания
		initCreate() {
			this.modal = {
				state: true,
				title: 'Создание роли',
				actionTitle: 'Создать',
				action: 'create',
				text: null,
				content: {
					title: null,
				},
				loading: false
			}
		}

		// Создание
		async create() {
			try {
				this.modal.loading = true
				await api.callMethod('POST', routes.roles.create, this.modal.content)
			} catch (error) {
				console.log(error);
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}

		// Инициализация обновления 
		initUpdate(category) {
			this.modal = {
				state: true,
				title: 'Изменение роли',
				actionTitle: 'Сохранить',
				action: 'update',
				text: null,
				content: {
					id: category.id,
					title: category.label,
				},
				loading: false
			}
		}

		// Обновление
		async update() {
			try {
				this.modal.loading = true
				await api.callMethod('PUT', routes.roles.update.replace('${id}', this.modal.content.id), {title: this.modal.content.title})
			} catch (error) {
				console.log(error);
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}

		// Инициализация удаления 
		initDelete(category) {
			this.modal = {
				state: true,
				title: 'Удаление роли',
				actionTitle: 'Удалить',
				action: 'delete',
				text: 'Будет удалена роль . Продолжить?',
				content: {
					id: category.id
				},
				loading: false
			}
		}

		// Удаление
		async delete() {
			try {
				this.modal.loading = true
				await api.callMethod('DELETE', routes.roles.delete.replace('${id}', this.modal.content.id))
				userStore.roles = userStore.roles.filter(role => role.id != this.modal.content.id)
			} catch (error) {
				console.log(error);
			} finally {
				this.modal.loading = false
				this.modal.state = false
			}
		}
	}

	const categories = ref(new Categories())

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
			title: `Настройка ролей сущности | Compas.pro`
		})
	})

</script>