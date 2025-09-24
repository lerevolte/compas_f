import api from '@/helpers/api.js'
import 'vue3-toastify/dist/index.css';
import routes from '@/helpers/routes.js'
import { ref, onMounted, onBeforeUnmount } from 'vue'

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
        } 
        catch (error) {
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