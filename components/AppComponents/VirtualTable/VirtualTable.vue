<template>
  <TableCalc 
    v-if="table.slug == 'products'"
  />

  <section class="section-table" ref="sectionRef">
    <TableTop v-if="props.options?.isHaveTopHeader" :options="props.options" :showMore="props.showMore" :title="props.options?.title ?? null"/>
    <div ref="tableRef" class="table" :class="{'table_permanent-edit': props.options.isPermanentEdit, 'table_short': props.options?.isShort, 'table_dragging': table.isDragging, 'table_append-on-drop': props.options?.isAppendOnDrop}">
      <TableHeader>

      </TableHeader>
      <div class="socket-row" v-if="!props.options?.isDisableSockets && socketRelevantCount > 0" >
          {{ socketRelevantCount }} изменения в таблице <span class="socket-row__button" @click="reloadFromSocket()"> Загрузить </span>
        </div>
      <!--
        ScrollButtons вынесены ПЕРЕД телом таблицы. Sticky-стрелки нуждаются
        в element, который изначально находится выше своей sticky-позиции,
        чтобы как только пользователь начинает скроллить вниз — sticky
        активировался и стрелки парили посередине viewport контейнера.
        Размещаем их в зоне 0×0 (height:0) — они не «отжимают» строки.
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

  <teleport :to="massActionTarget" v-if="isClient && !props.options?.isDisableMassAction">
    <MassAction
      :isChoosed="isChoosed"
      :checkedCount="checkedCount"
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
  ])

  const isClient = ref(false)
  const tableRef = ref(null)
  const sectionRef = ref(null)
  // Когда таблица отрисована внутри модалки — Large.vue подкидывает
  // персональный таргет, чтобы MassAction не прятался под модалкой.
  const massActionTarget = inject('massActionTarget', '#mass-action-container')

  const table = ref(new Table({tableRef, slug: props.slug, path: props.path, pageId: props.pageId, options: props.options, emit}))
  const common = new Common()
  const socket = inject('socket')

  const isChoosed = computed(() => {
        // MassAction показываем и при чекбокс-выделении, и при правке строки.
        return table.value.body.some(item => item.isChoose || item.edit)
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
      }
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


    if (!props.options?.isLocalTable && !props.options?.isDisableSockets) {
      table.value.socket = socket.value.entities[props.slug]
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
    // Новые объекты (ObjectCreated → state 'create', например после
    // «Скопировать» и сохранения) показываем всегда: их ещё нет в body, но
    // пользователь должен увидеть плашку и подгрузить их. Остальные
    // (update/delete) — только если строка реально есть в текущей таблице.
    return rows.filter(item => item?.state === 'create' || bodyIds.has(item?.row?.id)).length
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