<template>
  <button @click="edit()">
      Edit
  </button>
      <div ref="tableRef" class="table">
        <div class="table__header">
          <div class="table__row">
            <div
              v-for="col in columns"
              class="table__cell"
              :key="col.key"
              :style="`--cell-size: ${col.width}`"
            >
              {{ col.title }}
            </div>
          </div>
        </div>
        <div class="table__body">
          <div
            v-for="row in rowVirtualizer.getVirtualItems()"
            :key="row.key"
            class="table__row"
            :ref="el => el && rowVirtualizer.measureElement(el)"
            :data-index="row.index"
            :style="`--row-start: ${row.start}px;`"
            >
            <div
              v-for="col in columns"
              class="table__cell"
              :key="col.key"
              :style="`--cell-size: ${col.width}`"
            >
              <AppInput
                v-if="rows[row.index].edit" 
                v-model="rows[row.index][col.key]"
              />
              <span v-else>
              {{ rows[row.index][col.key] }}
            </span>
            </div>
          </div>
        </div>
      </div>
</template>

<script setup>
import './VirtualTable.scss'
import { useVirtualizer } from '@tanstack/vue-virtual'
import dataJSON from './data.json'

  import AppInput from '@AppComponents/Inputs/Input/Input.vue'

const tableRef = ref(null)

const rows = ref(dataJSON.data)
const columns = ref(dataJSON.meta)

// вертикальный виртуализатор
const rowVirtualizer = useVirtualizer({
  count: rows.value.length,
  estimateSize: () => 40,
  getScrollElement: () => tableRef.value,
  overscan: 5,
})

// горизонтальный виртуализатор
const colVirtualizer = useVirtualizer({
  horizontal: true,
  count: columns.value.length,
  estimateSize: () => 150,
  getScrollElement: () => tableRef.value,
  overscan: 3,
})

const edit = () => {
  rows.value.forEach((element, index) => {
    if (index % 2) {
      element.edit = !element.edit
    }
  });
}
</script>
