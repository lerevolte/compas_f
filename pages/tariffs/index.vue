template<template>
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

		<div class="tariffs__group" v-if="categories.active == 'balance'">
			<div class="tile-section">
				<div class="tile-section__header">
					Тарифный план
				</div>
				<div class="tile-section__body">
					<div class="tariffs__group-field">
						<AppSelect 
							:options="{
								title: 'Тарифный план',
								list: tariffs.balance.tariffs.options,
							}"
							v-model="tariffs.balance.tariffs.current"
							@update:modelValue="tariffs.balance.tariffs.changed = true"
						/>
						<AppButton 
							class="button_fill" 
							 :class="{'skeleton': tariffs.balance.tariffs.loading}"
							:disabled="!tariffs.balance.tariffs.changed"
							@click="tariffs.updateTariffs()"
						>
							Применить
						</AppButton>
					</div>
				</div>
			</div>

			<div class="tile-section">
				<div class="tile-section__header">
					Пополнение баланса
				</div>
				<div class="tile-section__body">
					<AppBlank 
						:item="{
							title: 'Текущий баланс',
							link: null,
							text: `${common.transformPrice(tariffs.balance.payers.balance, 0)} руб.`
						}"
					/>

					<div class="blank blank_column">
						<div class="blank__title">
							Пополнить баланс
						</div>
						<div class="tariffs__group-field tariffs__group-field_column">
							<AppInput 
								:options="{
									title: 'Сумма',
									type: 'number',
								}"
								v-model="tariffs.balance.payers.sum"
								@update:modelValue="tariffs.balance.payers.changed = true"
							>
								<span class="blank__unit">
									руб.
								</span>
							</AppInput>
							<AppSelect 
								:options="{
									title: 'Компания',
									list: tariffs.balance.payers.company.options,
								}"
								v-model="tariffs.balance.payers.company.value"
								@update:modelValue="tariffs.balance.payers.changed = true"
							/>
							<AppButton 
								class="button_fill button_small" 
								:disabled="!tariffs.balance.payers.changed"
								:class="{'skeleton': tariffs.balance.payers.loading}"
								@click="tariffs.updateBalance()"
							>
								Применить
							</AppButton>
						</div>
					</div>
				</div>
			</div>

			<div class="tile-section">
				<div class="tile-section__header">
					Пополнение баланса
				</div>
				<div class="tile-section__body">
					<AppDate 
						:options="{
							title: 'Выберите диапазон',
							type: 'date',
							multiple: true,
						}"
						v-model="tariffs.balance.actions.date"
						@update:modelValue="categories.updateDate()"
					/>
					<AppBlank 
						class="blank_column"
						:item="{
							title: 'Расход за указанный диапазон',
							link: null,
							text: `${common.transformPrice(tariffs.balance.actions.total_sum, 0)} руб.`
						}"
					/>

					<div class="tile-section__table">
						<AppVirtualTable 
							:slug="'balance_operations'"
							:options="{
								title: null,
								isHaveQuery: true,
								query: {
									date: tariffs.balance.actions?.date
								},
								isPermanentEdit: false,
								isHaveFilter: false,
								isHaveFooter: true,
								isHaveTopHeader: true,
								isTrash: false,
								updatingCount: categories.keyUpdate
							}"
						/>
					</div>
				</div>
			</div>
		</div>

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
			<IconLoader v-if="documents.loading"/>

			<template v-else>
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
			</template>
        </div>
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
	import { Tariffs, Settings, Common } from '@/helpers/classes.js'
	import AppIconPlus from '@AppIcons/Plus.vue'
    import IconLoader from '@AppIcons/Loader.vue'
	import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
	import AppBlank from '@AppComponents/Blank/Blank.vue'
	import AppInput from '@AppComponents/Inputs/Input/Input.vue'
	import AppDate from '@AppComponents/Inputs/Date/Date.vue'
	import { format } from 'date-fns'

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

			switch (this.active) {
				case 'balance':
					tariffs.value.getBalance()
					break;
				case 'documents':
					documents.value.get()
					break;
				default:
					break;
			}
		}

		updateDate() {
			tariffs.value.balance.actions.date = [
				format(tariffs.value.balance.actions.date[0], 'yyyy-MM-dd'),
				format(tariffs.value.balance.actions.date[1], 'yyyy-MM-dd')
			]
			tariffs.value.filterBalance()
			this.keyUpdate++
		}
	}

	const categories = ref(new Categories())
	const tariffs = ref(new Tariffs())
	const common = ref(new Common())

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