import api from '@/helpers/api.js'
import 'vue3-toastify/dist/index.css';
import routes from '@/helpers/routes.js'
import { useVirtualizer } from '@tanstack/vue-virtual'
import isEqual from 'lodash/isEqual'

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Mask } from 'maska'
import { toast } from 'vue3-toastify';
import { useUserStore } from '@/stores/userStore.js'

export function isImageSrc(file) {
    if (typeof file != 'string') return false
    const src = file.trim()
    return src != '' && src != '[]' && src != '{}' && src != 'null' && src != 'undefined'
}

export class Common {
    constructor() {}

    // Преобразование цены
    transformPrice(price, fixed) {
        return parseFloat(price).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    }

    formatByMask(value, mask) {
        if (value === null || value === undefined || value === '' || !mask || mask == 'email' || typeof value == 'object') return value
        try {
            const masked = new Mask({
                mask,
                tokens: {
                    A: { pattern: /[a-zA-Zа-яА-Я]/ },
                    '#': { pattern: /\d/ },
                    '*': { pattern: /[a-zA-Z0-9]/ },
                    S: { pattern: /[0-9а-яА-Я]/ }
                }
            }).masked(String(value))
            return masked || value
        } catch (e) {
            return value
        }
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
        this.permissions = {}
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
        this.validateBuffer = {
            state: false,
            errors: []
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

            if (this.options?.isExternal && this.slug) {
                response = await api.callMethod('GET', routes.external_link.table.replace('${token}', this.pageId).replace('${slug}', this.slug))
            } else if (this.slug) {
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
            // initVirtualizer() пересоздаёт виртуализатор после set(); без повторного
            // measure() для таблицы из одной строки notify не приходит (размер тела не
            // меняется = ResizeObserver молчит) и единственная строка не отрисовывается.
            if (this.rowVirtualizer) {
                this.rowVirtualizer.scrollToIndex(0)
                this.rowVirtualizer.measure()
            }
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
            const fieldCols = (response.table ?? []).filter(c => !['actions', 'isChoose', 'clicked', 'iconDrag', 'iconDelete'].includes(c.key))
            const editable = fieldCols.length == 0 || fieldCols.some(c => !c.read_only)
            this.permissions = { ...this.permissions, update_p: editable ? 'A' : 'N', delete_p: editable ? 'A' : 'N' }
            this.set(response, true)
            this.getHeader(editable ? response.table : (response.table ?? []).filter(c => c.key !== 'actions' && c.key !== 'isChoose'))
            await this.initVirtualizer()
            if (this.rowVirtualizer) {
                this.rowVirtualizer.scrollToIndex(0)
                this.rowVirtualizer.measure()
            }
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
            if (this.rowVirtualizer) {
                this.rowVirtualizer.scrollToIndex(0)
                this.rowVirtualizer.measure()
            }
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
        if (response.permissions) this.permissions = response.permissions
        this.getBody(response.list.data ?? response.list)
        this.setSortItem({
            sort_field: response.list.sort_field,
            sort_order: response.list.sort_order
        })
        const perPage = Number(response.list.per_page)
        this.pages = {
            current: response.list.current_page,
            total: response.list.last_page,
            limit: [12, 25, 50, 100].includes(perPage) ? perPage : 25
        }
        await this.initVirtualizer()
        if (this.rowVirtualizer) {
            this.rowVirtualizer.scrollToIndex(0)
            this.rowVirtualizer.measure()
        }
        this.clear()
    }

    // Получнеие шапки
    getHeader(data, force = false) {
        if (!force && this.isChanged && Array.isArray(this.header) && this.header.length) return
        // Служебные колонки `clicked` и `iconDrag` добавляются ниже на основе
        // опций таблицы (isCheckClicked / isHaveOrder), а НЕ приходят с бэка.
        // Но saveSettings раньше сохранял this.header целиком (вместе с ними),
        // поэтому при перезагрузке они приходили в data и задваивались, а так
        // же «протекали» на обычные страницы с тем же slug (например objects
        // для logistic_tasks). Поэтому всегда вычищаем их из входных данных —
        // источником истины для них являются опции таблицы.
        data = (data ?? []).filter(p => p.key !== 'clicked' && p.key !== 'iconDrag')
        // Во внешней ссылке скрываем колонку действий (open/edit/delete и т.п.).
        if (this.options?.isExternal) {
            data = data.filter(p => p.key !== 'actions' && p.key !== 'isChoose')
        }
        if (this.options?.disabledKeys && this.options?.disabledKeys.length > 0) {
            data = data.map(p => this.options?.disabledKeys.find(k => k == p.key) ? { ...p, read_only: true } : p)
        }

        let header = data
        if (this.options.isCheckClicked) {
            let clickedFixed = true
            let clickedEnabled = true
            if (typeof window !== 'undefined') {
                const stored = window.localStorage.getItem(`table_clicked_fixed_${this.slug}`)
                if (stored !== null) clickedFixed = stored === '1'
                // Колонка `clicked` не сохраняется на бэкенд (служебная), поэтому
                // её видимость (вкл/выкл в настройках отображения) запоминаем
                // в localStorage — иначе после перезагрузки она снова включалась
                // (8462).
                const storedEnabled = window.localStorage.getItem(`table_clicked_enabled_${this.slug}`)
                if (storedEnabled !== null) clickedEnabled = storedEnabled === '1'
            }
            header = [{
                "id": 0,
                "title": "Выбранная строка",
                "key": "clicked",
                "width": "44px",
                "enabled": clickedEnabled,
                "hover": false,
                "sort_order": null,
                "type": "checkbox",
                "fixed": clickedFixed,
                "fixTarget": "0px",
                "index": 1,
                "mask": null,
                "left": 0,
                "value": false
            }, ...header]
        }
        // Колонка-порядок: используется, например, в «Задачах в машине» —
        // чтобы видеть номер задачи в маршруте (1, 2, 3 …). Рендерится в
        // Body.vue по column.key == 'iconDrag' и выводит index + 1.
        if (this.options.isHaveOrder) {
            header = [{
                "id": -1,
                "title": "№",
                "key": "iconDrag",
                "width": "40px",
                "enabled": true,
                "hover": false,
                "sort_order": null,
                "type": "text",
                "fixed": true,
                "fixTarget": "0px",
                "index": 0,
                "mask": null,
                "left": 0,
                "value": null
            }, ...header]
        }
        this.header = header
    }

    // Получение контента
    getBody(data) {
        // Сохраняем id строки, которая была отмечена .table__row_clicked
        // (флаг row.clicked), и переносим на свежие данные. Без этого после
        // socket-loader/updatingCount таблица обновляется и пользователь
        // теряет визуально активную строку (выбранный маршрут / задачу).
        const clickedId = this.body?.find?.(r => r && r.clicked)?.id ?? null
        if (clickedId != null && Array.isArray(data)) {
            this.body = data.map(row => ({
                ...row,
                clicked: row && row.id == clickedId ? true : false
            }))
        } else {
            this.body = data
        }
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
            const route = this.slug == 'products' && this.options?.isLocalTable ? routes.table.reset_products : routes.table.reset.replace('${slug}', this.slug)
            const response = await api.callMethod('GET', route)

            if (response.data.fields) {
                this.setSortItem({
                    sort_field: response.data.sort_field,
                    sort_order: response.data.sort_order
                })
                this.getHeader(response.data.fields, true)
            }
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    // Пустое ли значение ячейки (формы значений — как в useCellModel)
    isEmptyCell(cell, column) {
        if (cell == null) return true
        if (column.type == 'address') return !(cell.text ?? cell.value ?? null)
        if (Array.isArray(cell)) return cell.filter(v => v != null && v !== '').length == 0
        if (typeof cell == 'object') {
            const value = cell.value
            if (value == null) return true
            if (Array.isArray(value)) return value.filter(v => v != null && v !== '').length == 0
            return String(value).trim() === ''
        }
        return String(cell).trim() === ''
    }

    // Проверка обязательных полей у редактируемых строк перед массовым
    // сохранением — как в деталке (Section.save → validator.check)
    validateRequired(rows) {
        const serviceKeys = ['isChoose', 'actions', 'clicked', 'iconDrag', 'iconDelete']
        const requiredColumns = this.header.filter(column => column.required && !serviceKeys.includes(column.key))
        if (requiredColumns.length == 0) return []

        const errors = []
        for (let row of rows) {
            const emptyFields = requiredColumns.filter(column => this.isEmptyCell(row[column.key], column))
            if (emptyFields.length > 0) {
                errors.push({
                    id: row.id,
                    // колонки целиком — модалка валидации рендерит по ним
                    // редактируемые поля (как в деталке)
                    columns: emptyFields,
                    fields: emptyFields.map(column => column.title)
                })
            }
        }
        return errors
    }

    // Сохранение
    async save() {
        // На каждый объект с пустыми обязательными полями — предупреждение,
        // сохранение блокируем, режим редактирования не сбрасываем.
        if (this.slug != 'products') {
            const errors = this.validateRequired(this.body.filter(row => row.edit))
            if (errors.length > 0) {
                this.validateBuffer = {
                    state: true,
                    errors
                }
                return
            }
        }
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
                        product_volume: row['product_volume'],
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
            

            // Для products пустой request — валидный кейс: пользователь удалил
            // все товары и хочет сохранить задачу без товаров (8551). Поэтому
            // ранний выход только для остальных таблиц.
            if (request.length == 0 && this.slug != 'products') return

            if (this.slug) {
                if (this.slug == 'products') {
                    await api.callMethod('PUT', routes.table.set_products.replace('${parent_slug}', this.options?.parentSlug ?? 'logistic_tasks').replace('${page_id}', this.pageId), {
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

    // Создание задачи логистики из строки «Библиотеки задач» (addresses):
    // открываем деталку создания logistic_tasks с полями по умолчанию из адреса.
    // Поля addresses клонированы из logistic_tasks, поэтому их значения уже в той
    // же форме, что ожидает форма создания задачи.
    createTaskFromAddress(row) {
        const keys = ['name', 'address', 'phone', 'time', 'car_requirements', 'employee_requirements', 'service_time', 'comment', 'contact', 'photo', 'client_id', 'weight', 'delivery_price']
        const defaults = {}
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null) {
                defaults[key] = JSON.parse(JSON.stringify(row[key]))
            }
        }
        this.emit('openModal', {
            type: 'create',
            slug: 'logistic_tasks',
            id: 0,
            defaults
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
        if (this.permissions?.update_p === 'N') return
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
        this.common.copyLink(`${window.location.origin}/objects/${this.slug}/${row.id}`)
    }

    copyExternalLink(row) {
        this.common.copyExternalLink({slug: this.slug, id: row.id})
    }

    ownsRow(row) {
        const uid = useUserStore().user?.id
        if (uid == null) return false
        let owner = row?.user_id
        if (owner && typeof owner === 'object') owner = owner.value ?? owner.id ?? (Array.isArray(owner) ? owner[0] : null)
        if (Array.isArray(owner)) owner = owner[0]
        if (owner && typeof owner === 'object') owner = owner.value ?? owner.id ?? null
        return owner != null && String(owner) === String(uid)
    }

    canCreate() {
        return this.permissions?.create_p !== 'N'
    }

    canEditRow(row) {
        const p = this.permissions?.update_p
        if (p === 'N') return false
        if (p === 'Y') return this.ownsRow(row)
        return true
    }

    canDeleteRow(row) {
        const p = this.permissions?.delete_p
        if (p === 'N') return false
        if (p === 'Y') return this.ownsRow(row)
        return true
    }

    // Инициализация удаления
    initDelete(rows = []) {
        if (this.permissions?.delete_p === 'N') return
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
        // Сохраняем скролл ДО сброса isDragging: смена режима позиционирования
        // строк (relative → absolute) может сбросить scrollTop в 0 в Safari.
        const scrollEl = this.tableRef
        const savedTop = scrollEl?.scrollTop ?? 0
        const savedLeft = scrollEl?.scrollLeft ?? 0
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

        // Обновляем виртуализатор после завершения перетаскивания.
        // isShort-таблицы («Задачи в машине», «Задачи логистики» и т.п.) НЕ
        // используют scroll-виртуализацию — их строки рендерятся напрямую из
        // body.map (см. Body.vue rows). Пересоздание виртуализатора на каждый
        // reorder только лишний раз перетряхивало DOM, который Sortable уже
        // расставил, из-за чего нижние строки «скакали»/мерцали (задача 8453).
        // Для коротких таблиц пропускаем — порядок и так уже в body.
        await nextTick()
        if (!this.options?.isShort) {
            this.initVirtualizer()
            // setTimeout (макрозадача) запускается после всех nextTick виртуализатора —
            // к этому моменту virtualizer уже пересоздан и scrollTop мог обнулиться.
            setTimeout(() => {
                if (scrollEl && scrollEl.scrollTop === 0 && savedTop > 0) scrollEl.scrollTop = savedTop
                if (scrollEl && scrollEl.scrollLeft === 0 && savedLeft > 0) scrollEl.scrollLeft = savedLeft
            }, 0)
        }

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
            if (this.options?.isLocalTable) {
                this.sortLocalBody(column)
                return
            }
            this.pages.current = 1
            await this.filter.get()
        } catch (error) {
            console.log('get_table', error);
        } finally {
            this.loading = false
        }
    }

    sortLocalBody(column) {
        const order = this.sortItem.sort_order == 'asc' ? 1 : -1
        const extract = (row) => {
            let v = row?.[column.key]
            if (typeof v === 'string') {
                const trimmed = v.trim()
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try { v = JSON.parse(trimmed) } catch (e) {}
                }
            }
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                v = v.value ?? v.text ?? null
            }
            if (Array.isArray(v)) {
                v = v.length ? v[0] : null
            }
            return v
        }
        this.body = [...this.body].sort((a, b) => {
            const av = extract(a)
            const bv = extract(b)
            const aEmpty = av === null || av === undefined || av === ''
            const bEmpty = bv === null || bv === undefined || bv === ''
            if (aEmpty && bEmpty) return 0
            if (aEmpty) return 1
            if (bEmpty) return -1
            if (column.type == 'date') {
                return (new Date(av).getTime() - new Date(bv).getTime()) * order
            }
            const an = parseFloat(String(av).replace(',', '.'))
            const bn = parseFloat(String(bv).replace(',', '.'))
            if (!isNaN(an) && !isNaN(bn) && String(av).trim() !== '' && String(bv).trim() !== '') {
                return (an - bn) * order
            }
            return String(av).localeCompare(String(bv), 'ru', { numeric: true, sensitivity: 'base' }) * order
        })
        nextTick(() => {
            this.initVirtualizer()
        })
    }

    // Сохранение настроек
    async saveSettings(role) {
        let method = this.slug == 'products' && this.options?.isLocalTable ? routes.table.update_products : routes.table.save_settings.replace('${slug}', this.slug)

        try {
            await api.callMethod('POST', role ? `${method}/${role}` : method, {
                sort_field: this.sortItem.sort_field,
                sort_order: this.sortItem.sort_order,
                // Не сохраняем служебные колонки, добавляемые на фронте по опциям
                // таблицы (clicked/iconDrag). Иначе они попадают в настройки slug,
                // задваиваются при перезагрузке и протекают на другие страницы
                // с тем же slug (например objects для logistic_tasks).
                fields: this.header.filter(p => p.key !== 'clicked' && p.key !== 'iconDrag')
            })
            if (typeof window !== 'undefined') {
                const clickedCol = this.header.find(p => p.key === 'clicked')
                if (clickedCol) {
                    window.localStorage.setItem(`table_clicked_fixed_${this.slug}`, clickedCol.fixed ? '1' : '0')
                    window.localStorage.setItem(`table_clicked_enabled_${this.slug}`, clickedCol.enabled ? '1' : '0')
                }
            }
        } catch (error) {
            console.log('saveSettings columns error', error)
        }

        const perPageMethod = routes.table.set_per_page.replace('${slug}', this.slug)
        await api.callMethod('POST', perPageMethod, { per_page: this.pages.limit })

        this.isChanged = false

        // Столбцы связанных сущностей (задача 14) резолвит бэкенд по сохранённому
        // заголовку, поэтому после сохранения настроек перезагружаем данные.
        if (this.header.some(p => typeof p.key === 'string' && p.key.startsWith('rel__'))) {
            await this.filter.get()
        }
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
        // Новая строка ДОЛЖНА иметь edit:true и isChoose:true. Map выше
        // эти флаги ставит только существующим строкам — новая (push) шла
        // без них и получала ТОЛЬКО class table__row, без table__row_edit /
        // table__row_choose. Из-за этого CSS-стили активной/редактируемой
        // строки не применялись и кнопка меню действий у неё не открывалась
        // (попап ShowMore рендерился, но click перехватывался MassAction'ом
        // / её родительский table__row не получал pointer-events: auto
        // нужного для edit-режима).
        newObj.edit = true
        newObj.isChoose = true
        // local_id раньше считался как body.length+1. Если пользователь
        // удалял строки в середине, индекс мог совпасть с уже существующим
        // local_id — тогда у row.key (getItemKey использует local_id)
        // случались коллизии, и Vue/virtualizer считал «новую» строку той же,
        // что и существующую. ShowMore popup у такой строки не открывался,
        // потому что DOM-инстанс попапа уже был привязан к другой строке.
        // Берём max существующих + 1 — это всегда уникально.
        const maxLocalId = this.body.reduce((max, r) => {
            const lid = Number(r?.local_id)
            return Number.isFinite(lid) && lid > max ? lid : max
        }, 0)
        newObj.local_id = maxLocalId + 1
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
        this.appliedFields = []
    }

    // Фильтрация
    async get(fields = null, saved_query = {}) {
        if (fields === null) {
            fields = this.appliedFields ?? []
        } else {
            this.appliedFields = fields
            if (saved_query?.page == null) {
                this.setter.pages.current = 1
            }
        }
        // Установка фильтра
        const setFilter = (fields, saved_query) => {
            let response = []

            if (saved_query) {
                const rawPerPage = Number(saved_query.per_page ?? this.setter.pages.limit)
                const perPage = [12, 25, 50, 100].includes(rawPerPage) ? rawPerPage : 25
                response.push(`per_page=${perPage}`)
                response.push(`page=${saved_query.page ?? this.setter.pages.current}`)
                // sort_field/sort_order пушим только если реально заданы. Иначе в
                // запрос уходила строка "sort_field=null" (sortItem пуст при первой
                // загрузке) — бэк трактовал "null" как имя колонки и игнорировал
                // СОХРАНЁННУЮ сортировку настроек таблицы. Из-за этого на логистике
                // (таблицы грузятся через getWithQuery, URL не персистится) после
                // сохранения настроек сортировка слетала при перезагрузке.
                const sortField = saved_query.sort_field ?? this.setter.sortItem.sort_field
                const sortOrder = saved_query.sort_order ?? this.setter.sortItem.sort_order
                if (sortField != null && sortField !== 'null') response.push(`sort_field=${sortField}`)
                if (sortOrder != null && sortOrder !== 'null') response.push(`sort_order=${sortOrder}`)
                const relKeys = (this.setter.header || [])
                    .filter(c => c && c.enabled && typeof c.key === 'string' && c.key.startsWith('rel__'))
                    .map(c => c.key)
                if (relKeys.length) response.push(`rel_fields=${encodeURIComponent(relKeys.join(','))}`)
                // Пропускаем filter[...] из URL прямо в запрос. Без этого
                // прямые ссылки вида /objects/<slug>?filter[id]=N не применяли
                // фильтр — saved_query содержал ключ «filter[id]» как
                // плоскую строку и setFilter его игнорировал.
                for (const key in saved_query) {
                    if (key.startsWith('filter[') && saved_query[key] != null && saved_query[key] !== '') {
                        response.push(`${key}=${saved_query[key]}`)
                    }
                }
            }

            if (this.setter.dependences.state) {
                const otherKeys = Object.keys(this.setter.dependences.query)
                for (let key of otherKeys) {
                    if (['trashed', 'with_trashed'].includes(key)) {
                        response.push(`${key}=${this.setter.dependences.query[key] ? 1 : 0}`)
                    } else if (key == 'trash_tab') {
                        continue
                    } else if (key == 'search') {
                        // encodeURIComponent обязателен: без него '#' в запросе (напр. "#112")
                        // трактуется как начало URL-фрагмента, q приходит пустым и таблица
                        // отдаёт все строки без фильтрации.
                        response.push(`q=${encodeURIComponent(this.setter.dependences.query[key])}`)
                    } else if (Array.isArray(this.setter.dependences.query[key])) {
                        for (let value of this.setter.dependences.query[key]) {
                            response.push(`filter[${key}][]=${encodeURIComponent(value)}`)
                        }
                    } else if (key == 'per_page') {
                        response.push(`per_page=${this.setter.dependences.query[key]}`)
                    } else if (key == 'is_slug') {
                        response.push(`is_slug=${this.setter.dependences.query[key]}`)
                    } else if (this.setter.dependences.query[key]) {
                        response.push(`filter[${key}]=${encodeURIComponent(this.setter.dependences.query[key])}`)
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
            
            // Во внешней ссылке таблица привязанной сущности грузится через
            // token-эндпоинт без авторизации; scoping (только связанные строки)
            // обеспечивает сервер.
            const tableRoute = this.setter.options?.isExternal
                ? routes.external_link.table.replace('${token}', this.setter.pageId).replace('${slug}', this.setter.slug)
                : routes.table.get.replace('${slug}', this.setter.slug)
            let response = await api.callMethod("GET", tableRoute + `${this.query ? '?' + this.query : ''}`)
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

        this.fields = response.filter(field => !['isChoose', 'actions', 'file', 'route_statuses', 'route_map'].includes(field.type)).map((p, index) => {
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
            title: filter.title,
            search: filter.search ? 1 : 0
        })

        this.saves[this.saves.findIndex(p => p.id == filter.id)] = filter
    }

    // Создание сохраненного фильтра
    async createSavedFilter(filter) {
        const response = await api.callMethod('POST', routes.filter.create.replace('${slug}', this.setter.slug), {
            fields: filter.fields,
            title: filter.title,
            search: filter.search ? 1 : 0
        })
        this.saves.push({
            id: response.data.id,
            title: filter.title,
            is_hidden: false,
            search: !!filter.search,
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
    constructor ({columns, emit, reload}) {
        this.id = null
        this.slug = null
        this.editTitle = false
        this.name = ''
        this.emit = emit
        this.reload = reload ?? null
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

    createTaskFromAddress({columns}) {
        const keys = ['name', 'address', 'phone', 'time', 'car_requirements', 'employee_requirements', 'service_time', 'comment', 'contact', 'photo', 'client_id', 'weight', 'delivery_price']
        const defaults = {}
        for (const key of keys) {
            const field = this.common.findColumnField(columns, key)
            if (field && field.value !== undefined && field.value !== null) {
                defaults[key] = JSON.parse(JSON.stringify(field.value))
            }
        }
        this.emit('openModal', {
            type: 'create',
            slug: 'logistic_tasks',
            id: 0,
            defaults
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
                this.reload ? this.reload() : this.emit('close', true)
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
                this.reload ? this.reload() : this.emit('close', true)
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
                const editErrors = { ...this.validator.errors }
                isError = isError ? isError : Object.keys(editErrors).length > 0
                this.buffer.edits = [...this.buffer.edits, ...fields]
                for (let field of fields) {
                    field.error = {
                        state: editErrors[field.key] ?? false,
                        text: editErrors[field.key] ?? null
                    }
                }

                // Обязательные поля НЕ в режиме редактирования тоже проверяем —
                // иначе пустое required-поле проходило без ошибки, если его не трогали.
                // Исключение — пароль (8480): его значение никогда не приходит на
                // клиент (хранится только на сервере), поэтому нетронутое поле
                // пароля здесь всегда «пустое». Требовать его при правке других
                // полей нельзя — пароль уже задан. Если пароль реально меняют,
                // он попадает в edit-ветку выше и там валидируется как обычно.
                const requiredReadOnly = section.fields.reduce((arr, f) => {
                    if (f.type === 'text_group') {
                        f.fields.forEach(sf => { if (!sf.edit && sf.required && sf.type !== 'password') arr.push(sf) })
                    } else if (!f.edit && f.required && f.type !== 'password') {
                        arr.push(f)
                    }
                    return arr
                }, [])
                if (requiredReadOnly.length > 0) {
                    this.validator.check(requiredReadOnly)
                    if (Object.keys(this.validator.errors).length > 0) {
                        isError = true
                        for (let f of requiredReadOnly) {
                            if (this.validator.errors[f.key]) {
                                f.error = { state: true, text: this.validator.errors[f.key] }
                                this.buffer.edits.push(f)
                            }
                        }
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
                id: options?.isCopy ? pageId : (options?.isGlobalEdit ? 0 : pageId),
                ...(options?.isCopy ? { copy: 1 } : {}),
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

            const saveRoute = options?.isExternal
                ? routes.external_link.save.replace('${token}', pageId)
                : routes.detail.edit_fields.replaceAll('${slug}', slug)
            const response = await api.callMethod('POST', saveRoute, {
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
                                        if (subfield.value.localOptions) {
                                            subfield.value.localOptions = subfield.value.localOptions.filter(p => p != null && p.value != null)
                                        }
                                        subfield.value.value = subfield.value?.value.filter(p => p)
                                    }
                                    this.buffer.backup = this.buffer.backup.filter(f => f.id != subfield.id)
                                    subfield.edit = false
                                }
                            }
                        } else if (field.edit) {
                            if (field.type == 'relation' && field.value.value) {
                                field.value.localOptions = field.value.localOptions.filter(p => p != null && p.value != null)
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

    // Чистка subfields всех групп после cross-container drop в outer-секцию.
    // Вызывается из Field.dragChange (событие added на outer). Сканируем
    // ВСЕ группы во всех колонках: если movedFieldId всё ещё лежит в
    // subfields какой-то группы (nested-sortable не убрал) — splice + PUT
    // update_field с новым списком. Безопасно вызывать даже когда поле
    // не было в группе (просто ничего не найдёт).
    async dragCleanupAfterAdd(item, column_key, slug, columns) {
        const fieldId = item?.fieldId
        if (!fieldId) return
        const calls = []
        for (const column in columns) {
            for (const section of columns[column]) {
                for (const f of section.fields) {
                    if (f.type === 'text_group' && Array.isArray(f.fields)) {
                        const idx = f.fields.findIndex(p => Number(p.id) === Number(fieldId))
                        if (idx !== -1) {
                            f.fields.splice(idx, 1)
                            calls.push(api.callMethod('PUT', routes.detail.update_field.replace('${id}', f.id), {
                                id: f.id,
                                subfields: f.fields.map(p => p.id)
                            }))
                        }
                    }
                }
            }
        }
        if (calls.length) await Promise.all(calls)
    }

    // Принудительное удаление поля из subfields группы. Используется когда
    // nested sortable (vuedraggable) уронил поле в outer-секцию того же
    // column, но не убрал его из source-группы (известный квирк sortable.js
    // на вложенных листах с одинаковым group-name). Дёргаем то же backend-API,
    // что и dragGroupField, но с уже-уменьшенным списком subfields.
    async dragRemoveFromGroup(item, column_key, slug, columns) {
        const sourceGroupId = item?.sourceGroupId
        const movedFieldId = item?.movedFieldId
        if (!sourceGroupId || !movedFieldId) return

        let groupField = null
        for (const column in columns) {
            for (const section of columns[column]) {
                for (const f of section.fields) {
                    if (Number(f.id) === Number(sourceGroupId) && Array.isArray(f.fields)) {
                        groupField = f
                        break
                    }
                }
                if (groupField) break
            }
            if (groupField) break
        }
        if (!groupField) return

        // splice in-place: гарантированно мутирует тот же массив, на который
        // ссылается props.section.fields у inner TileSection. Раньше делали
        // reassign (groupField.fields = filter(...)) — это создавало новый
        // массив, и до следующего ре-рендера inner draggable продолжал
        // показывать поле в группе.
        const idx = groupField.fields.findIndex(p => Number(p.id) === Number(movedFieldId))
        if (idx === -1) return
        groupField.fields.splice(idx, 1)

        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', groupField.id), {
            id: groupField.id,
            subfields: groupField.fields.map(p => p.id)
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
    initUpdate({field, hidden, section}) {
        const content = JSON.parse(JSON.stringify({
            ...field,
            section_id: section.id
        }))
        // Для text_group переписываем subfields из live-массива field.fields,
        // чтобы только что добавленные/удалённые поля сразу отражались в настройках.
        if (field.type === 'text_group' && Array.isArray(field.fields)) {
            content.subfields = field.fields.map(f => f.id)
        }
        this.modal = {
            state: true,
            title: 'Настройки поля',
            actionTitle: 'Сохранить',
            action: 'updateField',
            content,
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
                // group_id в снимке поля обычно null/undefined (фронтенд его не проставляет).
                // Удаляем из группы только если group_id явно задан и указывает на ДРУГУЮ группу.
                // Управление членством в группе — через drag, не через форму настроек.
                if (group_field && field.group_id != null &&
                    String(field.group_id) !== String(group_field.id)) {
                    await api.callMethod('PUT', routes.detail.update_field.replace('${id}', group_field.id), {
                        id: group_field.id,
                        subfields: group_field.fields.map(p => p.id).filter(id => Number(id) !== Number(field.id))
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

            // group_id исключаем: членство в группе управляется drag-системой,
            // отправка group_id: null из формы настроек сбрасывает привязку на бэкенде.
            const { fields, group_id, ...request } = field;
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
            if (index !== -1) {
                findedSection.fields.splice(index, 1)
            } else {
                // Поле может быть вложено в text_group — ищем там
                for (const gf of findedSection.fields) {
                    if (gf.type === 'text_group') {
                        const gi = gf.fields.findIndex(p => p.id == this.modal.content.id)
                        if (gi !== -1) { gf.fields.splice(gi, 1); break }
                    }
                }
            }

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

        // Если только что был драг — не открываем редактирование. Например,
        // пользователь начал тянуть поле и вернул на исходное место: click
        // долетает и без этого флага мы переходили бы в edit-режим.
        if (this._isDraggingField && type == 'target') return

        // Выделение текста (название/значение поля) не должно переводить поле в
        // редактирование: при drag-select в конце прилетает click по .field, и
        // без этой проверки поле открывалось на редактирование вместо копирования
        // выделенного текста.
        if (type == 'target' && typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return
        }

        if (type == 'target') {
            if (target.closest('.icon_drag') || target.closest('.field__settings') || target.closest('.blank__title')) return

            // Кнопки с data-action (например «посмотреть все» в relation-поле) не
            // должны переводить поле в режим редактирования — они выполняют свои
            // действия и не означают намерение редактировать само поле.
            if (target.closest('[data-action]')) return

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
            } else if (field.type == 'multi_text') {
                if (field.edit) return
            } else if (field.type == 'deal_stages') {
                return
            } else if (field.type == 'redactor') {
                // Редактор всегда активен и сам отмечает поле как изменённое через
                // обработчик update:model-value, поэтому клик по нему не должен
                // переводить поле в edit и плодить резервные копии в буфере.
                return
            } else if (field.type == 'file') {
                if (field.edit || (!target.classList.contains('file') && !target.classList.contains('file__values'))) return
            } else if (field.type == 'address') {
                // Для address клик по тексту значения раньше блокировал переход в edit —
                // в настройках Логистики из-за этого нельзя было поправить «Главный город»,
                // потому что весь видимый блок поля был либо .blank__text, либо картой.
                // Оставляем блокировку для копировать-кнопки и для любых кликов
                // внутри карты (Yandex отрисовывает внутри .map__frame-map свою
                // DOM-структуру, и target обычно — её внутренние ноды, поэтому
                // нужен closest, а не classList.contains).
                if (
                    field.edit ||
                    target.classList.contains('button_copy') ||
                    target.closest?.('.map__frame-map') ||
                    target.closest?.('.map__frame') ||
                    target.closest?.('[class*="ymaps"]') ||
                    target.closest?.('.leaflet-container')
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
        // Запоминаем, что это был именно драг — в setTimeout пока непонятно, но к
        // моменту dragEnd флаг будет выставлен. Используется в initChangeField,
        // чтобы возврат на исходное место не приводил к переходу в редактирование.
        this._isDraggingField = true
        this._dragStartedAt = Date.now()
    }

    // Конец перетаскивания поля.
    // Раньше тут лежали ВСЕ backend-вызовы. Но для случая inner-group →
    // outer-секция, которая является родителем этой группы, nested Sortable
    // нестабилен: event.to/event.from могут указывать в один и тот же
    // контейнер (либо inner, либо outer) — и тогда мы ничего не вызывали,
    // а поле визуально оставалось в группе. Поэтому cross-container moves
    // переехали в dragChange (там есть надёжное {added|removed} на каждой
    // стороне). Здесь оставлен ТОЛЬКО sort внутри одной outer-секции.
    async dragEnd(event, options = {type: 'section'}) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }
        // Чуть откладываем сброс флага, чтобы успел сработать click на исходном
        // поле (его HTML-event приходит ПОСЛЕ end в большинстве браузеров).
        setTimeout(() => { this._isDraggingField = false }, 250)

        const sameContainer = event?.to && event?.from && event.to === event.from
        const toIsOuter = event?.to?.dataset?.tileType === 'section'
        // Sort внутри одной outer-секции.
        if (sameContainer && toIsOuter && event?.to?.__draggable_component__) {
            await api.callMethod('POST', routes.detail.change_order_field, {
                id: event.item._underlying_vm_.id,
                section_id: event.to.__draggable_component__.itemKey,
                fields: event.to.__draggable_component__.modelValue.map((field, index) => ({
                    id: field.id,
                    sort: index
                }))
            })
        }
    }

    // dragChange срабатывает на каждое изменение модели после v-model'ной
    // мутации vuedraggable (added/removed/moved). У @change есть критичное
    // преимущество перед @end: он стреляет НА КАЖДОЙ из сторон nested
    // drag-операции независимо — и на inner-группе, и на outer-секции, —
    // даже когда @end путается с event.to/from.
    //
    // Поэтому:
    // - cross-section/inner→outer добавление обрабатываем тут (added на outer);
    // - любое изменение subfields группы обрабатываем тут (через dragGroupField).
    async dragChange(event, options = {type: 'section'}, groupField) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }

        // Inner группа — пересобираем её subfields на каждое изменение.
        if (options && options.type == 'field') {
            this.emit('actionSection', {action: 'dragGroupField', value: {groupField, event}})
            return
        }

        // Outer секция получила поле (cross-section ИЛИ inner→outer).
        // groupField тут — это сама секция (props.section из TileSection).
        if (event?.added && groupField) {
            const fieldId = event.added.element?.id
            if (!fieldId) return

            await api.callMethod('POST', routes.detail.change_order_field, {
                id: fieldId,
                section_id: groupField.id,
                fields: (groupField.fields || []).map((f, index) => ({
                    id: f.id,
                    sort: index
                }))
            })
            // Страховка: если nested Sortable не убрал поле из source-группы
            // (квирк, когда inner находится внутри той же outer-секции, в
            // которую мы дропнули), — чистим явно и пересохраняем subfields
            // той группы.
            this.emit('actionSection', {action: 'dragCleanupAfterAdd', value: {fieldId}})
        }
    }

    // Сообщает initChangeField, что только что был драг — чтобы клик по
    // исходному полю не открывал редактор. Возвращает true ~250 мс после end.
    isJustDragged() {
        return Boolean(this._isDraggingField)
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
                // Поле «Город» скрыто из общих настроек портала — его значение
                // продолжает храниться на бэке, но в UI больше не показываем.
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
                    }
                ]

                const response = await api.callMethod('GET', routes.settings.common.get)
                for (let field of this.section.fields) {
                    field.value = field.key == 'hints' ? String(response.data.common[field.key]) : response.data.common[field.key]
                }

                this.section.fields[this.section.fields.findIndex(f => f.key == 'timezone')].options = response.data.timezones
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

        this._applyDeviceLayout()
    }

    _deviceKey() {
        const w = (typeof window !== 'undefined') ? window.innerWidth : 1200
        return w <= 990 ? 'mobile' : 'desktop'
    }

    _layoutStorageKey() {
        return `logistic_layout_${this._deviceKey()}`
    }

    _applyDeviceLayout() {
        if (typeof window === 'undefined') return
        let saved = null
        try { saved = JSON.parse(window.localStorage.getItem(this._layoutStorageKey()) || 'null') } catch (e) { saved = null }
        if (!saved || typeof saved !== 'object') return

        const all = [...this.columns.column_1, ...this.columns.column_2]
        const cols = { column_1: [], column_2: [] }
        for (const section of all) {
            const ov = saved[section.id]
            if (ov) {
                section.value = { ...section.value, column: ov.column, position: ov.position }
                section.column = ov.column
                section.position = ov.position
                if (ov.height != null) section.height = ov.height
            }
            const colKey = `column_${section.value?.column ?? section.column ?? 1}`
            ;(cols[colKey] || cols.column_1).push(section)
        }
        const byPos = (a, b) => (a.position ?? a.value?.position ?? 0) - (b.position ?? b.value?.position ?? 0)
        cols.column_1.sort(byPos)
        cols.column_2.sort(byPos)
        this.columns = cols
    }

    _saveDeviceLayout() {
        if (typeof window === 'undefined') return
        const map = {}
        for (const column in this.columns) {
            this.columns[column].forEach((section, index) => {
                map[section.id] = {
                    column: column.replace('column_', ''),
                    position: index + 1,
                    height: section.height
                }
            })
        }
        try { window.localStorage.setItem(this._layoutStorageKey(), JSON.stringify(map)) } catch (e) {}
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

    updateSections() {
        this._saveDeviceLayout()
    }

    // Инициализация создания маршрута
    initCreateRoute() {
        this.modal.state = true
    }

    // Создание маршрута
    async createRoute(content) {
        try {
            this.modal.loading = true
            const response = await api.callMethod('POST', routes.logistic.createRoute, {rows: [{
                ...content,
                date: this.activeDate
            }]})
            // Авто-выбор созданного маршрута (8458): batch возвращает id новой
            // записи. Делаем его активным (choseRoute → машина/карта/фильтры) и
            // перезагружаем таблицу маршрутов, чтобы он появился и подсветился
            // (restoreRoutesSelection по machine_tasks.route_id). Раньше тут
            // всегда сбрасывали активный маршрут в null — авто-выбор не работал.
            const newId = response?.data?.id ?? null
            if (newId) {
                this.choseRoute({ id: newId })
                this.routes.updatingCount++
            } else {
                this.updateActiveRoute({value: [null]})
            }
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
        // Если несколько таблиц с одним slug (например, в логистике
        // 'logistic_tasks' рендерится дважды — Задачи логистики и Задачи в
        // машине), не пересоздаём socketObject: иначе у первой таблицы
        // table.socket остаётся указывать на УСТАРЕВШИЙ объект, и socket-
        // события до неё не доходят. Создаём только если ещё нет.
        if (!this.entities[slug]) {
            this.entities[slug] = new socketObject()
        }

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

    // Сброс собственных правок, отложенных пока была открыта модалка.
    // Вызывается app.vue в watcher'е entity.modal, когда модалок не осталось.
    flushPendingOwn() {
        for (const slug in this.entities) {
            const ent = this.entities[slug]
            if (ent && typeof ent.flushPendingOwn === 'function') {
                ent.flushPendingOwn()
            }
        }
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
        // Очередь собственных правок, прилетевших во время открытой модалки.
        // Пока модалка открыта, мы НЕ добавляем их в socket.table (иначе
        // плашка «X изменений» появится прямо за модалкой, на её же объекте).
        // После закрытия модалки Socket.flushPendingOwn() переносит их в
        // table, чтобы родительская таблица показала «Загрузить».
        this.pendingOwn = []
    }

    // Обновление строки
    ObjectUpdated({data, isModal, userId}) {
        // Своя правка В модалке — откладываем до её закрытия (см. flushPendingOwn).
        if (userId == data.changed_by && isModal) {
            this._enqueueOwn('update', data)
            return
        }

        this._applyUpdate(data)
    }

    _applyUpdate(data) {
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

    _enqueueOwn(kind, data) {
        // Если уже есть такая же отложенная правка — обновляем, не плодим.
        const idx = this.pendingOwn.findIndex(p => p.data.id == data.id)
        if (idx >= 0) this.pendingOwn[idx] = { kind, data }
        else this.pendingOwn.push({ kind, data })
    }

    flushPendingOwn() {
        if (!this.pendingOwn.length) return
        const batch = this.pendingOwn
        this.pendingOwn = []
        for (const item of batch) {
            if (item.kind === 'update') this._applyUpdate(item.data)
            else if (item.kind === 'create') {
                this.table.push({ row: item.data.viewList, state: 'create' })
            }
            else if (item.kind === 'delete') {
                let findedRow = this.table.find(row => row.id == item.data.id)
                if (findedRow) findedRow.state = 'delete'
                else this.table.push({ row: item.data.viewList, state: 'delete' })
            }
        }
    }

    ObjectCreated({data, isModal, userId}) {
        // Своё создание В модалке (например, «Скопировать» → сохранение нового
        // объекта) — откладываем до закрытия модалки, чтобы плашка не
        // появлялась прямо за модалкой. После закрытия flushPendingOwn
        // перенесёт правку в table и родительская таблица покажет «Загрузить».
        if (userId == data.changed_by && isModal) {
            this._enqueueOwn('create', data)
            return
        }

        this.table.push({
            row: data.viewList,
            state: 'create'
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