<template>
    <div class="table-container" ref="tableContainerRef">
        <template v-if="table.body.length > 0">
            <table class="table" :class="{ 'table_loading': props.loading }">
                <TableHeader :loading="props.loading"/>
                <TableBody :loading="props.loading" :filtering="props.filtering" :localLoading="props.localLoading"/>
            </table>
        </template>
        <AppH3 class="table-container__empty" v-else>
            Нет данных
        </AppH3>
    </div>
    <TableFooter v-show="!props.loading && table.pages.total > 1" :loading="props.filtering"/>
</template>

<script setup>
    import './Table.scss';

    import TableHeader from './Header/Header.vue'
    import TableBody from './Body/Body.vue'
    import TableFooter from './Footer/Footer.vue'
    import loadingTable from '@AppComponents/Table/loadingTable.json'
    import AppH3 from '@AppComponents/Headers/H3/H3.vue'
    
    const props = defineProps({
        table: {
            default: {
                header: [],
                body: []               
            },
            type: Object
        },
        filtering: {
            default: false,
            type: Boolean
        },
        loading: {
            default: false,
            type: Boolean
        },
        localLoading: {
            default: false,
            type: Boolean
        }
    })

    const tableContainerRef = ref(null)

    const emit = defineEmits([
        'action'
    ])

    class Table {
        constructor() {
            this.header = []
            this.body = []
            this.actions = []
            this.pages = {
                current: 1,
                total: 1
            }
            this.sort = {
                key: 'id',
                order: 'desc'
            }
        }

        // Получение таблицы
        get() {
            this.header = props.table.header
            this.body = props.table.body.map(item => ({ ...item, checked: false }));
            this.pages = props.table.pages
            this.actions = props.table.actions
            this.updateHeaderWidth()
        }

        // Установка скелетона
        setSkeleton() {
            this.header = loadingTable.header
            this.body = loadingTable.body
        }

        // Обновление ширины колонок
        updateHeaderWidth() {
            let headerWidth = props.table.header.reduce((a, b) => Number(a) + Number(b.width ?? 100), 0)

            if (headerWidth + 130 < tableContainerRef.value.offsetWidth) {
                for (let item of props.table.header) {
                    item.width = (tableContainerRef.value.offsetWidth - 130) * (Number(item.width ?? 100) / headerWidth)
                }
            }
        }

        // Пагинация
        changePage(page) {
            this.pages.current = page
            emit('action', {
                type: 'table',
                action: 'changePage',
                value: page
            })
        }

        // Сортировка таблицы
        sortTable(item) {
            if (this.sort.key === item.key) {
                this.sort.order == 'asc' ? this.sort.order = 'desc' : this.sort.order = 'asc'
            } else {
                this.sort = {
                    key: item.key,
                    order: 'desc'
                }
            }

            emit('action', {
                type: 'table',
                action: 'sort',
                value: this.sort
            })
        }

        // Эмит действий в строке
        emitRowAction(action) {
            emit('action', action)
        }

    }

    const table = ref(new Table())

    onMounted(() => {
        table.value.get()
    })

    watch(() => props.loading, () => {
        if (props.loading) {
            table.value.setSkeleton()
        } else {
            table.value.get()
        }
    })

    watch(() => props.table.body, () => {
        table.value.get()
    }, {
        deep: true
    })

    provide('table', table)
</script>
