<template>
    <div class="container">
        <div class="auth">
            <div class="auth__content">
                <Entry v-if="auth.stage === 'entry'"/>
                <Forgot v-else-if="auth.stage === 'forgot'"/>
            </div>
            <div class="auth__footer">
                <p class="auth__text">
                    Открыть сайт
                </p>
                <a href="https://compas.pro/" target="_blank" class="auth__link">
                    Compas.pro
                </a>
            </div>
        </div>
    </div>
</template>

<script setup>
    import './Auth.scss';
    
    import Entry from './Entry/Entry.vue'
    import Forgot from './Forgot/Forgot.vue'
    import validate from '@/helpers/validate.js'
    import api from '@/helpers/api.js'
    import route from '@/helpers/routes.js'
    import { useUserStore } from '@/stores/userStore.js'
    import { useMenuStore } from '@/stores/menuStore.js'
    const menuStore = useMenuStore()
    const userStore = useUserStore()
    
    const router = useRoute()

    class Auth {
        constructor() {
            this.domain = '',
            this.stage = 'entry',
            this.isShowPassword = false
            this.loading = false,
            this.error = {
                entry: {
                    email: null,
                    password: null
                },
                forgot: {
                    email: null,
                    token: null,
                    password: null,
                    password_confirmation: null
                }
            }
            this.formEntry = {
                email: null,
                password: null,
                rememberMe: false
            }
            this.formForgot = {
                email: null,
                token: null,
                password: null,
                password_confirmation: null
            }
        }

        // Войти в приложение
        async logIn() {
            if (this.validateEntry()) return

            try {
                this.loading = true
                let response = await api.callMethod("POST", route.auth.login, this.formEntry)

                if (response.data.success == false) {
                    this.error.entry.password = response.data.data.password ?? null
                    this.error.entry.email = response.data.data.email ? Array.isArray(response.data.data.email) ? response.data.data.email.join(', ') : response.data.data.email : null
                } else {
                    userStore.token = response.data.token
                    await userStore.get()
                    await menuStore.get()
                    navigateTo('/')
                }
            } catch (error) {
                console.log('error', error);
            } finally {
                this.loading = false
            }
        }

        // Инициализация восстановления пароля
        initForgot() {
            this.stage = 'forgot';
            this.clearForms()
        }

        // Инициализация входа
        initEntry() {
            this.loading = false
            this.stage = 'entry';
            this.clearForms()
        }

        // Валидация входа
        validateEntry() {
            let flagError = false
            this.clearError()
            if (!validate.checkEmptyValue(this.formEntry.email)) {
                flagError = true
                this.error.entry.email = 'Поле не заполнено'    
            }
            if (!validate.checkEmptyValue(this.formEntry.password)) {
                flagError = true
                this.error.entry.password = 'Поле не заполнено'    
            } 

            return flagError
        }

        // Очистка форм
        clearForms() {
            this.formForgot = {
                email: null,
                token: null,
                password: null,
                password_confirmation: null
            }
            this.formEntry = {
                email: null,
                password: null,
                rememberMe: false
            }
            this.error = {
                entry: {
                    email: null,
                    password: null
                },
                forgot: {
                    email: null,
                    token: null,
                    password: null,
                    password_confirmation: null
                }
            }
        }

        // Очистка ошибок
        clearError() {
            this.error = {
                entry: {
                    email: null,
                    password: null
                },
                forgot: {
                    email: null,
                    token: null,
                    password: null,
                    password_confirmation: null
                }
            }
        }
    }

    const auth = ref(new Auth());

    onMounted(() => {
        if (process.client) {
            auth.value.domain = process.env.NODE_ENV == 'development' ? 'opt6.beta-compas.ru' : window.location.hostname
        }

        if (router.query.action && router.query.action == 'forgot') {
            auth.value.initForgot()
        }
    })

    provide('auth', auth);
</script>
