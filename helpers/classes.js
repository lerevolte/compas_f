import api from '@/helpers/api.js'
import 'vue3-toastify/dist/index.css';
import routes from '@/helpers/routes.js'
import { useVirtualizer } from '@tanstack/vue-virtual'
import isEqual from 'lodash/isEqual'

import { toast } from 'vue3-toastify';
import { useUserStore } from '@/stores/userStore.js'

export class Common {
    constructor() {}

    // Преобразование цены
    transformPrice(price, fixed) {
        return parseFloat(price).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    }

    // Преобразование номера
    transformPhone(phone, type = 'number') {
        if (type == 'link') {
            return phone
                .replace(/^(\+?7|8)\s*|\s+|\(|\)|-/g, (match, p1) => {
                    if (p1 === '8' || p1 === '7') return '+7';
                    if (p1 === '+7') return '+7';
                    return '';
                });
        } else {
            return phone
                .replace(/\D/g, '')
                .replace(/^(\d)/, (_, p1) => p1 === '8' || p1 === '7' ? '+7' : p1)
                .replace(/^(\+7)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 ($2) $3 $4-$5');
        }
    }

    // Валидация полей
    validate(field, type) {
        const checkText = (text) => {
            return text != null && text != undefined && text.length > 0
        }

        const checkEmail = (email) => {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return emailRegex.test(email)
        }

        const checkPhone = (phone) => {
            const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
            return phoneRegex.test(phone)
        }

        let logs = null
        let isError = false

        switch (type) {
            case 'mail':
                if (!checkEmail(field.value)) {
                    logs = {
                        item: field.key,
                        text: 'Данные введены неверно'
                    }
                    isError = true
                }
                break;

            case 'phone':
                if (!checkPhone(field.value)) {
                    logs = {
                        item: field.key,
                        text: 'Данные введены неверно'
                    }
                    isError = true
                }

                break;
            default:
                if (!checkText(field.value)) {
                    logs = {
                        item: field.key,
                        text: 'Данные введены неверно'
                    }
                    isError = true
                }
                break;
        }

        return {
            isError,
            logs
        }
    }

    // Показать уведомление
    showNotification(message, type = 'default', options = {}) {
        const formatedMessage = `
            <h4 class="Toastify__toast-title">${message.title}</h4>
            <p class="Toastify__toast-description">${message.description}</p>
        `

        toast(formatedMessage, {
            ...options,
            type: type,
            position: toast.POSITION.TOP_RIGHT,
            limit: 25,
            pauseOnHover: true,
            dangerouslyHTMLString: true,
            hideProgressBar: true,
            autoClose: 10000,
            newestOnTop: true
        });
    }


    // Чистый URL без параметров
    cleanUrl() {
        if (window.location.search) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    };

    // Установка параметров в URL
    setQueryUrl(query) {
        const cleanUrl = window.location.origin + window.location.pathname + query;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Получение параметров из URL
    getQueryUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};

        for (const [key, value] of urlParams.entries()) {
            const numberValue = Number(value);
            if (value !== '' && !isNaN(numberValue)) {
                params[key] = numberValue;
            } else {
                params[key] = value;
            }
        }

        return Object.keys(params).length === 0 ? null : params;
    }


    useDoubleClick(callback, delay = 300) {
        let lastClickTime = 0
        let lastEl = null

        return (event) => {
            const now = Date.now()
            const el = event.currentTarget

            if (el === lastEl && now - lastClickTime <= delay) {
                callback(el, event)
                lastClickTime = 0
                lastEl = null
            } else {
                lastClickTime = now
                lastEl = el
            }
        }
    }

    // Сортируем первый массив в порядке второго массива
    reorderArrayByKey(firstArray, secondArray, key) {
        const orderMap = new Map();
        secondArray.forEach((item, index) => {
            orderMap.set(item[key], index);
        });

        return [...firstArray].sort((a, b) => {
            const indexA = orderMap.get(a[key]);
            const indexB = orderMap.get(b[key]);
            return indexA - indexB;
        });
    }

    async copyText(text) {
        try {
            // Проверяем поддержку современного API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
            } else {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea')
                textArea.value = text
                textArea.style.position = 'fixed'
                textArea.style.left = '-999999px'
                textArea.style.top = '-999999px'
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()

                const successful = document.execCommand('copy')
                document.body.removeChild(textArea)

                if (!successful) {
                    throw new Error('Failed to copy text')
                }
            }

            return true
        } catch (error) {
            console.error('Failed to copy text:', error)
            return false
        }
    }
}

export class Auth {
    constructor() {
        this.common = new Common()
        this.errorLogs = []
        this.loading = false
        this.form = {
            email: null,
            password: null,
            remember_me: false
        }
        this.userStore = useUserStore()
    }

