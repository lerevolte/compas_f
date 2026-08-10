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

    transformName(name, length) {
        const dotIndex = name.lastIndexOf('.');
        if (dotIndex === -1) return name;
        
        const response = name.slice(0, dotIndex);
        const ext = name.slice(dotIndex);
        
        return response.length <= length + 3 
          ? name 
          : `${response.slice(0, length)}...${response.slice(-3)}${ext}`;
      };

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


    cleanUrl() {
        if (window.location.search) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    };

    setQueryUrl(query) {
        const cleanUrl = window.location.origin + window.location.pathname + query;
        window.history.replaceState({}, document.title, cleanUrl);
    }

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
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text)
            } else {
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

    transformDate = (field, formatType = 'dd.MM.yyyy') => {
        if (Array.isArray(field)) {
            return `${format(field[0], formatType)} - ${format(field[1], formatType)}`
        } else {
            return format(field, formatType)
        }
    }

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

    copyLink(link) {
        this.copyText(link)
    }

    async copyExternalLink({slug, id}) {
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

    async initVirtualizer() {
        if (this._virtScope) {
            try {
                this._virtScope.stop()
            } catch (e) {}
            this._virtScope = null
        }
        await nextTick()

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

    getHeader(data, force = false) {
        if (!force && this.isChanged && Array.isArray(this.header) && this.header.length) return
        data = (data ?? []).filter(p => p.key !== 'clicked' && p.key !== 'iconDrag')
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

    getBody(data) {
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

    async setSortItem(item) {
        this.sortItem = item
    }

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
                    columns: emptyFields,
                    fields: emptyFields.map(column => column.title)
                })
            }
        }
        return errors
    }

    async save() {
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
                this.body = this.body.filter(row => row.id || (row.product_name && String(row.product_name).trim() !== ''))
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

    create(slug) {
        this.emit('openModal', {
            type: 'create',
            slug: slug ?? this.slug,
            id: 0
        })
    }

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

    async initDownloadExcel() {
        let response = null
        try {
            this.downloadExcelBuffer.state = true
            this.downloadExcelBuffer.loading = true

            let request = (this.filter?.query ?? '')
                .split('&')
                .filter(p => p && !p.startsWith('per_page=') && !p.startsWith('page='))

            if (!request.length) {
                request = [
                    `sort_field=${this.sortItem.sort_field}`,
                    `sort_order=${this.sortItem.sort_order}`
                ]
                if (this.dependences.state) {
                    for (let key of Object.keys(this.dependences.query)) {
                        if (key == 'trashed') {
                            request.push(`${key}=${this.dependences.query[key] ? 1 : 0}`)
                        } else if (Array.isArray(this.dependences.query[key])) {
                            for (let value of this.dependences.query[key]) {
                                request.push(`filter[${key}][]=${encodeURIComponent(value)}`)
                            }
                        } else {
                            request.push(`filter[${key}]=${encodeURIComponent(this.dependences.query[key])}`)
                        }
                    }
                }
            }

            request.push(...this.header.filter(p => p.key != 'isChoose' && p.key != 'actions' && p.enabled).map(p => {
                return `fields[]=${p.key}`
            }))

            response = await api.callMethod('GET', routes.table.download.replace('${slug}', this.slug) + `?${request.join('&')}`)
        } catch (error) {
            console.log('error_download_excel', error);
        } finally {
            this.downloadExcelBuffer.link = response?.data?.link ?? null
            this.downloadExcelBuffer.loading = false
        }
    }

    downloadExcel() {
        window.open(this.downloadExcelBuffer.link, '_blank')
        this.downloadExcelBuffer = {
            link: null,
            loading: false,
            state: false
        }
    }

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

    open(row, slug = null) {
        this.emit('openModal', {
            ...row, 
            slug: slug ?? row.related_table,
            type: 'open'
        })
    }

    initEdit() {
        this.edit(this.body.filter(item => item.isChoose))
    }

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

    initDelete(rows = []) {
        if (this.permissions?.delete_p === 'N') return
        rows = typeof rows == 'boolean' || rows.length == 0 ? this.body.filter(item => item.isChoose) : rows

        this.deleteBuffer = {
            list: Array.isArray(rows) ? rows : [rows],
            state: true,
            type: 'delete'
        }
        
    }

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

    initRestore(rows = []) {
        rows = typeof rows == 'boolean' || rows.length == 0 ? this.body.filter(item => item.isChoose) : rows 

        this.deleteBuffer = {
            list: Array.isArray(rows) ? rows : [rows],
            state: true,
            type: 'restore'
        }
    }

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

    async dragEnd(event) {
        document.body.classList.remove('body_unselected')
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

        await nextTick()
        if (!this.options?.isShort) {
            this.initVirtualizer()
            setTimeout(() => {
                if (scrollEl && scrollEl.scrollTop === 0 && savedTop > 0) scrollEl.scrollTop = savedTop
                if (scrollEl && scrollEl.scrollLeft === 0 && savedLeft > 0) scrollEl.scrollLeft = savedLeft
            }, 0)
        }

        this.emit('getData', this.body)
    }

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

    async saveSettings(role) {
        let method = this.slug == 'products' && this.options?.isLocalTable ? routes.table.update_products : routes.table.save_settings.replace('${slug}', this.slug)

        try {
            await api.callMethod('POST', role ? `${method}/${role}` : method, {
                sort_field: this.sortItem.sort_field,
                sort_order: this.sortItem.sort_order,
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

        if (this.header.some(p => typeof p.key === 'string' && p.key.startsWith('rel__'))) {
            await this.filter.get()
        }
    }

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
        newObj.edit = true
        newObj.isChoose = true
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

    async get(fields = null, saved_query = {}) {
        if (fields === null) {
            fields = this.appliedFields ?? []
        } else {
            this.appliedFields = fields
            if (saved_query?.page == null) {
                this.setter.pages.current = 1
            }
        }
        const setFilter = (fields, saved_query) => {
            let response = []

            if (saved_query) {
                const rawPerPage = Number(saved_query.per_page ?? this.setter.pages.limit)
                const perPage = [12, 25, 50, 100].includes(rawPerPage) ? rawPerPage : 25
                response.push(`per_page=${perPage}`)
                response.push(`page=${saved_query.page ?? this.setter.pages.current}`)
                const sortField = saved_query.sort_field ?? this.setter.sortItem.sort_field
                const sortOrder = saved_query.sort_order ?? this.setter.sortItem.sort_order
                if (sortField != null && sortField !== 'null') response.push(`sort_field=${sortField}`)
                if (sortOrder != null && sortOrder !== 'null') response.push(`sort_order=${sortOrder}`)
                const relKeys = (this.setter.header || [])
                    .filter(c => c && c.enabled && typeof c.key === 'string' && c.key.startsWith('rel__'))
                    .map(c => c.key)
                if (relKeys.length) response.push(`rel_fields=${encodeURIComponent(relKeys.join(','))}`)
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

    setSaves(saves) {
        this.saves = saves
    }

    async deleteSavedFilter(id) {
        this.saves = this.saves.filter(f => f.id != id)
        await api.callMethod('DELETE', routes.filter.delete.replace('${slug}', this.setter.slug) + `/${id}`)
    }

    async moveSavedFilters(list) {
        await api.callMethod('POST', routes.filter.move.replace('${slug}', this.setter.slug), {
            items: list
        })
    }

    async updateSavedFilter(filter) {
        await api.callMethod('PUT', routes.filter.edit.replace('${slug}', this.setter.slug) + `/${filter.id}`, {
            fields: filter.fields,
            title: filter.title,
            search: filter.search ? 1 : 0
        })

        this.saves[this.saves.findIndex(p => p.id == filter.id)] = filter
    }

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

    getSelectValue(field) {
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

    get(response) {
        this.events = {...this.events, ...response.history_events}
        this.fields = {...this.events, ...response.history_fields}
    }

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

    copyLink() {
        this.common.copyLink(window.location.href)
    }

    copyExternalLink({slug, id}) {
        this.common.copyExternalLink({slug: slug, id: id})
    }

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

    edit({isGlobalEdit}) {
        isGlobalEdit = true
    }

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

export class Columns {
    constructor() {
        this.list = {}
        this.hidden = []
    }

    get(response) {
        this.list = response.columns
        this.hidden = response.hidden_fields
    }
}

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

    async updateHidden() {
        await api.callMethod('POST', routes.detail.hidden_fields, {ids: this.hidden.map(p => p.id)})
    }

    async changeOrder(request) {
        await api.callMethod('POST', routes.detail.change_order_section, request)
    }

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

    cancel(value, columns, pageId, slug, emit, options) {
        for (let column in columns) {
            for (let section of columns[column]) {
                this.cancelEditAll(section)
            }
        }

        this.buffer.backup = []

        if (options?.isGlobalEdit) {
            emit('closeDetail', true)
        }
    }

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

        const idx = groupField.fields.findIndex(p => Number(p.id) === Number(movedFieldId))
        if (idx === -1) return
        groupField.fields.splice(idx, 1)

        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', groupField.id), {
            id: groupField.id,
            subfields: groupField.fields.map(p => p.id)
        })
    }
}

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

    close() {
        this.modal.state = false
    }

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

    initUpdate({field, hidden, section}) {
        const content = JSON.parse(JSON.stringify({
            ...field,
            section_id: section.id
        }))
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

    async delete({columns, emit}) {
        try {
            this.modal.loading = true
            await api.callMethod('DELETE', routes.detail.delete_field.replace('${id}', this.modal.content.id))
            const findedSection = this.common.findColumnSection(columns, this.modal.content.section_id)
            const index = findedSection.fields.findIndex(p => p.id == this.modal.content.id)
            if (index !== -1) {
                findedSection.fields.splice(index, 1)
            } else {
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

    async changeVisibleAlways({field}) {
        await api.callMethod('PUT', routes.detail.update_field.replace('${id}', field.id), field)
    }

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

    async hide({field, section, hidden}) {
        field.is_hidden = true
        field.edit = false
        if (this.section?.buffer) {
            this.section.buffer.backup = this.section.buffer.backup.filter(f => f.id != field.id)
        }
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
    
    getSelectValue(field) {
        const response = computed({
            get() {
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
    
    initChangeField(field, target, type = 'target') {
        if (!field.can_edit || field.type == 'text_group') return

        if (this._isDraggingField && type == 'target') return

        if (type == 'target' && typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return
        }

        if (type == 'target') {
            if (target.closest('.icon_drag') || target.closest('.field__settings') || target.closest('.blank__title')) return

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
                return
            } else if (field.type == 'file') {
                if (field.edit || (!target.classList.contains('file') && !target.classList.contains('file__values'))) return
            } else if (field.type == 'address') {
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

    dragStart(event) {
        this.dragger = event.target.closest('.column-fields')

        if (this.dragger) {
            this.dragger.classList.add('column-fields_dragging-field')
        }
        this._isDraggingField = true
        this._dragStartedAt = Date.now()
    }

    async dragEnd(event, options = {type: 'section'}) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }
        setTimeout(() => { this._isDraggingField = false }, 250)

        const sameContainer = event?.to && event?.from && event.to === event.from
        const toIsOuter = event?.to?.dataset?.tileType === 'section'
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

    async dragChange(event, options = {type: 'section'}, groupField) {
        if (this.dragger) {
            this.dragger.classList.remove('column-fields_dragging-field')
            this.dragger = null
        }

        if (options && options.type == 'field') {
            this.emit('actionSection', {action: 'dragGroupField', value: {groupField, event}})
            return
        }

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
            this.emit('actionSection', {action: 'dragCleanupAfterAdd', value: {fieldId}})
        }
    }

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

    getSelectedPoints(data) {
        this.machine_tasks.selectedAddresses = data
    }

    getRoutes(data) {
        this.map = data.map(row => row.address?.coords ?? [])
    }

    updateActiveDate(activeDate) {
        this.activeDate = format(activeDate, 'yyyy-MM-dd')
        this.machine_tasks.updatingCount++
        this.logistic_tasks.updatingCount++
        this.routes.updatingCount++
    }

    updateActiveRoute(activeRoute) {
        this.routes.id = activeRoute?.value[0]
        this.machine_tasks.route_id = activeRoute?.value[0]
        this.routes.updatingCount++
        this.machine_tasks.updatingCount++
    }

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

    endResize({section, height}) {
        section.height = height
        this.updateSections()
    }

    dragStart() {
        this.isDragging = true
    }

    dragEnd() {
        this.isDragging = false
        this.updateSections()
    }

    updateSections() {
        this._saveDeviceLayout()
    }

    initCreateRoute() {
        this.modal.state = true
    }

    async createRoute(content) {
        try {
            this.modal.loading = true
            const response = await api.callMethod('POST', routes.logistic.createRoute, {rows: [{
                ...content,
                date: this.activeDate
            }]})
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

        window.Echo.private(`tenant.${routes.tenant.split('.')[0]}`).listen('ObjectUpdated', (data) => this.ObjectUpdated(data))
        window.Echo.private(`tenant.${routes.tenant.split('.')[0]}`).listen('FieldUpdated', (data) => this.ObjectUpdated(data))
    }


    set({slug, id}) {
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
    }

    remove({slug, id}) {
        delete this.entities[slug].details[id]
    }

    flushPendingOwn() {
        for (const slug in this.entities) {
            const ent = this.entities[slug]
            if (ent && typeof ent.flushPendingOwn === 'function') {
                ent.flushPendingOwn()
            }
        }
    }

    ObjectUpdated(data) {
        console.log(data);

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

    FieldUpdated(data) {
        console.log('FieldUpdated', data);
    }
}

class socketObject {
    constructor() {
        this.table = []
        this.details = {}
        this.pendingOwn = []
    }

    ObjectUpdated({data, isModal, userId}) {
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
    }
}