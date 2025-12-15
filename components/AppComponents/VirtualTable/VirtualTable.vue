<template>
  <TableCalc 
    v-if="table.slug == 'products'"
  />
  
  <section class="section-table" ref="sectionRef">
    <TableTop v-if="props.options?.isHaveTopHeader" :options="props.options" :showMore="props.showMore" :title="props.options?.title ?? null"/>
    <div ref="tableRef" class="table" :class="{'table_permanent-edit': props.options.isPermanentEdit}">
      <TableHeader />
      <TableBody 
        @choseRow="row => emit('choseRow', row)"
      />
      <IconLoader v-if="table.loading"/>
      <ScrollButtons />
    </div>
    <TableFooter v-if="props.options?.isHaveFooter" />
  </section>

  <teleport to="#mass-action-container" v-if="isClient">
    <MassAction 
      :isChoosed="isChoosed"
      :actions="{
        save: table.state == 'edit',
        edit: !props.options.isTrash && table.state != 'edit',
        cancel: true,
        restore: props.options.isTrash,
        delete: !props.options.isTrash && table.state != 'edit'
      }"
      :loading="table.saving"
      @action="action => table[action.action](action.value)"
    />
  </teleport>
  <teleport to="#menu__overlay" v-if="table.deleteBuffer.state && table.deleteBuffer.type == 'delete'">
      <AppModalWarning 
          :options="{
              title: 'Удаление',
              action: 'delete',
              actionTitle: 'Удалить',
              template: 'slot'
          }"
          :loading="table.deleteBuffer.loading"
          @delete="table.delete()"
          @close="table.deleteBuffer.state = false"
      >
          <p class="warning__text">
              Будет удалено {{ table.deleteBuffer.list?.length }} строк. Продолжить?
          </p>
      </AppModalWarning>
  </teleport>
  <teleport to="#menu__overlay" v-if="table.deleteBuffer.state && table.deleteBuffer.type == 'restore'">
      <AppModalWarning 
          :options="{
              title: 'Восстановление',
              action: 'restore',
              actionTitle: 'Восстановить',
              template: 'slot'
          }"
          :loading="table.deleteBuffer.loading"
          @restore="table.restore()"
          @close="table.deleteBuffer.state = false"
      >
          <p class="warning__text">
              Будет восстановлено {{ table.deleteBuffer.list?.length }} строк. Продолжить?
          </p>
      </AppModalWarning>
  </teleport>
  <teleport to="#menu__overlay" v-if="table.downloadExcelBuffer.state">
      <AppModalWarning 
          :options="{
              title: 'Скачать Excel',
              action: 'downloadExcel',
              actionTitle: 'Скачать',
              template: 'slot'
          }"
          :loading="table.downloadExcelBuffer.loading"
          @downloadExcel="table.downloadExcel()"
          @close="table.downloadExcelBuffer.state = false"
      >
          <p class="warning__text">
            Будет скачан файл Excel текущей таблицы. Продолжить?
          </p>
      </AppModalWarning>
  </teleport>
  <teleport to="#filter-container" v-if="props.options.isHaveFilter && isClient">
    <AppFilter 
      :filter="table.filter"
    />
  </teleport>
</template>

<script setup>
  import './VirtualTable.scss'

  import IconLoader from '@AppIcons/Loader.vue'
  import { Table, Common } from '@AppHelpers/classes.js'
	import AppFilter from '@AppComponents/Filter/Filter.vue'
  import TableTop from '@AppComponents/VirtualTable/Top/Top.vue'
  import TableBody from '@AppComponents/VirtualTable/Body/Body.vue'
  import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
  import TableHeader from '@AppComponents/VirtualTable/Header/Header.vue'
  import TableFooter from '@AppComponents/VirtualTable/Footer/Footer.vue'
  import MassAction from '@AppComponents/MassAction/MassAction.vue'
  import TableCalc from './Calc/Calc.vue'
  import ScrollButtons from '@AppComponents/VirtualTable/ScrollButtons/ScrollButtons.vue'
  
  const props = defineProps({
      pageId: {
        default: null,
        type: [Number, String]
      },
      slug: {
          default: '',
          type: String
      },
      path: {
          default: '',
          type: String
      },
      options: {
        default: {
          title: null,
          isCheckClicked: false,
          isLocalTable: false,
          isHaveQuery: false,
          query: {},
          isHaveFilter: true,
          isPermanentEdit: false,
          isTrash: false,
          isHaveTopHeader: true,
          isHaveFooter: true,
          isHaveLocalFilter: false,
          localFilter: [],
          updatingCount: 0
        },
        type: Object
      },
      showMore: {
        default: null,
        type: Array
      },
      table: {
        default: {
          header: [],
          body: []
        }
      },
      
  })

  const emit = defineEmits([
      'openModal',
      'getData',
      'initCreateRoute',
      'choseRow'
  ])

  const isClient = ref(false)
  const tableRef = ref(null)
  const sectionRef = ref(null)

  const table = ref(new Table({tableRef, slug: props.slug, path: props.path, pageId: props.pageId, options: props.options, emit}))
  const common = new Common()

  const isChoosed = computed(() => {
        return table.value.body.filter(item => item.isChoose).length > 0
    })

  onMounted(async () => {
    nextTick(() => {
      initTable()
    })
  })

  const initTable = async () => {
    isClient.value = true

    await nextTick()
    if (props.slug == null && props.path == null) return
    table.value.slug = props.slug
    table.value.path = props.path
    if (props.options?.isLocalTable) {
      table.value.getLocalTable(props.table)
    } else if (props.options.isHaveQuery) {
      table.value.dependences = {
        state: true,
        query: props.options.query
      }
      table.value.getWithQuery(common.getQueryUrl())
    } else if (common.getQueryUrl()) {
      table.value.getWithQuery(common.getQueryUrl())
    } else {
      table.value.get()
    }
  }

  watch(() => props.options.updatingCount, () => {
    if (props.options.updatingCount) {
      initTable()
    }
  })

  watch(() => props.options.localFilter, () => {
    if (props.options.isHaveLocalFilter) {
      table.value.options.localFilter = props.options.localFilter
    }
  })

  provide('table', table)
  provide('filter', table.value.filter)
  provide('tableRef', tableRef)
  provide('sectionRef', sectionRef)
</script>