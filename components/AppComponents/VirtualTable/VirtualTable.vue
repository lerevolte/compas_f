<template>
  <TableCalc
    v-if="table.slug == 'products' && props.options?.isLocalTable"
  />

  <section class="section-table" ref="sectionRef">
    <TableTop v-if="props.options?.isHaveTopHeader" :options="props.options" :showMore="props.showMore" :title="props.options?.title ?? null">
      <template v-if="$slots.topTitle" #title><slot name="topTitle" /></template>
      <template v-if="$slots.topActions" #actions><slot name="topActions" /></template>
    </TableTop>
    <div ref="tableRef" class="table" :class="{'table_permanent-edit': props.options.isPermanentEdit, 'table_short': props.options?.isShort, 'table_dragging': table.isDragging, 'table_append-on-drop': props.options?.isAppendOnDrop, 'table_products': table.slug == 'products'}">
      <TableHeader>

      </TableHeader>
      <div class="socket-row" v-if="!props.options?.isDisableSockets && socketRelevantCount > 0" >
          {{ socketRelevantCount }} изменения в таблице <span class="socket-row__button" @click="reloadFromSocket()"> Загрузить </span>
        </div>
      <!--
        ScrollButtons размещены ПЕРЕД телом таблицы с height:0, чтобы не
        занимать вертикальное место. Sticky-позиционирование прилипает к
        top: calc(50% - 40px) при вертикальном скролле контейнера (.table).
      -->
      <ScrollButtons />
      <TableBody
        :options="props.options"
        @choseRow="row => emit('choseRow', row)"
        @changeActive="row => emit('changeActive', row)"
        @getData="data => emit('getData', data)"
      />
      <div class="loader__wrapper" v-if="table.loading">
        <IconLoader />
      </div>
    </div>
    <TableFooter v-if="props.options?.isHaveFooter" />
  </section>

  <teleport :to="massActionTarget" v-if="isClient && !props.options?.isDisableMassAction && !props.options?.isExternal">
    <MassAction
      :isChoosed="isChoosed"
      :checkedCount="checkedCount"
      :actions="{
        save: table.state == 'edit',
        edit: !props.options.isTrash && table.state != 'edit' && canUpdate,
        cancel: true,
        restore: props.options.isTrash,
        delete: !props.options.isTrash && table.state != 'edit' && canDelete,
        printUpd: !props.options.isTrash && table.state != 'edit' && ['logistic_tasks', 'pickups'].includes(table.slug)
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
          @delete="confirmDelete()"
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
  <teleport to="#menu__overlay" v-if="table.validateBuffer?.state">
      <AppModalWarning
          :options="{
              title: 'Обязательные поля',
              action: 'saveValidate',
              actionTitle: 'Сохранить',
              template: 'slot'
          }"
          :loading="table.saving"
          @saveValidate="() => { table.validateBuffer.state = false; table.save(); }"
          @close="table.validateBuffer.state = false"
      >
          <TableValidate />
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

<script>
  // (8459) Горизонтальная прокрутка таблицы запоминается между пересозданиями
  // компонента. Таблица «Задачи в машине» пересоздаётся при смене маршрута
  // (меняется :key), из-за чего scrollLeft сбрасывался. Карта модульного уровня
  // живёт всё время работы SPA и хранит позицию по ключу slug+route_id.
  const tableScrollPositions = new Map()
  const unsavedHeaderSettings = new Map()
