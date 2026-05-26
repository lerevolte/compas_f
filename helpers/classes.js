import api from '@/helpers/api.js'
import 'vue3-toastify/dist/index.css';
import routes from '@/helpers/routes.js'
import { useVirtualizer } from '@tanstack/vue-virtual'
import isEqual from 'lodash/isEqual'

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { format, startOfMonth, endOfMonth } from 'date-fns'
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

    // Преобразование имени
    transformName(name, length) {
        const dotIndex = name.lastIndexOf('.');
        if (dotIndex === -1) return name;
        
        const response = name.slice(0, dotIndex);
        const ext = name.slice(dotIndex);
        
        return response.length <= length + 3 
          ? name 
          : `${response.slice(0, length)}...${response.slice(-3)}${ext}`;
      };

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


    useDoubleClick(callback, alternativeCallBack = null, delay = 300) {
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
                if (alternativeCallBack) {
                    alternativeCallBack(el, event)
                }
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

    // Копирование текста
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

    // Трансформация дат
    transformDate = (field, formatType = 'dd.MM.yyyy') => {
        if (Array.isArray(field)) {
            return `${format(field[0], formatType)} - ${format(field[1], formatType)}`
        } else {
            return format(field, formatType)
        }
    }

    // Нахождение секции в колонках
    findColumnSection(columns, id) {
        for (let column in columns) {
            for (let section of columns[column]) {
                if (section.id == id) {
                    return section
                } else {
                    for (let field of section.fields) {
                        if (field.id == id) {
                            return field
                        }
                    }
                }
            }
        }
        return null
    }

    // Нахождение секции в колонках
    findColumnSectionByField(columns, id) {
        let group_field = null
        for (let column in columns) {
            for (let section of columns[column]) {
                for (let section_field of section.fields) {
                    if (section_field.type == 'text_group') {
                        group_field = section_field.fields.find(p => p.id == id)
                        if (group_field) return section_field
                    }
                }
            }
        }
        return null
    }

    // Нахождение поля в колонках
    findColumnField(columns, key) {
        for (let column in columns) {
            for (let section of columns[column]) {
                for (let field of section.fields) {
                    if (field.key == key) {
                        return field
                    }
                }
            }
        }
        return null
    }

    // Копирование ссылки
    copyLink(link) {
        this.copyText(link)
    }

    // Копирование внешней ссылки
    async copyExternalLink({slug, id}) {
        // Safari: после await user gesture теряется, и navigator.clipboard.writeText бросает
        // NotAllowedError. Передаём ClipboardItem с Promise<Blob> — Safari принимает такую
        // отложенную запись в рамках исходного клика.
        const buildBlob = async () => {
            const response = await api.callMethod('POST', routes.external_link.create, {
                model_slug: slug,
                model_id: id
            })
            const url = `${window.location.origin}/external/${response.data.token}`
            return new Blob([url], { type: 'text/plain' })
        }

        if (typeof window !== 'undefined' && navigator.clipboard && window.isSecureContext && typeof window.ClipboardItem !== 'undefined') {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'text/plain': buildBlob() })])
                return
            } catch (e) {
                console.warn('[copyExternalLink] clipboard.write failed, fallback', e)
            }
        }

        const response = await api.callMethod('POST', routes.external_link.create, {
            model_slug: slug,
            model_id: id
        })
        this.copyLink(`${window.location.origin}/external/${response.data.token}`)
    }

    // Обновление названия файла
    async updateFileName({slug, id, field}) {
        await api.callMethod('POST', routes.detail.edit_fields.replaceAll('${slug}', slug), {
            rows: [
                {
                    id: id,
                    [field.key]: field.value
                }
            ]
        })
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
    constructor({tableRef, slug, pageId, options, path, emit}) {
        this.common = new Common()
        this.filter = new Filter(this)
        this.slug = slug
        this.path = path
        this.emit = emit
        this.isDragging = false
        this.pageId = pageId,
        this.options = options
        this.socket = null

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
        this.dependences = {
            state: false,
            query: null
        }
    }

    // Получение данных для таблицы
    async get() {
        try {
            this.loading = true
            let response = null

            if (this.slug) {
                response = await api.callMethod('GET', routes.table.get.replace('${slug}', this.slug))
            } else {
                response = await api.callMethod('GET', routes.table.get_path.replace('${path}', this.path))
            }

            this.set(response.data, true)

            if (this.options.isHaveFilter) {
                this.filter.setSaves(response.data.filters)
                this.filter.set(response.data.fields)
            }
            
            this.getHeader(response.data.table)
            await this.initVirtualizer()
            this.emit('getData', response.data.list.data)
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    async getLocalTable(response) {
        try {
            if (response.list.data.length > 0) {
                response.list.data = response.list.data.map((item, index) => {
                    return {
                        ...item,
                        local_id: index
                    }
                })
            }
            this.loading = true
            this.set(response, true)
            this.getHeader(response.table)
            await this.initVirtualizer()
            this.emit('getData', response.list.data)
        } catch (error) {
            console.log(error);
        } finally {
            this.loading = false
        }
    }

    // Получение данных для таблицы с параметрами
    async getWithQuery(query) {
        try {
            this.loading = true
            let response = await this.filter.get([], query)
            this.filter.setSaves(response.filters)
            this.filter.set(response.fields)
            this.getHeader(response.table)
            await this.initVirtualizer()
            this.emit('getData', response.list.data)
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
                overscan: this.options?.overscan ?? 8,
            })
        })
    }

    // Установка таблицы
    async set(response) {
        this.getBody(response.list.data ?? response.list)
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
        if (this.options?.disabledKeys && this.options?.disabledKeys.length > 0) {
            data = data.map(p => this.options?.disabledKeys.find(k => k == p.key) ? { ...p, read_only: true } : p)
        }

        if (this.options.isCheckClicked) {
            this.header = [{
                "id": 0,
                "title": "Выбранная строка",
                "key": "clicked",
                "width": "44px",
                "enabled": true,
                "hover": false,
                "sort_order": null,
                "type": "checkbox",
                "fixed": true,
                "fixTarget": "0px",
                "index": 1,
                "mask": null,
                "left": 0,
                "value": false
            }, ...data]
        } else {
            this.header = data
        }
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
            const route = this.slug == 'products' ? routes.table.reset_products : routes.table.reset.replace('${slug}', this.slug)
            const response = await api.callMethod('GET', route)

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

            if (this.slug == 'products') {
                this.body = this.body.filter(row => row.id)
                request = JSON.parse(JSON.stringify(this.body))
                request = request.map(row => {
                    return ({
                        id: row['id'],
                        name: row['name'],
                        product_id: row['product_id'],
                        product_name: row['product_name'],
                        product_price: row['product_price'],
                        product_count: row['product_count'],
                        product_weight: row['product_weight'],
                        product_sum: row['product_sum']
                    })
                })
                
                nextTick(() => {
                    this.initVirtualizer()
                })
            } else {
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
            }
            

            if (request.length == 0) return

            if (this.slug) {
                if (this.slug == 'products') {
                    await api.callMethod('PUT', routes.table.set_products.replace('${page_id}', this.pageId), {
                        products: request
                    })
                } else {
                    await api.callMethod('POST', routes.table.save.replace('${slug}', this.slug), {
                        rows: request
                    })
                }
            } else {
                await api.callMethod('PUT', routes.table.save_path.replace('${path}', this.path), {
                    rows: request
                })
            }
            this.emit('saveTable', request)
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.clear()
            this.saving = false
        }
    }

    // Создание
    create(slug) {
        this.emit('openModal', {
            type: 'create',
            slug: slug ?? this.slug,
            id: 0
        })
    }

    // Отмена редактирования
    cancel() {
        if (this.slug == 'products') {
            this.body = this.backup.body
            nextTick(() => {
                this.initVirtualizer()
            })
        } else {
            let backupRow = null
            for (let i = 0; i < this.body.length; i++) {
                backupRow = this.backup.body.find(item => item.id == this.body[i].id)
                if (backupRow) {
                    this.body[i] = backupRow
                }
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
        if (isChooseAll) {
            isChooseAll.value = false
        }
        this.state = null
        this.backup.body = []
    }

    // Инициализация скачивания Excel
    async initDownloadExcel() {
        let response = null
        try {
            this.downloadExcelBuffer.state = true
            this.downloadExcelBuffer.loading = true
            let request = [
                `sort_field=${this.sortItem.sort_field}`,
                `sort_order=${this.sortItem.sort_order}`,
                ...this.header.filter(p => p.key != 'isChoose' && p.key != 'actions' && p.enabled).map(p => {
                    return `fields[]=${p.key}`
                })
            ]

            if (this.dependences.state) {
                const otherKeys = Object.keys(this.dependences.query)
                for (let key of otherKeys) {
                    if (key == 'trashed') {
                        request.push(`${key}=${this.dependences.query[key] ? 1 : 0}`)
                    } else if (Array.isArray(this.dependences.query[key])) {
                        for (let value of this.dependences.query[key]) {
                            request.push(`filter[${key}][]=${value}`)
                        }
                    } else {
                        request.push(`filter[${key}]=${this.dependences.query[key]}`)
                    }
                }
            }

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
    open(row, slug = null) {
        this.emit('openModal', {
            ...row, 
            slug: slug ?? row.related_table,
            type: 'open'
        })
    }

    // Инициализация редактирования
    initEdit() {
        this.edit(this.body.filter(item => item.isChoose))
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

    copy(row) {
        this.emit('openModal', {
            ...row,
            slug: this.slug,
            type: 'copy',
        })
    }

    copyLink(row) {
        this.common.copyLink(`${window.location.hostname}/${this.slug}/${row.id}`)
    }

    copyExternalLink(row) {
        this.common.copyExternalLink({slug: this.slug, id: row.id})
    }

    // Инициализация удаления
    initDelete(rows = []) {
        rows = typeof rows == 'boolean' || rows.length == 0 ? this.body.filter(item => item.isChoose) : rows 

        this.deleteBuffer = {
            list: Array.isArray(rows) ? rows : [rows],
            state: true,
            type: 'delete'
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

    // Локальное удаление строк
    localDelete(deletedRow) {
        this.backupLocalBody()
        this.state = 'edit'
        this.body = this.body.filter(row => deletedRow.local_id != row.local_id)
        this.body = this.body.map((row) => {
            return {
                ...row,
                edit: true,
                isChoose: true
            }
        })

        nextTick(() => {
            this.initVirtualizer()
        })
    }

    // Бэкап локальных строк
    backupLocalBody(localBody = null) {{
        if (this.backup.body.length == 0) {
            this.backup.body = JSON.parse(JSON.stringify(localBody ?? this.body))
        } else {
            if (localBody) {
                this.backup.body = JSON.parse(JSON.stringify(localBody.map(row => {
                    let backupRow = this.backup.body.find(item => item.id == row.id)
                    if (backupRow) {
                        return backupRow
                    } else {
                        return row
                    }
                })))
            } else {
                this.backup.body = JSON.parse(JSON.stringify(this.body.map(row => {
                    let backupRow = this.backup.body.find(item => item.id == row.id)
                    if (backupRow) {
                        return backupRow
                    } else {
                        return row
                    }
                })))
            }
        }
    }}

    // Инициализация удаления
    initRestore(rows = []) {
        rows = typeof rows == 'boolean' || rows.length == 0 ? this.body.filter(item => item.isChoose) : rows 

        this.deleteBuffer = {
            list: Array.isArray(rows) ? rows : [rows],
            state: true,
            type: 'restore'
        }
    }

    // Удалить строку 
    async restore() {
        try {
            this.deleteBuffer.loading = true
            let request = this.deleteBuffer.list.map(p => p.id)
            this.body = this.body.filter(row => this.deleteBuffer.list.findIndex(item => item.id == row.id) == -1)
            
            await api.callMethod('POST', routes.table.restore.replace('${slug}', this.slug), {
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

    dragStart(event) {
        this.isDragging = true
        document.body.classList.add('body_unselected')
        if (this.slug == 'products' && !this.state) {
            this.backupLocalBody(event.from.__draggable_component__.modelValue.map(row => {
                return {
                    ...row.original
                }
            }))
        }
    }

    // Обновление таблицы при перетаскивании строки
    changeDrag(event) {
        if (event.added) {
            this.emit('getData', this.body)
            this.emit('addRow', {
                list: this.body,
                row: event.added.element.original
            })
        } else if(event.removed) {
            this.emit('removeRow', {
                list: this.body,
                row: event.removed.element.original
            })
        } else {
            this.emit('changePositionRow', {
                list: this.body,
                row: event.moved.element.original
            })
        }
    }

    // Конец перетаскивания
    async dragEnd(event) {
        document.body.classList.remove('body_unselected')
        this.isDragging = false
        if (this.slug == 'products') {
            this.state = 'edit'
            this.body = this.body.map(row => {
                return {
                    ...row,
                    edit: true,
                    isChoose: true
                }
            })
        }

        // Обновляем виртуализатор после завершения перетаскивания
        await nextTick()
        this.initVirtualizer()

        this.emit('getData', this.body)
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
        let method = this.slug == 'products' ? routes.table.update_products : routes.table.save_settings.replace('${slug}', this.slug)

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

    // Добавление локальной строки
    addLocalRow() {
        if (!this.state) {
            this.backupLocalBody()
        }
        
        this.state = 'edit'
        this.body = this.body.map(row => {
            return {
                ...row,
                edit: true,
                isChoose: true
            }
        })
        const newObj = this.header.reduce((acc, item) => {
            acc[item.key] = item.type == 'number' ? 0 : null
            return acc;
        }, {});
        newObj.local_id = this.body.length + 1
        this.body.push(newObj)
        nextTick(() => {
            this.initVirtualizer()
        })
    }

    // Инициализаия создания маршрута
    initCreateRoute() {
        this.emit('initCreateRoute', true)
    }

    getSocketRows() {
        let findedRow = null
        console.log('🟢 getSocketRows called, socket.table:', JSON.stringify(this.socket.table.map(s => ({ state: s.state, id: s.row?.id }))));

        for (let socketRow of this.socket.table) {
            console.log('🟢 socketRow:', socketRow.state, 'row:', socketRow.row);
            if (socketRow.state == 'delete') {
                this.body = this.body.filter(item => item.id != socketRow.row.id)
            } else if (socketRow.state == 'update') {
                findedRow = this.body.find(item => item.id == socketRow.row.id)
                if (findedRow) {
                    Object.assign(findedRow, socketRow.row)
                    findedRow.socketChange = true

                    setTimeout(() => {
                        delete findedRow.socketChange
                    }, 1500);
                } else {
                    this.body.unshift(socketRow.row)
                }
            } else if (socketRow.state == 'create') {
                this.body.unshift(socketRow.row)
            }
        }

        this.socket.table = []
        this.initVirtualizer()
    }
}

export class Filter {
    constructor(table) {
        this.setter = table
        this.filtering = false
        this.fields = []
        this.saves = []
        this.query = null
    }

    // Фильтрация
    async get(fields = [], saved_query = {}) {
        // Установка фильтра
        const setFilter = (fields, saved_query) => {
            let response = []

            if (saved_query) {
                response.push(`per_page=${saved_query.per_page ?? this.setter.pages.limit}`)
                response.push(`page=${saved_query.page ?? this.setter.pages.current}`)
                response.push(`sort_field=${saved_query.sort_field ?? this.setter.sortItem.sort_field}`)
                response.push(`sort_order=${saved_query.sort_order ?? this.setter.sortItem.sort_order}`)
            }

            if (this.setter.dependences.state) {
                const otherKeys = Object.keys(this.setter.dependences.query)
                for (let key of otherKeys) {
                    if (['trashed'].includes(key)) {
                        response.push(`${key}=${this.setter.dependences.query[key] ? 1 : 0}`)
                    } else if (key == 'trash_tab') {
                        continue
                    } else if (key == 'search') {
                        response.push(`q=${this.setter.dependences.query[key]}`)
                    } else if (Array.isArray(this.setter.dependences.query[key])) {
                        for (let value of this.setter.dependences.query[key]) {
                            response.push(`filter[${key}][]=${value}`)
                        }
                    } else if (key == 'per_page') {
                        response.push(`per_page=${this.setter.dependences.query[key]}`)
                    } else if (key == 'is_slug') {
                        response.push(`is_slug=${this.setter.dependences.query[key]}`)
                    } else if (this.setter.dependences.query[key]) {
                        response.push(`filter[${key}]=${this.setter.dependences.query[key]}`)
                    }
                }
            }

            fields.forEach(field => {
                if (field.key == 'search') {
                    response.push(`q=${field.value}`)
                } else if (typeof field.value == 'boolean') {
                    response.push(`filter[${field.key}]=${field.value ? 1 : 0}`)
                } else if (field.value == 0 || (field.value != null && field.value != '')) {
                    response.push(`filter[${field.key}]=${field.value}`)
                }
            });

            return response.join('&')
        }
        
        try {
            this.filtering = true
            this.setter.loading = true
            this.query = setFilter(fields, saved_query)
            
            let response = await api.callMethod("GET", routes.table.get.replace('${slug}', this.setter.slug) + `${this.query ? '?' + this.query : ''}`)
            this.setter.set(response.data)
            
            if (!this.setter.dependences.state) {
                this.setter.common.setQueryUrl(this.query ? '?' + this.query : '')
            } else if (this.setter.dependences.query.trashed) {
                this.query = this.query.split('&').filter(p => !p.includes('trashed'))
                if (this.setter.dependences.query.trash_tab) {
                    this.query.push(`trash_tab=${this.setter.dependences.query.trash_tab}`)
                }
                this.query = this.query.join('&')
                this.setter.common.setQueryUrl(this.query ? '?' + this.query : '')
            }
            return response.data
        } catch (error) {
            console.log(error);
        } finally {
            this.setter.loading = false
            this.filtering = false
        }
    }

    // Установка полей для активного фильтра
    set(fields) {
        let response = []
        for (let key in fields) {
            response.push({
                id: fields[key].id,
                title: fields[key].title,
                type: fields[key].type,
                key: key,
                value: null,
                options: fields[key].options,
                enabled: false
            })
        }

        this.fields = response.filter(field => !['isChoose', 'actions', 'file'].includes(field.type)).map((p, index) => {
            return {
                ...p,
                sort: p.sort ?? index,
                type: p.type == 'address' ? 'text' : p.type
            }
        })
    }

    // Установка сохраненных фильтров
    setSaves(saves) {
        this.saves = saves
    }

    // Удаление сохраненного фильтра
    async deleteSavedFilter(id) {
        this.saves = this.saves.filter(f => f.id != id)
        await api.callMethod('DELETE', routes.filter.delete.replace('${slug}', this.setter.slug) + `/${id}`)
    }

    // Перемещение сохраненного фильтра
    async moveSavedFilters(list) {
        await api.callMethod('POST', routes.filter.move.replace('${slug}', this.setter.slug), {
            items: list
        })
    }

    // Обновление сохраненного фильтра
    async updateSavedFilter(filter) {
        await api.callMethod('PUT', routes.filter.edit.replace('${slug}', this.setter.slug) + `/${filter.id}`, {
            fields: filter.fields,
            title: filter.title
        })

        this.saves[this.saves.findIndex(p => p.id == filter.id)] = filter
    }

    // Создание сохраненного фильтра
    async createSavedFilter(filter) {
        const response = await api.callMethod('POST', routes.filter.create.replace('${slug}', this.setter.slug), {
            fields: filter.fields,
            title: filter.title
        })
        this.saves.push({
            id: response.data.id,
            title: filter.title,
            is_hidden: false,
            fields: filter.fields
        })
    }
}

export class Validator {
    constructor () {
        this.state = false
        this.fields = []
        this.errors = {}
        this.common = new Common()
    }

    // Установка значения для поля
    setFieldValue(field, slug = 'value') {
        if (!field.value) return null 

        if (field.type == 'address') {
            return field.value
        } else if (Array.isArray(field.value)) {
            return field.value
        } else if (field.type == 'relation') {
            return field ?? null
        } else {
            return typeof field.value === 'object' && field.value !== null ? field.value[slug] : field.value
        }
    }

    // Получение значений для выпадающих списков
    getSelectValue(field) {
        // Проверяем что строка существует
        if (!field.value) return null
        
        let response = null
        if (Array.isArray(field.value)) response = field.options.filter(option => field.value.includes(option.value)).map(option => option.label)
        else if (typeof field.value == 'object' && field.value !== null) response = field.options.filter(option => option.value == field.value).map(option => option.label)
        else response = field.options.filter(option => option.value == field.value).map(option => option.label)
    
        if (field.type == 'select_dropdown') {
            return response.join(', ')
        } 
        return response
    }

    // Валидация
    validate(field) {
        const value = this.setFieldValue(field)
        if (field.type == 'select_dropdown' && field.subtype != 'map_suggest') {
            return !(this.getSelectValue(field) != null && this.getSelectValue(field).length > 0)
        } else if (field.type == 'address') {
            return value == '' || !value
        } else {
            if (typeof value == 'string') {
                return value == ''
            } else if (value == null) {
                return true
            } else if (Array.isArray(value)) {
                return !(value.filter(v => v != null && v != '').length > 0)
            } else if (typeof value == 'object') {
                if (value.value) {
                    return !(value.value.value ? value.value.value.filter(p => p).length > 0 : value.value.filter(p => p).length > 0)
                }
                return !(value.value && value.value.value != null && value.value.value.length > 0)
            }
            return false
        }
    }

    // Проверка полей
    check(fields) {
        this.fields = fields.filter(field => field.required)
        this.state = false
        this.errors = {}

        this.fields.forEach(field => {
            if (this.validate(field)) {
                this.state = true
                this.errors = {
                    ...this.errors,
                    [field.key]: 'Поле обязательно к заполнению'
                }
            }
        });
    }
}

export class History {
    constructor() {
        this.events = {
            data: [],
            count: 1, 
            current_page: 1, 
            last_page: 1, 
            per_page: 1
        }

        this.fields = {
            data: [],
            count: 1, 
            current_page: 1, 
            last_page: 1, 
            per_page: 1
        }

        this.loading = false
    }

    // Получение истории
    get(response) {
        this.events = {...this.events, ...response.history_events}
        this.fields = {...this.events, ...response.history_fields}
    }

    // Обновление истории
    async update(page, tab, options = {}) {
        try {
            this.loading = true
            const key = tab == 'order' ? 'events' : 'fields'
            const response = await api.callMethod('GET', routes.detail.history.replace('${slug}', options.slug).replace('${id}', options.id) + `?page=${page}&filter=${key}`)
            this[key].data = [...this[key].data, ...response.data.data]
            this[key].count = response.data.count
            this[key].current_page = response.data.current_page
            this[key].last_page = response.data.last_page
            this[key].per_page = response.data.per_page
        } catch (error) {
            console.log(error);
        } finally {
            this.loading = false
        }
    }
}

export class HeaderEditable {
    constructor ({columns, emit}) {
        this.id = null
        this.slug = null
        this.editTitle = false
        this.name = ''
        this.emit = emit
        this.columns = columns ?? []
        this.common = new Common()
        this.boundCheckClick = null
        this.modal = {
            state: false,
            title: 'Создание раздела',
            actionTitle: 'Создать',
            action: 'create',
            text: null,
            content: {
                name: null,
                key: null,
            },
            loading: false
        }
    }

    // Копирование ссылки
    copyLink() {
        this.common.copyLink(window.location.href)
    }

    // Копирование внешней ссылки
    copyExternalLink({slug, id}) {
        this.common.copyExternalLink({slug: slug, id: id})
    }

    // Редактирование заголовка
    initEditTitle({textarea, columns, slug, id}) {
        this.columns = columns
        this.id = id
        this.slug = slug
        this.editTitle = true
        if (!this.boundCheckClick) {
            this.boundCheckClick = (event) => this.checkClick(event)
        }
        nextTick(() => {
            textarea.focus()
            document.addEventListener('click', this.boundCheckClick)
        })
    }

    // Установка заголовка
    async setTitle() {
        this.name = this.name.replaceAll('\n', '')
        if (this.boundCheckClick) {
            document.removeEventListener('click', this.boundCheckClick)
        }
        const findedField = this.common.findColumnField(this.columns, 'name')
        
        if (findedField) {
            typeof findedField.value == 'object' && findedField.value != null ? findedField.value.value = this.name : findedField.value = this.name
        }
        this.editTitle = false
        await api.callMethod('PUT', routes.detail.edit_fields.replace('${slug}', this.slug), {
            rows: [{
                id: this.id,
                name: findedField.value
            }]
        })
    }

    // Проверка клика вне заголовка при его редактировании
    checkClick(e) {
        const target = e.target.closest('.textarea_title') ?? e.target.closest('.icon_edit')

        if (!target) {
            this.setTitle()
        }
    }

    copy({slug, id}) {
        this.emit('openModal', {
            id: id,
            slug: slug,
            type: 'copy',
        })
    }

    // Инициализация удаления объекта
    initDelete({id, slug, is_modal}) {
        this.modal = {
            state: true,
            title: 'Удаление',
            actionTitle: 'Удалить',
            action: 'delete',
            text: 'Вы действительно хотите удалить объект?',
            content: {
                id: id,
                slug: slug,
                is_modal: is_modal
            },
            loading: false
        }
    }

    // Удаление объекта
    async delete() {
        try {
            this.modal.loading = true
            await api.callMethod('DELETE', routes.table.delete.replace('${slug}', this.modal.content.slug), {
                ids: [this.modal.content.id]
            })
            if (this.modal.content.is_modal) {
                this.emit('close', true)
            } else {
                navigateTo(`/objects/${this.modal.content.slug}`)
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.state = false
            this.modal.loading = false
        }
    }

    // Инициализация редактирования
    edit({isGlobalEdit}) {
        isGlobalEdit = true
    }

    // Инициализация удаления объекта
    initRestore({id, slug, is_modal}) {
        this.modal = {
            state: true,
            title: 'Восстановление',
            actionTitle: 'Восстановить',
            action: 'restore',
            text: 'Вы действительно хотите восстановить объект?',
            content: {
                id: id,
                slug: slug,
                is_modal: is_modal
            },
            loading: false
        }
    }

    // Удаление объекта
    async restore() {
        try {
            this.modal.loading = true
            await api.callMethod('POST', routes.table.restore.replace('${slug}', this.modal.content.slug), {
                ids: [this.modal.content.id]
            })
            if (this.modal.content.is_modal) {
                this.emit('close', true)
            } else {
                navigateTo(`/objects/${this.modal.content.slug}`)
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.state = false
            this.modal.loading = false
        }
    }
}

// Колонки
export class Columns {
    constructor() {
        this.list = {}
        this.hidden = []
    }

    // Получение колонок
    get(response) {
        this.list = response.columns
        this.hidden = response.hidden_fields
    }
}

// Секции
export class Section {
    constructor(slug) {
        this.list = []
        this.slug = slug
        this.hidden = []
        this.modal = {
            state: false,
            type: null,
            title: 'Создание раздела',
            actionTitle: 'Создать',
            action: 'create',
            text: null,
            content: {
                name: null,
                key: null,
            },
            loading: false
        }
        this.buffer = {
            loading: false,
            backup: [],
            edits: []
        }
        this.validator = new Validator()
    }

    // Инициализация создания
    initCreate(column_id) {
        this.modal = {
            state: true,
            type: 'warning',
            title: 'Создание раздела',
            actionTitle: 'Создать',
            action: 'create',
            text: null,
            content: {
                name: null,
                column_id: column_id,
            },
            loading: false
        }
    }

    // Создание секции
    async create(columns, slug) {
        try {
            this.modal.loading = true

            const response = await api.callMethod('POST', routes.detail.create_section, {
                name: this.modal.content.name, 
                column_id: this.modal.content.column_id.replace('column_', ''),
                slug: slug
            })

            const createdSection = {
                children: response.data.children,
                fields: [],
                id: response.data.id,
                is_short: false,
                name: response.data.name
            }

            columns[this.modal.content.column_id] = [...columns[this.modal.content.column_id], createdSection]
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.loading = false
            this.modal.state = false
        }
    }

    // Инициализация удаления секции
    initDelete(section, column_id) {
        this.modal = {
            state: true,
            type: 'warning',
            title: 'Удаление поля',
            actionTitle: 'Удалить',
            action: 'delete',
            text: 'Все поля раздела скроются. Удалить раздел?',
            content: {
                id: section.id,
                column_id: column_id,
                fields: section.fields
            },
            loading: false
        }
    }

    // Удаление секции
    async delete(columns) {
        try {
            this.modal.loading = true
            this.hidden = [...this.hidden, ...this.modal.content.fields]
            await this.updateHidden()
            await api.callMethod('DELETE', routes.detail.delete_section.replace('${id}', this.modal.content.id))
            columns[this.modal.content.column_id] = columns[this.modal.content.column_id].filter(item => item.id != this.modal.content.id)
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.state = false
            this.modal.loading = false
        }
    }

    // Обновление настроек секции
    async update(section, column, slug, columns) {
        try {
            await api.callMethod('PUT', routes.detail.update_section.replace('${id}', section.id), {
                ...section, 
                slug: slug
            })

            columns[column] = columns[column].map(item => item.id == section.id ? {
                ...item,
                is_short: section.is_short,
                name: section.name
            } : item)
        } catch (error) {
            console.log(error);
        }
    }

    // Установка скрытых полей
    async updateHidden() {
        await api.callMethod('POST', routes.detail.hidden_fields, {ids: this.hidden.map(p => p.id)})
    }

    // Изменение порядка секций
    async changeOrder(request) {
        await api.callMethod('POST', routes.detail.change_order_section, request)
    }

    // Редактирование полей в секции
    editAll(section) {
        for (let field of section.fields) {
            if (field.type == 'text_group') {
                this.editAll(field)
            } else {
                if (!field.edit && field.can_edit) {
                    this.buffer.backup.push(JSON.parse(JSON.stringify(field)))
                    field.edit = true
                }
            }
        }
    }

    editAllSections(columns) {
        for (let column in columns) {
            for (let section of columns[column]) {
                this.cancelEditAll(section)
            }
        }

        this.buffer.backup = []
    }

    // Отмена редактирования полей в секции
    cancelEditAll(section) {
        let findedField = null

        const clearField = (field) => {
            field.value = findedField.value
            field.edit = false
            this.buffer.backup = this.buffer.backup.filter(f => f.id != field.id)
        }

        for (let field of section.fields) {
            if (field.type == 'text_group') {
                for (let subfield of field.fields) {
                    findedField = this.buffer.backup.find(f => f.id == subfield.id)
                    if (findedField) {
                        clearField(subfield)
                    }
                }
            } else {
                findedField = this.buffer.backup.find(f => f.id == field.id)

                if (findedField) {
                    clearField(field)
                }
            }
        }
    }

    // Массовое отменение изменения значений во всех секциях
    cancel(value, columns, pageId, slug, emit, options) {
        for (let column in columns) {
            for (let section of columns[column]) {
                this.cancelEditAll(section)
            }
        }

        if (options?.isGlobalEdit) {
            emit('closeDetail', true)
        }
    }

    // Сохранение изменений
    async save(value, columns, pageId, slug, emit, options) {
        let isError = false
        let fields = []
        this.buffer.edits = []
        
        for (let column in columns) {
            for (let section of columns[column]) {
                fields = section.fields.reduce((arr, field) => {
                    if (field.type === 'text_group') {
                        field.fields.forEach(subfield => {
                            if (subfield.edit) {
                                arr.push(subfield)
                            }
                        })
                    } else {
                        if (field.edit) {
                            arr.push(field)
                        }
                    }
                
                    return arr
                }, [])
                this.validator.check(fields)
                isError = isError ? isError : Object.keys(this.validator.errors).length > 0
                this.buffer.edits = [...this.buffer.edits, ...fields]
                
                for (let field of fields) {
                    field.error = {
                        state: this.validator.errors[field.key] ?? false,
                        text: this.validator.errors[field.key] ?? null
                    }
                }
            }
        }

        if (isError) {
            this.modal = {
                state: true,
                type: 'validate',
                title: 'Ошибка валидации',
                actionTitle: 'Сохранить',
                action: 'save',
                text: null,
                content: {
                    id: 0,
                    name: null,
                    is_short: 0,
                    fields: this.buffer.edits.filter(p => p.error.state),
                    children: []
                },
                loading: false
            }
            return
        }

        try {
            this.buffer.loading = true

            if (this.modal.state && this.modal.type == 'validate') {
                this.modal.loading = true
            }

            const request = {
                id: options?.isGlobalEdit ? 0 : pageId,
                ...this.buffer.edits.reduce((obj, field) => {
                    if (field.type == 'relation') {
                        obj[field.key] = field.value?.value.filter(p => p)
                    } else {
                        obj[field.key] = field.value
                    }
                    return obj
                }, {})
            }

            if (request.name) {
                emit('action', {
                    action: 'getTitle',
                    value: typeof request.name == 'object' ? request.name.value : request.name
                })
            }

            const response = await api.callMethod('POST', routes.detail.edit_fields.replaceAll('${slug}', slug), {
                rows: [
                    request
                ]
            })
    
            for (let column in columns) {
                for (let section of columns[column]) {
                    for (let field of section.fields) {
                        if (field.type == 'text_group') {
                            for (let subfield of field.fields) {
                                if (subfield.edit) {
                                    if (subfield.type == 'relation' && subfield.value.value) {
                                        subfield.value.value = subfield.value?.value.filter(p => p)
                                    }
                                    this.buffer.backup = this.buffer.backup.filter(f => f.id != subfield.id)
                                    subfield.edit = false
                                }
                            }
                        } else if (field.edit) {
                            if (field.type == 'relation' && field.value.value) {
                                field.value.localOptions = field.value.localOptions.filter(p => p)
                                field.value.value = field.value?.value.filter(p => p)
                            }
                            this.buffer.backup = this.buffer.backup.filter(f => f.id != field.id)
                            field.edit = false
                        }
                    }
                }
            }
            emit('action', { action: 'savePage', value: response })
            this.buffer.backup = []
        } catch (error) {
            console.log(error);
        } finally {
            this.buffer.loading = false

            if (this.modal.state && this.modal.type == 'validate') {
                this.modal.loading = false
                this.modal.state = false
            }
        }
    }

    async dragGroupField(item, column_key, slug, columns) {
        for (let section of columns[column_key]) {
            for (let field of section.fields) {
                if (field.id == item.groupField.id) {
                    field.fields = item.groupField.fields
                }
            }
        }

        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', item.groupField.id), {
            id: item.groupField.id,
            subfields: item.groupField.fields.map(p => p.id)
        })
    }
}

// Поля
export class Field {
    constructor(section, emit) {
        this.modal = {
            state: false,
            title: 'Создание раздела',
            actionTitle: 'Создать',
            action: 'create',
            text: null,
            content: {
                name: null,
                key: null,
            },
            loading: false
        }
        this.emit = emit
        this.common = new Common()
        this.section = section
        this.dragger = null
    }

    // Закрытие модального окна
    close() {
        this.modal.state = false
    }

    // Инициализация редактирования
    initCreate({section}) {
        this.modal = {
            state: true,
            title: 'Создание поля',
            actionTitle: 'Создать',
            action: 'create',
            content: JSON.parse(JSON.stringify({
                section_id: section.id
            })),
            text: null,
            loading: false
        }
    }

    // Создание
    async create({field, slug, columns, emit}) {
        try {
            this.modal.loading = true
            field.entity = slug
            const findedSection = this.common.findColumnSection(columns, field.section_id)
            const response = await api.callMethod('POST', routes.detail.create_field, field)

            if (field.type == 'text_group') {
                emit('action', {
                    action: 'get',
                    data: null
                })
            } else {
                findedSection.fields.push(response.data)
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.loading = false
            this.modal.state = false
        }
    }

    // Инициализация обновления
    initUpdate({field, hidden,section}) {
        console.log(hidden);
        
        this.modal = {
            state: true,
            title: 'Настройки поля',
            actionTitle: 'Сохранить',
            action: 'updateField',
            content: JSON.parse(JSON.stringify({
                ...field,
                section_id: section.id
            })),
            text: null
        }
    }

    // Обновление
    async update({field, columns, slug, emit}) {
        try {
            this.modal.loading = true
            field.entity = slug
            let group_field = null

            if (field.type == 'text_group') {
                for (let column in columns) {
                    for (let section of columns[column]) {
                        section.fields = section.fields.filter(p => !field.fields.find(q => q.id == p.id))
                    }
                }
            } else {
                group_field = this.common.findColumnSectionByField(columns, field.id)
                if (group_field) {
                    await api.callMethod('PUT', routes.detail.update_field.replace('${id}', group_field.id), {
                        ...group_field,
                        subfields: group_field.subfields.filter(p => p != field.id)
                    })
                }
            }

            if (field.section_type != 'field') {
                const fromSection = this.common.findColumnSection(columns, field.section_id)
                const toSection = this.common.findColumnSection(columns, field.section_id)
                
                if (this.modal.content.section_id != field.section_id) {
                    fromSection.fields = fromSection.fields.filter(p => p.id != field.id)
                    toSection.fields.push(field)
                } else {
                    const index = toSection.fields.findIndex(p => p.id == field.id)
                    if (index !== -1) toSection.fields.splice(index, 1, field)
                }
            }

            const { fields, ...request } = field;
            await api.callMethod('PUT', routes.detail.update_field.replace('${id}', field.id), request)
            if (field.type == 'text_group' || group_field) {
                emit('action', {
                    action: 'get',
                    data: null
                })
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.loading = false
            this.modal.state = false
        }
    }

    // Инициализация удаления
    initDelete({field, section}) {
        this.modal = {
            state: true,
            title: 'Удаление раздела',
            actionTitle: 'Удалить',
            action: 'delete',
            content: {
                ...field,
                section_id: section.id
            },
            text: `Будет удалено поле ${field.title}. Продолжить?`,
            loading: false
        }
    }

    // Удаление поля
    async delete({columns, emit}) {
        try {
            this.modal.loading = true
            await api.callMethod('DELETE', routes.detail.delete_field.replace('${id}', this.modal.content.id))
            const findedSection = this.common.findColumnSection(columns, this.modal.content.section_id)
            const index = findedSection.fields.findIndex(p => p.id == this.modal.content.id)
            if (index !== -1) findedSection.fields.splice(index, 1)

            if (this.modal.content.type == 'text_group') {
                emit('action', {
                    action: 'get',
                    data: null
                })
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.loading = false
            this.modal.state = false
        }
    }

    // Изменение видимости поля
    async changeVisibleAlways({field}) {
        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', field.id), field)
    }

    // Показать поле
    async show({field, section, hidden}) {
        field.is_hidden = false
        section.fields.push(field)
        const index = hidden.findIndex(p => p.id == field.id)
        if (index !== -1) hidden.splice(index, 1)
        await api.callMethod('PUT', routes.detail.show_field.replace('${id}', field.id), {
            change_section: 1,
            id: field.id,
            section_id: section.id,
            is_hidden: 0
        })
    }

    // Скрыть поле
    async hide({field, section, hidden}) {
        field.is_hidden = true
        hidden.push(field)
        let index = null

        index = section.fields.findIndex(p => p.id == field.id)

        if (index != -1) {
            section.fields.splice(index, 1)
        } else {
            for (let item of section.fields) {
                if (item.type == 'text_group') {
                    index = item.fields.findIndex(p => p.id == field.id)
                    if (index != -1) {
                        item.fields.splice(index, 1)
                        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', item.id), {
                            id: item.id,
                            subfields: item.fields.map(p => p.id)
                        })
                    }
                }
            }
        }

        await api.callMethod('POST', routes.detail.hidden_fields, {ids: hidden.map(p => p.id)})
    }

    // Проверка видимости
    checkVisible(field, state) {
        if ((state && field.visible_always) || field.type == 'text_group') {
            return false
        } else {
            if (field.type == 'select_dropdown') {
                return !(this.getSelectValue(field).value != null && this.getSelectValue(field).value.length > 0)
            } else {
                const value = this.setFieldValue(field).value
                if (typeof value == 'string') {
                    return !(value != null && value != '')
                } else if (value == null) {
                    return true
                } else if (field.type == 'address') {
                    return !value.value
                } else if (Array.isArray(value)) {
                    return !(value.filter(v => v != null && v != '').length > 0)
                } else if (typeof value == 'object') {
                    if (value.value) {
                        return !(value.value.value ? value.value.value.filter(p => p).length > 0 : value.value.filter(p => p).length > 0)
                    }
                    return !(value.value && value.value.value != null && value.value.value.length > 0)
                }
                return false
            }
        }
    }

    // Установка значения для поля
    setFieldValue(field, slug = 'value') {
        const response = computed({
            get() {
                if (!field) return null 

                if (field.type == 'address') {
                    return field
                } else if (Array.isArray(field.value)) {
                    return field
                } else if (field.type == 'relation') {
                    return field ?? null
                } else if (field.type == 'status') {
                    return field.value
                } else if (field.type == 'json') {
                    if (field.value) {
                        return JSON.parse(field.value).map(product => {
                            return product ? `${product.name}, <b> ${product.count} шт.</b>` : ''
                        }).join(', ')
                    } else {
                        return null
                    }
                } else if (field.type == 'text') {
                    if (field.is_external_link) {
                        if (slug == 'value') {
                            return typeof field.value === 'object' && field.value !== null ? field.value[slug] : field.value
                        } else {
                            return field.value ? field.value[slug] : null
                        }
                    } else {
                        if ((typeof field.value === 'object' && field.value !== null)) {
                            return field.value[slug]
                        } else {
                            return field.value
                        }
                    }
                } else if (field.value !== null && typeof field.value === 'object') {
                    return field.value[slug]
                } else {
                    return field.value
                }
            },
            set(val) {
                if (field.type == 'address') {
                    field = val
                }  else if (field.type == 'relation') {
                    field = val
                }  else if (field.type == 'status') {
                    field.value = val
                } else if (field.type == 'text') {
                    if (field.is_external_link) {
                        if (slug == 'value') {
                            if (typeof field.value === 'object' && field.value !== null) {
                                field.value[slug] = val
                            } else {
                                field.value = val
                            }
                        } else {
                            if (!field.value || !field.value[slug]) {
                                const prevVal = field.value
                                if (typeof prevVal === 'object' && prevVal !== null) {
                                    field.value[slug] = val
                                } else {
                                    field.value = {
                                        value: prevVal,
                                        [slug]: val
                                    }
                                }
                            } else {
                                field.value[slug] = val
                            }
                        }
                    } else {
                        if (typeof field.value === 'object' && field.value !== null) {
                            field.value[slug] = val
                        } else {
                            field.value = val
                        }
                    }
                } else if (field.value !== null && typeof field.value === 'object') {
                    field.value[slug] = val
                } else {
                    field.value = val
                }
            }
        })
        return response
    }
    
    // Получение значений для выпадающих списков (с кэшем)
    getSelectValue(field) {
        const response = computed({
            get() {
                // Проверяем что строка существует
                if (!field.value) return null
                
                let response = null
                if (Array.isArray(field.value)) response = field.options.filter(option => field.value.includes(option.value)).map(option => option.label)
                else if (typeof field.value == 'object' && field.value !== null) response = field.options.filter(option => option.value == field.value).map(option => option.label)
                else response = field.options.filter(option => option.value == field.value).map(option => option.label)
            
                if (field.type == 'select_dropdown') {
                    return response.join(', ')
                } 
                return response
            }
        })
        return response
    }
    
    // Инициализация изменения поля
    initChangeField(field, target, type = 'target') {
        if (!field.can_edit || field.type == 'text_group') return 

        if (type == 'target') {
            if (target.closest('.icon_drag') || target.closest('.field__settings') || target.closest('.blank__title')) return
    
            if (['text', 'number', 'date', 'select_dropdown'].includes(field.type)) {
                if (field.edit || 
                    target.classList.contains('blank__link') || 
                    (
                        target.classList.contains('blank__text') && 
                        !target.classList.contains('blank__text_empty')
                    )
                ) return
            } else if (field.type == 'relation') {
                if (field.edit || (target.classList.contains('value__text_link') || target.classList.contains('select__value-img'))) return
            } else if (field.type == 'status') {
                if (field.edit) return
            } else if (field.type == 'file') {
                if (field.edit || (!target.classList.contains('file') && !target.classList.contains('file__values'))) return
            } else if (field.type == 'address') {
                if (
                    field.edit ||
                    (target.classList.contains('blank__text') && !target.classList.contains('blank__text_empty')) ||
                    target.classList.contains('button_copy') ||
                    target.classList.contains('map__frame-map')
                ) return
            }
        }

        this.section.buffer.backup.push(JSON.parse(JSON.stringify(field)))
        field.edit = true
    }

    // Начало перетаскивания поля
    dragStart(event) {
        this.dragger = event.target.closest('.column-fields')

        if (this.dragger) {
            this.dragger.classList.add('column-fields_dragging-field')
        }
    }

    // Конец перетаскивания поля
    async dragEnd(event, options = {type: 'section'}) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }

        if (options && options.type == 'field') return

        await api.callMethod('POST', routes.detail.change_order_field, {
            id: event.item._underlying_vm_.id,
            section_id: event.to.__draggable_component__.itemKey,
            fields: event.to.__draggable_component__.modelValue.map((field, index) => {
                return {
                    id: field.id,
                    sort: index
                }
            })
        })
    }

    dragChange(event, options = {type: 'section'}, groupField) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }
        
        if (options && options.type == 'field') {
            this.emit('actionSection', {action: 'dragGroupField', value: {groupField, event}})
        }
    }
}

export class Settings {
    constructor({category, title}) {
        this.category = category
        this.loading = false
        this.section = {
            name: title,
            fields: []
        }
        this.options = {
            isDisableFooter: true,
            isGlobalEdit: false,
        }
        this.buffer = {
            loading: false,
            backup: [],
            edits: []
        }
        this.validator = new Validator()
    }

    // Получение данных
    async get() {
        try {
            this.loading = true
            if (this.category == 'common') {
                this.section.fields = [
                    {
                        id: 0,
                        title: "Название портала",
                        key: "name",
                        type: "text",
                        is_plural: 0,
                        is_external_link: 0,
                        required: 1,
                        read_only: 1,
                        value: null,
                        visible_always: 1,
                        can_read: 1,
                        can_edit: 0,
                    },
                    {
                        id: 1,
                        title: "Часовой пояс",
                        key: "timezone",
                        type: "select_dropdown",
                        is_plural: 0,
                        required: 1,
                        value: null,
                        filterable: true,
                        searchable: false,
                        visible_always: 1,
                        can_read: 1,
                        can_edit: 1,
                        options: []
                    },
                    {
                        id: 2,
                        title: "Город",
                        key: "city",
                        type: "select_dropdown",
                        subtype: 'map_suggest',
                        is_plural: 0,
                        required: 1,
                        value: null,
                        searchable: true,
                        visible_always: 1,
                        can_read: 1,
                        can_edit: 1,
                        options: []
                    }
                ]
        
                const response = await api.callMethod('GET', routes.settings.common.get)
                for (let field of this.section.fields) {
                    field.value = field.key == 'hints' ? String(response.data.common[field.key]) : response.data.common[field.key]
                }
        
                this.section.fields[this.section.fields.findIndex(f => f.key == 'timezone')].options = response.data.timezones
                this.section.fields[this.section.fields.findIndex(f => f.key == 'city')].options = [
                    {
                        label: JSON.parse(JSON.stringify(response.data.common.city)),
                        value: JSON.parse(JSON.stringify(response.data.common.city))
                    }
                ]
            } else if (this.category == 'documents') {
                const response = await api.callMethod('GET', routes.settings.common.get)
                this.section.fields = [
                    {
                        id: 0,
                        title: "E-mail для получения документов",
                        key: "docs_email",
                        type: "text",
                        is_plural: 0,
                        is_external_link: 0,
                        required: 1,
                        read_only: 0,
                        value: response.data.common.docs_email,
                        visible_always: 1,
                        can_read: 1,
                        can_edit: 1,
                    }
                ]
            } else {
                const response = await api.callMethod('GET', routes.settings.modules[this.category].get)
                // У части тенантов в БД лежит старый конфиг с can_edit=0/read_only=1.
                // Бэкенд тоже это нормализует, но для случая до деплоя страхуемся на фронте.
                this.section.fields = (response.data || []).map(field => ({
                    ...field,
                    can_edit: 1,
                    read_only: 0,
                }))
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.loading = false
        }
    }

    // Сохранение изменений
    async save() {
        let isError = false
        let fields = []
        this.buffer.edits = []
        

        fields = this.section.fields.reduce((arr, field) => {
            if (field.type === 'text_group') {
                field.fields.forEach(subfield => {
                    if (subfield.edit) {
                        arr.push(subfield)
                    }
                })
            } else {
                if (field.edit) {
                    arr.push(field)
                }
            }
        
            return arr
        }, [])

        this.validator.check(fields)
        isError = isError ? isError : Object.keys(this.validator.errors).length > 0
        this.buffer.edits = [...this.buffer.edits, ...fields]
        
        for (let field of fields) {
            field.error = {
                state: this.validator.errors[field.key] ?? false,
                text: this.validator.errors[field.key] ?? null
            }
        }

        if (isError) return

        try {
            this.buffer.loading = true
            const request = this.buffer.edits.reduce((obj, field) => {
                obj[field.key] = field.type == 'relation' ? field.value?.value : field.type == 'text' ? field.value.value ?? field.value : field.value
                return obj
            }, {})

            if (this.category == 'common') {
                await api.callMethod('PUT', routes.settings.common.save, request)
            } else if (this.category == 'documents') {
                await api.callMethod('PUT', routes.settings.documents.save, request)
            } else {
                await api.callMethod('PUT', routes.settings.modules[this.category].save, request)
            }

            for (let field of this.section.fields) {
                if (field.type == 'text_group') {
                    for (let subfield of field.fields) {
                        if (subfield.edit) {
                            subfield.edit = false
                            this.buffer.backup = this.buffer.backup.filter(f => f.id != subfield.id)
                        }
                    }
                } else if (field.edit) {
                    field.edit = false
                    
                    if (field.subtype == 'map_suggest') {
                        field.options = [
                            {
                                label: field.value,
                                value: field.value
                            }
                        ]
                    }
                    this.buffer.backup = this.buffer.backup.filter(f => f.id != field.id)
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.buffer.loading = false
        }
    }

    // Отмена
    cancel() {
        let findedField = null

        const clearField = (field) => {
            field.value = findedField.value
            field.edit = false
            this.buffer.backup = this.buffer.backup.filter(f => f.id != field.id)
        }

        for (let field of this.section.fields) {
            if (field.type == 'text_group') {
                for (let subfield of field.fields) {
                    findedField = this.buffer.backup.find(f => f.id == subfield.id)
                    if (findedField) {
                        clearField(subfield)
                    }
                }
            } else {
                findedField = this.buffer.backup.find(f => f.id == field.id)

                if (findedField) {
                    clearField(field)
                }
            }
        }
    }
}

export class Tariffs {
    constructor() {
        this.balance = {
            tariffs: {
                current: null,
                options: [],
                changed: false,
                loading: false
            },
            payers: {
                balance: 0,
                sum: 0,
                loading: false,
                company: {
                    value: null,
                    options: []
                }
            },
            actions: {
                total_sum: 0,
                date: [format(startOfMonth(new Date()), 'yyyy-MM-dd'), format(endOfMonth(new Date()), 'yyyy-MM-dd')],
                table: {
                    header: [],
                    body: []
                }
            }
        }
    }

    async getBalance() {
        const response = await api.callMethod('GET', routes.tariffs.get_balance)
        this.balance.tariffs = {
            current: response.data.current_tariff,
            options: response.data.tariffs,
            changed: false,
            loading: false
        }
        this.balance.payers = {
            balance: response.data.balance,
            sum: 10000,
            loading: false,
            changed: false,
            company: {
                value: response.data.payers[0]?.value ?? null,
                options: response.data.payers
            }
        }
        this.balance.actions.total_sum = response.data.total_sum
    }

    // Фильтрация расхода диапазона
    async filterBalance() {
        const response = await api.callMethod('GET', `${routes.tariffs.get_balance}?date_start=${this.balance.actions.date[0]}&date_end=${this.balance.actions.date[1]}`)
        this.balance.actions.total_sum = response.data.total_sum
    }

    async updateTariffs() {
        try {
            this.balance.tariffs.loading = true
            await api.callMethod('PUT', routes.tariffs.update_tariff.replace('${id}', this.balance.tariffs.current))
        } catch (error) {
            console.log(error);
        } finally {
            this.balance.tariffs.loading = false
            this.balance.tariffs.changed = false
        }
    }

    async updateBalance() {
        try {
            this.balance.payers.loading = true
            const request = {
                payer: this.balance.payers.company.value,
                sum: this.balance.payers.sum
            }

            await api.callMethod("PUT", routes.tariffs.update_balance, request);
            const response = await api.callMethod("POST", routes.tariffs.get_balance_url, request);
            window.open(response.data.url, '_blank')
        } catch (error) {
            console.log(error);
        } finally {
            this.balance.payers.loading = false
            this.balance.payers.changed = false
        }
    }
}

export class Logistic {
    constructor(activeDate) {
        this.columns = {
            column_1: [],
            column_2: []
        }
        this.logistic_tasks = {
            updatingCount: 0
        }
        this.routes = {
            id: 0,
            updatingCount: 0
        }
        this.machine_tasks = {
            route_id: 0,
            selectedAddresses: [],
            updatingCount: 0
        }
        this.activeDate = format(activeDate, 'yyyy-MM-dd')
        this.map = []
        this.isDragging = false
        this.modal = {
            state: false,
            title: 'Создание раздела',
            actionTitle: 'Создать маршрут',
            action: 'create',
            text: null,
            content: {
                entities: {
                    company: {
                        active: null,
                        list: []
                    },
                    cars: {
                        active: null,
                        list: []
                    },
                    employees: {
                        active: null,
                        list: []
                    }
                },
                filter: {
                    q: null,
                    car: null,
                    company: null,
                    employees: null
                },
            },
            loading: false
        }
        this.filterFields = []
    }

    // Получение колонок
    async getSections() {
        const response = await api.callMethod('GET', routes.logistic.getSections)

        for (let column of response.data) {
            this.columns[`column_${column.value.column}`].push({...column, ...column.value})
            this.columns[`column_${column.value.column}`].sort((a, b) => a.value.position - b.value.position)
        }
    }

    // Получение выбранных точек
    getSelectedPoints(data) {
        this.machine_tasks.selectedAddresses = data
    }

    // Получение точек маршрута для карты
    getRoutes(data) {
        this.map = data.map(row => row.address?.coords ?? [])
    }

    // Обновление активной даты
    updateActiveDate(activeDate) {
        this.activeDate = format(activeDate, 'yyyy-MM-dd')
        this.machine_tasks.updatingCount++
        this.logistic_tasks.updatingCount++
        this.routes.updatingCount++
    }

    // Обновление активного маршрута
    updateActiveRoute(activeRoute) {
        this.routes.id = activeRoute?.value[0]
        this.machine_tasks.route_id = activeRoute?.value[0]
        this.routes.updatingCount++
        this.machine_tasks.updatingCount++
    }

    // Выбор маршрута из таблицы
    choseRoute(row) {
        this.machine_tasks.route_id = row.id
        this.machine_tasks.updatingCount++
        this.getRouteFilters(row.id)
    }

    updateRoute() {
        this.routes.updatingCount++
        this.machine_tasks.updatingCount++
    }

    async getRouteFilters(id) {
        const response = await api.callMethod('GET', routes.logistic.getFilterFields.replace('${id}', id))
        this.filterFields = response.data
        this.logistic_tasks.updatingCount++
    }

    // Конец ресайза
    endResize({section, height}) {
        section.height = height
        this.updateSections()
    }

    // Начало перетаскивания 
    dragStart() {
        this.isDragging = true
    }

    // Конец перетаскивания
    dragEnd() {
        this.isDragging = false
        this.updateSections()
    }

    // Обновление колонок
    async updateSections() {
        for (let column in this.columns) {
            this.columns[column].map(async (section, index) => {
                await api.callMethod('PUT', routes.logistic.updateSection.replace('${id}', section.id), {
                    column: column.replace('column_', ''),
                    position: index + 1,
                    height: section.height
                })  
            })
        }
    }

    // Инициализация создания маршрута
    initCreateRoute() {
        this.modal.state = true
    }

    // Создание маршрута
    async createRoute(content) {
        try {
            this.modal.loading = true
            await api.callMethod('POST', routes.logistic.createRoute, {rows: [{
                ...content,
                date: this.activeDate
            }]})
            this.updateActiveRoute({value: [null]})
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.loading = false
            this.modal.state = false
        }
        this.modal.content = {
            entities: {
                company: {
                    active: null,
                    list: []
                },
                cars: {
                    active: null,
                    list: []
                },
                employees: {
                    active: null,
                    list: []
                }
            },
            filter: {
                q: null,
                car: null,
                company: null,
                employees: null
            },
        }
    }

    // Изменение порядка задач
    async changeRouteTasks(list) {
        await api.callMethod('POST', routes.logistic.changeRouteTasks, {rows: [{id: this.machine_tasks.route_id, task_id: list.map(item => item.id)}]})
    }

    changeFilter() {

    }
}

export class Socket {
    constructor() {
        this.options = {
            authEndpoint: `https://${routes.tenant}/broadcasting/auth`,
            broadcaster: 'pusher',
            key: '9c178d50f781876d1c75',
            httpHost: `/${routes.tenant}`,
            httpsHost: `/${routes.tenant}`,
            wsHost: `/${routes.tenant}`,
            wssHost: `/${routes.tenant}`,
            wsPort: 6001,
            wssPort: 6001,
            forceTLS: true,
            disableStats: true,
            encrypted: false,
            //enabledTransports: ['ws', 'wss'],
            cluster: 'eu',
            auth: {
                headers: {
                    Authorization: `Bearer null`
                },
            },
        }
        this.entities = {}
        this.isModal = false;
        this.userStore = null
        this.emit = null
    }

    // Инициализация
    init(emit) {
        this.userStore = useUserStore()
        this.options.auth = {
            headers: {
                Authorization: `Bearer ${this.userStore.token}`
            },
        }
        this.emit = emit

        window.Pusher = Pusher
        window.Echo = new Echo(this.options);

        // Обновление строк в таблице и объектов
        window.Echo.private(`tenant.${routes.tenant.split('.')[0]}`).listen('ObjectUpdated', (data) => this.ObjectUpdated(data))
        // Обновление настроек поля
        window.Echo.private(`tenant.${routes.tenant.split('.')[0]}`).listen('FieldUpdated', (data) => this.ObjectUpdated(data))
    }


    set({slug, id}) {
        this.entities[slug] = new socketObject()

        if (id) {
            this.entities[slug].details[id] = {
                history: {
                    events: [],
                    fields: []
                }
            }
        }
        // console.log(this.entities);
    }

    remove({slug, id}) {
        delete this.entities[slug].details[id]
    }

    // Обновление строк в таблице и объектов
    ObjectUpdated(data) {
        console.log(data);
        
        // Проверяем, существует ли объект для данного slug
        if (!data.data || !data.data.slug || !this.entities[data.data.slug]) return

        switch (data.action) {
            case 'ObjectCreated':
                this.entities[data.data.slug].ObjectCreated({data: data.data, isModal: this.isModal, userId: this.userStore.user.id})
                break;
            case 'ObjectUpdated':
                this.entities[data.data.slug].ObjectUpdated({data: data.data, isModal: this.isModal, userId: this.userStore.user.id})
                break;
            case 'ObjectDeleted':
                this.entities[data.data.slug].ObjectDeleted({data: data.data, isModal: this.isModal, userId: this.userStore.user.id})
                break;
            case 'ObjectRestored':
                this.entities[data.data.slug].ObjectDeleted({data: data.data, isModal: this.isModal, userId: this.userStore.user.id})
                break;
            case 'HistoryUpdated':
                this.entities[data.data.slug].HistoryUpdated({data: data.data, isModal: this.isModal, userId: this.userStore.user.id})
                break;
            default:
                break;
        }
    }

    // Обновление настроек поля
    FieldUpdated(data) {
        console.log('FieldUpdated', data);
    }
}

class socketObject {
    constructor() {
        this.table = []
        this.details = {}
    }

    // Обновление строки
    ObjectUpdated({data, isModal, userId}) {
        // Свои правки скрываем всегда — не показывать плашку «X изменений»
        // на родительских таблицах за модалкой, в которой пользователь сам
        // только что и сделал правку. Раньше при isModal=true мы пропускали
        // проверку и плашка всплывала в таблице задач за модалкой задачи.
        if (userId == data.changed_by) return

        let findedRow = this.table.find(row => row.id == data.id)

        if (findedRow) {
           Object.assign(findedRow.row, data.viewList)
        } else {
            this.table.push({
                row: data.viewList,
                state: 'update'
            })
        }
    }

    ObjectCreated({data}) {
        this.table.push({
            row: data.viewList,
            state: 'update'
        })
    }

    ObjectDeleted({data}) {
        let findedRow = this.table.find(row => row.id == data.id)

        if (findedRow) {
            findedRow.state = 'delete'
        } else {
            this.table.push({
                row: data.viewList,
                state: 'delete'
            })
        }
    }

    HistoryUpdated({data}) {
        if (!this.details[data.id]) return

        for (let field of data.fields) {
            if (['FIELD_UPDATED'].includes(field.event)) {
                this.details[data.id].history.fields.push(field)
            }
        }
        console.log(this.details);
        // this.details.history
    }
}