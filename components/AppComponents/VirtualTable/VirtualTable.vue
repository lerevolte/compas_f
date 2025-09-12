<template>
  <section class="section-table">
    <TableTop />

    <div ref="tableRef" class="table">
      <TableHeader />
      <TableBody />
    </div>
    <TableFooter />
  </section>
</template>

<script setup>
  import './VirtualTable.scss'
  import dataJSON from './data.json'

  import { useVirtualizer } from '@tanstack/vue-virtual'
  import TableTop from '@AppComponents/VirtualTable/Top/Top.vue'
  import TableHeader from '@AppComponents/VirtualTable/Header/Header.vue'
  import TableBody from '@AppComponents/VirtualTable/Body/Body.vue'
  import TableFooter from '@AppComponents/VirtualTable/Footer/Footer.vue'
  
  const tableRef = ref(null)

  class Table {
    constructor() {
      this.isChanged = false
      this.header = []
      this.body = []
      this.rowVirtualizer = null
      this.pages = {
        current: 1,
        total: 6,
        limit: 25
      }
      this.sortItem = {
        sort_field: null,
        sort_order: null
      }
      this.visibleColumns = []
    }

    // Получение данных для таблицы
    get() {
      this.getHeader(dataJSON.meta)
      this.setSortItem({
        sort_field: dataJSON.list.sort_field,
        sort_order: dataJSON.list.sort_order
      })
      this.getBody(dataJSON.data)
      this.rowVirtualizer = useVirtualizer({
        count: this.body.length,
        estimateSize: () => 40,
        getScrollElement: () => tableRef.value,
        overscan: 5,
      })
    }

    // Получнеие шапки
    getHeader(data) {
      this.header = data
      this.visibleColumns = computed(() => this.header.filter(p => p.enabled))
    }

    // Получение контента
    getBody(data) {
      this.body = data
    }

    setSortItem(item) {
      this.sortItem = item
    }

    // Вернуть настройки по умолчанию
    reset() {
      console.log('reset');
    }

    // Сохранение
    save(role) {}

    // Создание
    create() {
      console.log('create');
    }

    // Отмена редактирования
    cancel() {

    }

    // Скачать Excel
    downloadExcel() {
      console.log('downloadExcel');
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
    open() {

    }

    // Редактировать строку
    edit(row) {
      row.edit = true
      console.log(row);
    }

    // Копировать строку 
    copy() {

    }

    // Удалить строку 
    delete() {

    }

    // Пагинация
    changePage(page) {
      this.pages.current = page
    }

    // Сортировка таблицы
    sort(column) {
      this.setSortItem({
        sort_field: column.key,
        sort_order: column.key == this.sortItem.sort_field ? this.sortItem.sort_order == 'asc' ? 'desc' : 'asc' : 'asc'
      })
    }
  }

  const table = ref(new Table())

  onMounted(() => {
    table.value.get()
  })

  provide('table', table)
  provide('tableRef', tableRef)
</script>