    // Авторизация
    async logIn() {
        try {
            this.loading = true
            let isError = false
            this.errorLogs = []

            for (let key in this.form) {
                if (key == 'remember_me' || key == 'email') continue

                let response = this.common.validate({
                    key: key,
                    value: this.form[key]
                }, key)
                if (response.isError) {
                    this.errorLogs.push(response.logs)
                    isError = true
                }
            }

            if (isError) return

            let response = await api.callMethod('POST', routes.auth.login, this.form)

            if (response.status == 400) {
                this.errorLogs = [{
                        item: 'email',
                        text: 'Данные введены неверно'
                    },
                    {
                        item: 'password',
                        text: 'Данные введены неверно'
                    }
                ]
            } else {
                this.userStore.token = response.data.token
                navigateTo('/admin')
            }
            this.form = {
                email: null,
                password: null,
                remember_me: false
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.loading = false
        }
    }

    // Выход из системы
    async logOut() {
        this.userStore.token = null
        navigateTo('/auth')
    }
}

export class Table {
    constructor(tableRef, slug, emit) {
        this.common = new Common()
        this.filter = new Filter(this)
        this.slug = slug
        this.emit = emit

        this.isChanged = false
        this.tableRef = tableRef
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
            const response = await api.callMethod('GET', routes.table.get.replace('${slug}', this.slug))
            const hiddenFilter = response.data.filters.find(f => f.is_hidden)
            this.set(response.data, true)
            this.filter.set(hiddenFilter)
            this.getHeader(response.data.table)
            await this.initVirtualizer()
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    // Получение данных для таблицы с параметрами
    async getWithQuery(query) {
        try {
            this.loading = true
            let response = await this.filter.get([], query)
            const hiddenFilter = response.filters.find(f => f.is_hidden)
            this.filter.set(hiddenFilter)
            this.getHeader(response.table)
            await this.initVirtualizer()
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    // Инициализация виртуализации
    async initVirtualizer() {
        if (this._virtScope) {
            try {
                this._virtScope.stop()
            } catch (e) {}
            this._virtScope = null
        }
        await nextTick()

        // Проверяем что tableRef доступен
        if (!this.tableRef) {
            console.warn('TableRef not available for virtualizer initialization')
            return
        }
        
        const scope = effectScope()
        this._virtScope = scope
        scope.run(() => {
            this.rowVirtualizer = useVirtualizer({
                count: this.body.length,
                estimateSize: () => 50,
                getScrollElement: () => this.tableRef,
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
        if (this.rowVirtualizer) {
            this.rowVirtualizer.scrollToIndex(0)
            this.rowVirtualizer.measure()
        }
        this.clear()
    }

    // Получнеие шапки
    getHeader(data) {
        this.header = data
    }

    // Получение контента
    getBody(data) {
        this.body = data
    }

    // Сортировка
    async setSortItem(item) {
        this.sortItem = item
    }

    // Вернуть настройки по умолчанию
    async reset() {
        try {
            this.loading = true
            this.isChanged = true
            const response = await api.callMethod('GET', routes.table.reset.replace('${slug}', this.slug))

            if (response.data.fields) {
                this.setSortItem({
                    sort_field: response.data.sort_field,
                    sort_order: response.data.sort_order
                })
                this.getHeader(response.data.fields)
            }
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
                                row[key].localOptions = row[key].localOptions.filter(p => p != null && p.value != null)
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
            await api.callMethod('POST', routes.table.save.replace('${slug}', this.slug), {
                rows: request
            })
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.clear()
            this.saving = false
        }
    }

    // Создание
    create() {
        this.emit('openModal', {
            type: 'create'
        })
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
            let request = this.header.filter(p => p.key != 'isChoose' && p.key != 'actions' && p.enabled).map(p => {
                return `fields[]=${p.key}`
            })
            response = await api.callMethod('GET', routes.table.download.replace('${slug}', this.slug) + `?${request.join('&')}`)
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
        this.emit('openModal', {
            type: 'open',
            item: row
        })
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
        this.emit('openModal', {
            type: 'copy',
            item: row
        })
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
            await api.callMethod('DELETE', routes.table.delete.replace('${slug}', this.slug), {
                ids: request
            })
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
            await this.filter.get()
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
            await this.filter.get()
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
            await this.filter.get()
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    // Сохранение настроек
    async saveSettings(role) {
        let method = routes.table.save_settings.replace('${slug}', this.slug)

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
            await this.filter.get()
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }
}

export class Filter {
    constructor(table) {
        this.setter = table
        this.filtering = false
        this.fields = []
        this.query = null
    }

    // Фильтрация
    async get(fields = [], saved_query = {}) {
        // Установка фильтра
        const setFilter = (fields, saved_query) => {
            let response = []

            response.push(`per_page=${saved_query.per_page ?? this.setter.pages.limit}`)
            response.push(`page=${saved_query.page ?? this.setter.pages.current}`)
            response.push(`sort_field=${saved_query.sort_field ?? this.setter.sortItem.sort_field}`)
            response.push(`sort_order=${saved_query.sort_order ?? this.setter.sortItem.sort_order}`)

            fields.forEach(field => {
                if (field.key == 'search') {
                    response.push(`q=${field.value}`)
                } else if (typeof field.value == 'boolean') {
                    response.push(`filter[${field.key}]=${field.value ? 1 : 0}`)
                } else if (field.value != null && field.value != '') {
                    response.push(`filter[${field.key}]=${field.value}`)
                }
            });

            return response.join('&')
        }
        
        try {
            this.filtering = true
            this.query = setFilter(fields, saved_query)
            let response = await api.callMethod("GET", routes.table.get.replace('${slug}', this.setter.slug) + `${this.query ? '?' + this.query : ''}`)
            this.setter.set(response.data)
            console.log(response.data);
            this.setter.common.setQueryUrl(this.query ? '?' + this.query : '')
            return response.data
        } catch (error) {
            console.log(error);
        } finally {
            this.filtering = false
        }
    }

    set(filter) {
        this.fields = filter.fields ?? []
    }
}