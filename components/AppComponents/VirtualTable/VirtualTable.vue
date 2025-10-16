<template>
  <section class="section-table" ref="sectionRef">
    <TableTop />

    <div ref="tableRef" class="table">
      <TableHeader />
      <TableBody />
      <IconLoader v-if="table.loading"/>
      <ScrollButtons />
    </div>
    <TableFooter />
  </section>

  <teleport to="#mass-action-container" v-if="isClient">
    <MassAction />
  </teleport>

  <teleport to="#menu__overlay" v-if="table.deleteBuffer.state">
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

</template>

<script setup>
  import './VirtualTable.scss'

  import IconLoader from '@AppIcons/Loader.vue'
  import { Table, Common } from '@AppHelpers/classes.js'
  import TableTop from '@AppComponents/VirtualTable/Top/Top.vue'
  import TableBody from '@AppComponents/VirtualTable/Body/Body.vue'
  import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
  import TableHeader from '@AppComponents/VirtualTable/Header/Header.vue'
  import TableFooter from '@AppComponents/VirtualTable/Footer/Footer.vue'
  import MassAction from '@AppComponents/VirtualTable/MassAction/MassAction.vue'
  import ScrollButtons from '@AppComponents/VirtualTable/ScrollButtons/ScrollButtons.vue'
  
  const props = defineProps({
      slug: {
          default: '',
          type: String
      }
  })

  const emit = defineEmits([
      'openModal'
  ])

  const isClient = ref(false)
  const tableRef = ref(null)
  const sectionRef = ref(null)

  const table = ref(new Table(tableRef.value, props.slug, emit))
  const common = new Common()

  onMounted(async () => {
    isClient.value = true

    if (common.getQueryUrl()) {
      table.value.getWithQuery()
    } else {
      table.value.get()
    }
  })

  provide('table', table)
  provide('tableRef', tableRef)
  provide('sectionRef', sectionRef)
  
</script>