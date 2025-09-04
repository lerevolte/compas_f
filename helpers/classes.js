import api from '@/helpers/api.js'
import 'vue3-toastify/dist/index.css';
import routes from '@/helpers/routes.js'

import contactsJSON from '/public/admin/contacts.js'
import localTableMeta from '/public/admin/localTableMeta.json'

import { toast } from 'vue3-toastify';
import { useCartStore } from '@/stores/cartStore.js'
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
                
                let response = this.common.validate({key: key, value: this.form[key]}, key)
                if (response.isError) {
                    this.errorLogs.push(response.logs)
                    isError = true
                }
            }                

            if (isError) return

            let response = await api.callMethod('POST', routes.auth.login, this.form)

            if (response.status == 400) {
                this.errorLogs = [
                    {
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
    constructor(slug, dependences) {
        this.content = {
            sortItem: {
                key: 'id',
                order: 'desc'
            },
            header: [],
            body: [],
            pages: {
                total: 0,
                current: 1
            },
            actions: [
                "edit",
                "delete"
            ]
        }

        this.tableModal = {
            create: [],
            edit: []
        }

        this.filter = new Filter(this)

        this.slug = slug
        this.loading = false
        this.localLoading = false
        this.modal = new Modal()
        this.dependences = dependences    
    }

    // Получение данных в таблице
    async get() {
        try {
            this.loading = true
            let response = await api.callMethod("GET", `/${this.slug}`)
            await this.set(response)
        } catch (error) {
            console.log(error);                
        } finally {
            this.loading = false
        }
    }

    // Установка контента
    async set(response) {
        this.content.body = response.data.data

        if (response.data.meta == undefined) {
            response.data.meta = localTableMeta
        }

        this.content.header = response.data.meta.fields.filter(p => p.show_in_table)
        this.content.pages = {
            current: response.data.meta.current_page,
            total: response.data.meta.last_page
        }
        this.filter.default.fields = response.data.meta.fields.map(p => {if (p.type === 'date') {p.multiple = true} return p}).filter(p => p.filterable)
        this.modal.fields.create = response.data.meta.fields.filter(p => p.create)
        this.modal.fields.edit = response.data.meta.fields
        this.content.actions = response.data.meta.actions
        this.filter.short.content = response.data.meta.tabs
    }

    // Сортировка таблицы
    async sort(item) {
        try {
            this.filter.filtering = true
            this.content.sortItem = item
            let response = await api.callMethod("GET", `/${this.slug}?sort=${this.content.sortItem.key}&order=${this.content.sortItem.order}${this.filter.default.query ? '&' + this.filter.default.query : ''}`)
            await this.set(response)
        } catch (error) {
            console.log(error);
        } finally {
            this.filter.filtering = false
        }
    }

    // Пагинация
    async changePage(page) {
        try {
            this.filter.filtering = true
            let response = await api.callMethod("GET", `/${this.slug}?page=${page}&sort=${this.content.sortItem.key}&order=${this.content.sortItem.order}${this.filter.default.query ? '&' + this.filter.default.query : ''}`)
            await this.set(response)
        } catch (error) {
            console.log(error);
        } finally {
            this.filter.filtering = false
        }
    }

    // Создание
    async create(row) {
        try {
            this.modal.loading = true

            let response = await api.callMethod("POST", `/${this.slug}`, row)

            if ([200, 201].includes(response.status)) {
                this.content.body.push(response.data.data)

                if (this.content.body.length >= 10) {
                    this.get()
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.toggleOpen(false)
            this.modal.loading = false
        }
    }

    // Редактирование
    async edit(row) {
        const initUpdate = () => {
            let request = {}

            this.modal.fields.edit.forEach(element => {
                if (element.edit) {
                    if (element.type == 'relation' && element.formatter != 'file') {
                        request[element.key] = row[element.key] ? {id: row[element.key]} : null
                    } else if ( element.formatter == 'file') {
                        request[element.key] = row[element.key] ? row[element.key][0] : row[element.key]
                    } else {
                        request[element.key] = row[element.key]
                    }
                }
            });

            return request
        }

        try {
            this.modal.loading = true

            let response = await api.callMethod("PUT", `/${this.slug.split('?')[0]}/${row.id}`, this.modal.isOpen ? initUpdate(row) : row)

            if ([200, 201].includes(response.status)) {
                let findedRow = this.content.body.findIndex(item => item.id == row.id)
                this.content.body[findedRow] = response.data.data
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.toggleOpen(false)
            this.modal.loading = false
        }
    }

    // Удаление
    async delete(rows) {
        try {
            this.modal.loading = true

            for (let row of rows) {
                await api.callMethod("DELETE", `/${this.slug.split('?')[0]}/${row.id}`)
                this.content.body = this.content.body.filter(item => item.id != row.id)
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.modal.toggleOpen(false)
            this.modal.loading = false
        }
    }

    // Сохранение загружаемого файла
    async saveUploadPrice(row) {
        if (row.price) {
            try {
                this.modal.loading = true
                await api.callMethod("POST", `/${this.dependences.suppliers.slug}/${row.id}/price`, {attachment: {id: row.price[0].id}})
                this.get()
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.loading = false
            }
            this.modal.toggleOpen(false)
        } else {
            this.modal.toggleOpen(false)
        }
    }
}

export class Filter {
    constructor(table) {
        this.setter = table
        this.filtering = false

        this.default = {
            fields: [],
            query: null,
        }

        this.short = {
            content:  [],
            values: []
        }
    }

    // Установка коротких фильтров
    async setShortFilters(item) {
        const setValue = (item) => {
            let fields = this.default.query?.split('&') ?? []

            if (fields.length > 0) {
                fields = fields.map(field => {
                    return {
                        key: field.split('=')[0].replaceAll('filter[', '').replaceAll(']', '').replaceAll('[', ''),
                        value: field.split('=')[1]
                    }
                })

                fields = fields.filter(p => this.short.values.findIndex(filter => filter.key == p.key) == -1 && p.value)
            }

            for (let tab of item) {
                if (tab.value.value) {
                    for (let tabFilter of tab.value.filters) {
                        if (Array.isArray(tabFilter.value)) {
                            for (let value of tabFilter.value) {
                                this.short.values.push({
                                    key: tab.key,
                                    value: String(value),
                                    operator: `[]${tabFilter.operator}`
                                })
                            }
                        } else {
                            this.short.values.push({
                                key: tab.key,
                                value: String(tabFilter.value),
                                operator: tabFilter.operator
                            })
                        }
                    }
                } else {
                    this.short.values = this.short.values.filter(p => p.key != tab.key)
                    fields = fields.filter(p => p.key != tab.key)
                }
            }

            return fields
        }

        try {
            this.short.values = this.short.values.filter(filter => item.findIndex(p => p.key == filter.key) == -1)
            let fields = setValue(item)
            this.filter(this.short.values.filter(p => p.value || p.value == 0).concat(fields))
        } catch (error) {
            console.log(error);
        }
    }

    // Фильтрация
    async filter(fields) {
        // Установка фильтра
        const setFilter = (fields) => {
            let response = []
            let operator = '='

            fields.forEach(field => {
                operator = field.operator ?? '='
                if (field.value.includes(' - ')) {
                    let value = field.value.split(' - ')
                    if (value[0] == value[1]) {
                        response.push(`filter[${field.key}]${operator}${value[0]}`)
                    } else {
                        response.push(`filter[${field.key}][]${operator}${value[0]}`)
                        response.push(`filter[${field.key}][]${operator}${value[1]}`)
                    }
                } else {
                    if (field.key == 'search') {
                        response.push(`filter[q]${operator}${field.value}`)
                    } else {
                        response.push(`filter[${field.key}]${operator}${field.value}`)
                    }
                }
            });

            return response.join('&')
        }
        
        try {
            this.filtering = true
            this.default.query = setFilter(fields)
            let response = await api.callMethod("GET", `/${this.setter.slug}${this.default.query ? '?' + this.default.query : ''}`)
            this.setter.set(response)
        } catch (error) {
            console.log(error);
        } finally {
            this.filtering = false
        }
    }
}