</script>

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
  import TableValidate from './Validate/Validate.vue'
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
          isShort: false,
          query: {},
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
      'saveTable',
      'getData',
      'initCreateRoute',
      'choseRow',
      'addRow',
      'removeRow',
      'changeActive',
      'changePositionRow',
      'deletedRows',
  ])

  // Подтверждение удаления строк: ids снимаем ДО table.delete() —
  // он чистит deleteBuffer в finally. Родителю (например, странице
  // логистики) нужен список удалённых id, чтобы среагировать
  // (сбросить активный маршрут, перезагрузить связанные таблицы).
  const confirmDelete = async () => {
      const ids = (table.value.deleteBuffer.list || []).map(p => p.id)
      await table.value.delete()
      emit('deletedRows', ids)
  }

  const isClient = ref(false)
  const tableRef = ref(null)
  const sectionRef = ref(null)
  // Когда таблица отрисована внутри модалки — Large.vue подкидывает
  // персональный таргет, чтобы MassAction не прятался под модалкой.
  const massActionTarget = inject('massActionTarget', '#mass-action-container')

  const table = ref(new Table({tableRef, slug: props.slug, path: props.path, pageId: props.pageId, options: props.options, emit}))
  const common = new Common()
  const socket = inject('socket')

  // (8459) Сохранение/восстановление горизонтальной прокрутки таблицы.
  // Таблица «Задачи в машине» пересоздаётся при КАЖДОЙ смене маршрута (меняется
  // :key), из-за чего scrollLeft сбрасывался в начало. Нужно, чтобы при
  // переключении маршрута горизонтальная позиция СОХРАНЯЛАСЬ (переносилась) —
  // поэтому ключ СТАБИЛЬНЫЙ, без route_id (одна позиция на всю таблицу задач в
  // машине). Идентифицируем эту таблицу по наличию query.route_id.
  const scrollKey = computed(() => {
    const routeId = props.options?.query?.route_id
    if (routeId == null || routeId === '') return null
    const group = props.options?.group ?? props.slug
    return `route_tasks:${group}`
  })
  let scrollRestored = false

  const saveScrollPosition = () => {
    if (!scrollKey.value || !tableRef.value) return
    tableScrollPositions.set(scrollKey.value, tableRef.value.scrollLeft)
  }

  const restoreScrollPosition = () => {
    if (!scrollKey.value || !tableRef.value) return
    const left = tableScrollPositions.get(scrollKey.value)
    if (!left) return
    // Ширина контента таблицы устаканивается после отрисовки строк/колонок —
    // выставляем scrollLeft в следующем кадре, иначе значение клампится к 0.
    const apply = () => { if (tableRef.value) tableRef.value.scrollLeft = left }
    apply()
    requestAnimationFrame(apply)
  }

  const canCreate = computed(() => table.value.permissions?.create_p !== 'N')
  const canUpdate = computed(() => {
    const p = table.value.permissions?.update_p
    if (p === 'N') return false
    if (p === 'Y') return table.value.body.filter(r => r.isChoose).every(r => table.value.ownsRow(r))
    return true
  })
  const canDelete = computed(() => {
    const p = table.value.permissions?.delete_p
    if (p === 'N') return false
    if (p === 'Y') return table.value.body.filter(r => r.isChoose).every(r => table.value.ownsRow(r))
    return true
  })

  const isChoosed = computed(() => {
        // MassAction показываем при чекбокс-выделении, при правке строки, а
        // также когда таблица в режиме правки (state=='edit') — иначе при
        // удалении ВСЕХ товаров на вкладке «Товары и услуги» body пустел и
        // панель сохранения исчезала, не давая сохранить задачу без товаров (8551).
        return table.value.state == 'edit' || table.value.body.some(item => item.isChoose || item.edit)
    })

  const checkedCount = computed(() => {
        // «Выбрано» считает только реально отмеченные чекбоксом строки.
        return table.value.body.filter(item => item.isChoose).length
    })

  onMounted(async () => {
    nextTick(() => {
      initTable()
      if (!props.options?.isDisableSockets) {
        socket.value.set({slug: props.slug})
        if (socket.value.entities[props.slug]?.table) {
          socket.value.entities[props.slug].table = []
        }
      }
      // Запоминаем позицию горизонтального скролла этой таблицы (8459).
      tableRef.value?.addEventListener('scroll', saveScrollPosition, { passive: true })
    })
  })

  onBeforeUnmount(() => {
    saveScrollPosition()
    saveUnsavedHeader()
    tableRef.value?.removeEventListener('scroll', saveScrollPosition)
  })

  const saveUnsavedHeader = () => {
    if (!scrollKey.value) return
    if (table.value.isChanged && Array.isArray(table.value.header) && table.value.header.length) {
      unsavedHeaderSettings.set(scrollKey.value, JSON.parse(JSON.stringify(table.value.header)))
    } else {
      unsavedHeaderSettings.delete(scrollKey.value)
    }
  }

  let headerRestored = false
  watch(() => table.value.header, (header) => {
    if (headerRestored || !scrollKey.value) return
    if (!Array.isArray(header) || !header.length) return
    headerRestored = true
    const saved = unsavedHeaderSettings.get(scrollKey.value)
    if (!saved) return
    table.value.header = JSON.parse(JSON.stringify(saved))
    table.value.isChanged = true
  })

  // После загрузки строк (когда ширина контента уже определена) один раз
  // восстанавливаем сохранённую позицию прокрутки для текущего маршрута.
  watch(() => table.value.body.length, (count) => {
    if (count > 0 && !scrollRestored) {
      scrollRestored = true
      nextTick(restoreScrollPosition)
    }
  })

  const initTable = async () => {
    isClient.value = true

    await nextTick()
    if (props.slug == null && props.path == null) return
    if (props.slug != null && table.value.slug !== props.slug) {
      table.value.setSortItem({ sort_field: null, sort_order: null })
      table.value.isChanged = false
    }
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


    if (!props.options?.isLocalTable && !props.options?.isDisableSockets) {
      table.value.socket = socket.value.entities[props.slug]
    }
  }

  watch(() => [props.table?.table, props.table?.list], () => {
    if (props.options?.isLocalTable && isClient.value) {
      table.value.getLocalTable(props.table)
    }
  })

  watch(() => props.options.updatingCount, () => {
    if (props.options.updatingCount) {
      // Сбрасываем socket-очередь перед ручной перезагрузкой — иначе баннер
      // «N изменений» остаётся видимым даже после того, как таблица уже обновлена.
      if (table.value.socket?.table) table.value.socket.table = []
      initTable()
    }
  })

  watch(() => props.options.localFilter, () => {
    if (props.options.isHaveLocalFilter) {
      table.value.options.localFilter = props.options.localFilter
    }
  })

  if (!props.options?.isDisableSockets) {
    watch(() => socket.value.entities[props.slug], () => {
      table.value.socket = socket.value.entities[props.slug]
    }, {deep: true})
  }

  provide('table', table)
  provide('filter', table.value.filter)
  provide('tableRef', tableRef)
  provide('sectionRef', sectionRef)

  // Внешнему коду (например, Logistic.vue) нужен доступ к state-объекту таблицы,
  // чтобы синхронизировать выделение строк между связанными таблицами
  // («Задачи логистики» ↔ «Задачи в машине» делят общий focused-task).
  defineExpose({ table, sectionRef })

  // Несколько таблиц могут делить один slug (например, в логистике
  // 'logistic_tasks' рендерится дважды: Задачи логистики и Задачи в
  // машине). Socket-плашка раньше «загоралась» на ОБОИХ инстансах при
  // правке любой задачи.
  //
  // Дефолт: показываем плашку только для строк, чьи id присутствуют в
  // body этой таблицы. Это автоматически даёт правильную раскладку «своя
  // плашка в своей таблице» без необходимости парсить поля viewList и без
  // зависимости от конкретного формата relation/date.
  //
  // options.socketFilter — необязательный override-предикат, если нужна
  // более тонкая логика (например, показывать плашку и для новых строк,
  // которых ещё нет в body).
  const socketRelevantCount = computed(() => {
    const rows = table.value.socket?.table || []
    if (!rows.length) return 0
    const filter = props.options?.socketFilter
    if (typeof filter === 'function') {
      return rows.filter(item => {
        try { return filter(item?.row || {}) } catch (e) { return true }
      }).length
    }
    const body = table.value.body || []
    const bodyIds = new Set(body.map(r => r?.id).filter(id => id != null))
    // Новые объекты (state 'create'): показываем плашку только если id ещё нет
    // в body — значит, пользователь ещё не видел эту строку. Если id уже есть
    // в body (таблица обновилась через updatingCount раньше, чем пришёл socket),
    // плашку не показываем. Остальные (update/delete) — только если в body.
    return rows.filter(item => {
      if (item?.state === 'create') return !bodyIds.has(item?.row?.id)
      return bodyIds.has(item?.row?.id)
    }).length
  })

  // Перезагрузка таблицы при клике «Загрузить» в socket-плашке. Прежняя
  // реализация делала table.get(), но это игнорировало isHaveQuery (на
  // странице Логистики таблица маршрутов фильтруется по дате) и в
  // результате после загрузки прилетали ВСЕ маршруты, а не на текущую дату.
  // Используем тот же путь, что и initTable, чтобы query учитывался.
  const reloadFromSocket = () => {
    table.value.getSocketRows()
    if (props.options.isHaveQuery) {
      table.value.dependences = { state: true, query: props.options.query }
      table.value.getWithQuery(common.getQueryUrl())
    } else if (common.getQueryUrl()) {
      table.value.getWithQuery(common.getQueryUrl())
    } else {
      table.value.get()
    }
  }
</script>