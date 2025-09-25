<template>
  <section class="section-table">
    <TableTop />

    <div ref="tableRef" class="table">
      <TableHeader />
      <TableBody />
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
  
  import isEqual from 'lodash/isEqual'
  import api from '@AppHelpers/api.js'
  import routes from '@AppHelpers/routes.js'
  import { Common } from '@AppHelpers/classes.js'
  import { useVirtualizer } from '@tanstack/vue-virtual'
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
  const common = new Common()

  class Table {
    constructor() {
      this.isChanged = false
      this.header = []
      this.body = []
      this.rowVirtualizer = null
      this._virtScope = null
      this.pages = {
        current: 1,
        total: 1,
        limit: 25
      }
      this.sortItem = {
        sort_field: null,
        sort_order: null
      }
      this.loading = false
      this.saving = false
      this.state = null
      this.backup = {
        header: [],
        body: []
      }
      this.deleteBuffer = {
        state: false,
        list: []
      }
      this.downloadExcelBuffer = {
        state: false,
        loading: false,
        link: null
      }
    }

    // Получение данных для таблицы
    async get() {
      try {
        this.loading = true
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug))
        this.set(response.data, true)
        this.getHeader(response.data.table)
        await this.initVirtualizer()
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    // Получение данных для таблицы с параметрами
    async getWithQuery() {
      try {
        this.loading = true
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug) + this.getQuery(common.getQueryUrl()))
        this.set(response.data, true)
        this.getHeader(response.data.table)
        await this.initVirtualizer()
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    async initVirtualizer() {
      // корректно очищаем предыдущий scope
      if (this._virtScope) {
        try { this._virtScope.stop() } catch (e) {}
        this._virtScope = null
      }
      await nextTick()
      const scope = effectScope()
      this._virtScope = scope
      scope.run(() => {
        this.rowVirtualizer = useVirtualizer({
          count: this.body.length,
          estimateSize: () => 50,
          getScrollElement: () => tableRef.value,
          overscan: 8,
        })
      })
    }

    // Установка таблицы
    async set(response, skip = false) {
      this.getBody(response.list.data)
      this.setSortItem({
        sort_field: response.list.sort_field,
        sort_order: response.list.sort_order
      })
      this.pages = {
        current: response.list.current_page,
        total: response.list.last_page,
        limit: response.list.per_page
      }
      await this.initVirtualizer()
      this.rowVirtualizer.scrollToIndex(0)
      this.rowVirtualizer.measure()
      this.clear()
      this.setQueryUrl(skip)      
    }

    // Получнеие шапки
    getHeader(data) {
      this.header = data
    }

    // Получение контента
    getBody(data) {
      this.body = data
    }

    // Получение квери параметров таблицы
    getQuery(query = null) {
      let local_query = {
        per_page: this.pages.limit,
        page: this.pages.current,
        sort_field: this.sortItem.sort_field,
        sort_order: this.sortItem.sort_order
      }

      return `?${new URLSearchParams(query ?? local_query).toString()}`
    }

    // Установка квери параметров
    setQueryUrl(skip = false) {
      if (skip) return
      common.setQueryUrl(this.getQuery())
    }

    // Сортировка
    async setSortItem(item) {
      this.sortItem = item
    }

    // Вернуть настройки по умолчанию
    async reset() {
      try {
        this.loading = true
        this.setSortItem({
          sort_field: 'id',
          sort_order: 'asc'
        })
        this.isChanged = true
        this.pages.current = 1
        const response = await api.callMethod('GET', routes.table.reset.replace('${slug}', props.slug))
        this.set(response.data)
        this.getHeader(response.data.table)
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    // Сохранение
    async save() {
      try {
        this.saving = true
        let rawRequest = this.body.filter(row => row.edit)
        let request = []
        let requestRow = {}
        let isEdit = false
        let column = null

        for (let backupRow of this.backup.body) {
          requestRow = {}
          isEdit = false

          let row = rawRequest.find(item => item.id == backupRow.id)
          
          if (row) {
            for (let key in row) {
              if (!isEqual(row[key], backupRow[key]) && ['isChoose', 'edit'].indexOf(key) == -1) {
                column = this.header.find(column => column.key == key)
                requestRow[key] = JSON.parse(JSON.stringify(row[key]))
                
                if (column.type == 'relation') {
                  row[key].value = row[key].value.filter(p => p != null)
                  row[key].localOptions = row[key].localOptions.filter(p => p != null)
                  requestRow[key] = requestRow[key].value.filter(p => p != null)
                }

                isEdit = true
              }
            }

            if (isEdit) {
              requestRow.id = row.id
              request.push(requestRow)
            }
          }
        }
        
        if (request.length == 0) return
        await api.callMethod('POST', routes.table.save.replace('${slug}', props.slug), {rows: request})   
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.clear()
        this.saving = false
      }
    }

    // Создание
    create() {
      emit('openModal', {type: 'create'})
    }

    // Отмена редактирования
    cancel() {
      let backupRow = null
      for (let i = 0; i < this.body.length; i++) {
        backupRow = this.backup.body.find(item => item.id == this.body[i].id)
        if (backupRow) {
          this.body[i] = backupRow
        }
      }

      this.clear()
    }

    // Очистка строк
    clear() {
      for (let i = 0; i < this.body.length; i++) {
        this.body[i].isChoose = false
        this.body[i].edit = false
      }
      
      let isChooseAll = this.header.find(column => column.key == 'isChoose')
      isChooseAll.value = false
      this.state = null
      this.backup.body = []
    }

    // Инициализация скачивания Excel
    async initDownloadExcel() {
      let response = null
      try {
        this.downloadExcelBuffer.state = true
        this.downloadExcelBuffer.loading = true
        let request = this.header.filter(p => p.key != 'isChoose' && p.key != 'actions' && p.enabled).map(p => {return `fields[]=${p.key}`})
        response = await api.callMethod('GET', routes.table.download.replace('${slug}', props.slug) + `?${request.join('&')}`)
      } catch (error) {
        console.log('error_download_excel', error);
      } finally {
        this.downloadExcelBuffer.link = response.data.link
        this.downloadExcelBuffer.loading = false
      }
    }

    // Скачать Excel
    downloadExcel() {
      window.open(this.downloadExcelBuffer.link, '_blank')
      this.downloadExcelBuffer = {
        link: null,
        loading: false,
        state: false
      }
    }

    // Выбрать все строки
    chooseAll(state) {
      if (state) {
        this.body.forEach(row => {
          row.isChoose = true
        })
      } else {
        this.body.forEach(row => {
          row.isChoose = false
        })
      }
    }

    // Открыть строку
    open(row) {
      emit('openModal', {type: 'open', item: row})
    }

    // Редактировать строку (батчами для избежания зависаний)
    async edit(rows = []) {
      rows = Array.isArray(rows) ? rows : [rows]

      this.backup.body = JSON.parse(JSON.stringify(rows))
      this.state = 'edit'

      const CHUNK_SIZE = 200
      for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE, rows.length)
        for (let i = start; i < end; i++) {
          rows[i].edit = true
          rows[i].isChoose = true
        }
        // отдаём управление главному потоку между пачками
        await new Promise(requestAnimationFrame)
      }
    }

    // Копировать строку 
    copy(row) {
      emit('openModal', {type: 'copy', item: row})
    }

    // Инициализация удаления
    initDelete(rows = []) {
      this.deleteBuffer = {
        list: Array.isArray(rows) ? rows : [rows],
        state: true
      }
    }

    // Удалить строку 
    async delete() {
      try {
        this.deleteBuffer.loading = true
        let request = this.deleteBuffer.list.map(p => p.id)
        this.body = this.body.filter(row => this.deleteBuffer.list.findIndex(item => item.id == row.id) == -1)
        await api.callMethod('DELETE', routes.table.delete.replace('${slug}', props.slug), {ids: request})
      } catch (error) {
        console.log('delete', error);
      } finally {
        this.deleteBuffer = {
          list: [],
          loading: false,
          state: false
        }
      }

      try {
        this.loading = true
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug) + this.getQuery())
        this.set(response.data)
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    // Пагинация
    async changePage(page) {
      try {
        this.loading = true
        this.pages.current = page
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug) + this.getQuery())
        this.set(response.data)
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    // Сортировка таблицы
    async sort(column) {
      try {
        this.loading = true
        if (['isChoose', 'actions'].includes(column.key)) return
        this.setSortItem({
          sort_field: column.key,
          sort_order: column.key == this.sortItem.sort_field ? this.sortItem.sort_order == 'asc' ? 'desc' : 'asc' : 'asc'
        })
        this.isChanged = true
        this.pages.current = 1
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug) + this.getQuery())
        this.set(response.data)
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }

    // Сохранение настроек
    async saveSettings(role) {
      let method = routes.table.save_settings.replace('${slug}', props.slug)
      
      await api.callMethod('POST', role ? `${method}/${role}` : method, {
        sort_field: this.sortItem.sort_field,
        sort_order: this.sortItem.sort_order,
        fields: this.header
      })
      this.isChanged = false
    }

    // Изменение количества страниц
    async setCountPage() {
      try {
        this.loading = true
        this.isChanged = true
        this.pages.current = 1
        const response = await api.callMethod('GET', routes.table.get.replace('${slug}', props.slug) + this.getQuery())
        this.set(response.data)
      } catch (error) {
        console.log('get_table', error);
      } finally {
        this.loading = false
      }
    }
  }

  const table = ref(new Table())

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
</script>