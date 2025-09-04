<template>
  <DynamicScroller
    :items="dataJSON"
    :min-item-size="40"
    :key-field="'id'"
    class="virtual-table"
  >
    <template #default="{ item }">
      <DynamicScrollerItem :item="item">
        {{ item }}
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>

<script setup>
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller'
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css'

const props = defineProps({
  dataJSON: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    required: true
  }
})
</script>
