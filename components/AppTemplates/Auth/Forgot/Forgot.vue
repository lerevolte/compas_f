<template>
    <div class="auth__forgot">
        <AppH1>
            Восстановление пароля <br>
            {{ auth.domain }}
        </AppH1>

        <p class="auth__desc" v-if="!stages.stages[stages.activeStage].is_desc_in_form">
            {{ stages.stages[stages.activeStage].desc }}
        </p>

        <form class="auth__form" @submit.prevent>
            <p class="auth__desc" v-if="stages.stages[stages.activeStage].is_desc_in_form">
                {{ stages.stages[stages.activeStage].desc }}
            </p>

            <div class="auth__item" v-for="item in stages.stages[stages.activeStage].fields" :class="{'error': auth.error.forgot[item.key]}">
                <AppInput 
                    v-model="auth.formForgot[item.key]"
                    :options="{
                        id: item.id,
                        title: item.title,
                        type: item.showPassword ? 'text' :item.type,
                        name: item.name,
                        autocomplete: 'on',
                        placeholder: null
                    }"
                >
                    <IconShow v-if="item.showPassword != undefined" @click="item.showPassword = !item.showPassword" :class="{'icon_show_active': item.showPassword}"/>
                </AppInput>

                <AppError v-show="auth.error.forgot[item.key]">
                    {{ auth.error.forgot[item.key] }}
                </AppError>
            </div>
            <AppButton class="button_fill button_arrow" :class="{'skeleton': auth.loading}" type="submit"  @click="stages.changeStage(stages.activeStage + 1)">
                {{ stages.stages[stages.activeStage].button_text ?? 'Далее' }}

                <figure class='icon_button-arrow'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13"><title>Path 12</title><path fill="#fff" fill-rule="evenodd" d="M11.923 6.92.57 6.913a.566.566 0 0 1-.565-.57.577.577 0 0 1 .575-.573l11.328-.037-4.443-4.471a.6.6 0 0 1-.009-.84.573.573 0 0 1 .82-.009l5.595 5.59a.5.5 0 0 1-.001.709l-5.68 5.634a.59.59 0 0 1-.842-.013.617.617 0 0 1 .012-.862z"/></svg>
                </figure>
            </AppButton>
            <AppButton class="button_text" type="submit" v-if="stages.activeStage == 1" @click="stages.changeStage(stages.activeStage - 1)">
                {{ stages.activeStage == 1 ? 'Войти в портал' : 'Назад' }}
            </AppButton>
        </form>
    </div>
</template>

<script setup>
    import './Forgot.scss';
    
    import AppH1 from '@AppComponents/Headers/H1/H1.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import validate from '@/helpers/validate.js'
    import AppError from '@AppComponents/Error/Error.vue'
    import api from '@/helpers/api.js'
    import route from '@/helpers/routes.js'
    import { Common } from '@/helpers/classes.js'
    import IconShow from '@AppIcons/Actions/Show.vue'

    const auth = inject('auth')
    const router = useRoute()

    class Stages {
        constructor() {
            this.common = new Common()
            this.activeStage = 1
            this.stages = {
                1: {
                    desc: null,
                    button_text: 'Отправить письмо',
                    fields: [
                        {
                            id: 0,
                            name: 'email',
                            type: 'email',
                            title: 'Email',
                            key: 'email'
                        }
                    ]
                },
                2: {
                    desc: 'Для продолжения восстановления пароля на указанную почту было отправлено сообщение содержащее ссылку для дальнейших действий',
                    is_desc_in_form: true,
                    button_text: 'Вернуться',
                    fields: []
                },
                3: {
                    desc: null,
                    button_text: 'Восстановить пароль',
                    fields: [
                        {
                            id: 1,
                            name: 'password',
                            type: 'password',
                            title: 'Пароль',
                            key: 'password',
                            showPassword: false
                        },
                        {
                            id: 2,
                            name: 'password_confirmation',
                            type: 'password',
                            title: 'Повторите пароль',
                            key: 'password_confirmation',
                            showPassword: false
                        }
                    ]
                }
            }
        }

        // Изменение шага
        async changeStage(newStage) {
            auth.value.clearError()

            if (newStage > this.activeStage) {
                switch (this.activeStage) {
                    case 1:
                        if (!this.validateMail()) return

                        try {
                            auth.value.loading = true
                            let response = await api.callMethod("POST", route.auth.forgot, {
                                email: auth.value.formForgot.email
                            })

                            if (response.data.success == false) {
                                auth.value.error.forgot.email = response.data.data.email
                            } else {
                                this.activeStage++
                            }
                        } catch (error) {
                            console.log(error);
                        } finally {
                            auth.value.loading = false
                        }
                        break;
                        case 2:
                            auth.value.initEntry()
                        break;
                        case 3:
                            if (!this.validatePasswords()) return 
                            try {
                                auth.value.loading = true
                                let response = await api.callMethod("POST", route.auth.reset_password, auth.value.formForgot)

                                if (response.status == 200) {
                                    this.activeStage = 0
                                    auth.value.initEntry()
                                }

                                this.common.cleanUrl()
                            } catch (error) {
                                console.log(error);
                            } finally {
                                auth.value.loading = false
                            }
                            break;
                    default:
                        break;
                }
            } else {
                this.activeStage == 1 ? auth.value.initEntry() : this.activeStage--
            }
        }

        // Валидация почты
        validateMail() {
            if (!validate.checkEmptyValue(auth.value.formForgot.email)) {
                auth.value.error.forgot.email = 'Поле не заполнено'
                return false
            } else if (!validate.checkMail(auth.value.formForgot.email)) {
                auth.value.error.forgot.email = 'Поле заполнено некорректно'
                return false
            }

            return true
        }

        // Валидация паролей
        validatePasswords() {
            if (!validate.checkEmptyValue(auth.value.formForgot.password)) {
                auth.value.error.forgot.password = 'Поле не заполнено'
                return false
            }
            if (!validate.checkEmptyValue(auth.value.formForgot.password_confirmation)) {
                auth.value.error.forgot.password_confirmation = 'Поле не заполнено'
                return false
            }

            if (auth.value.formForgot.password.length < 8) {
                auth.value.error.forgot.password = 'Пароль не может быть короче 8 символов'
                return false
            }

            if (auth.value.formForgot.password_confirmation.length < 8) {
                auth.value.error.forgot.password_confirmation = 'Пароль не может быть короче 8 символов'
                return false
            }

            if (auth.value.formForgot.password_confirmation != auth.value.formForgot.password) {
                auth.value.error.forgot.password = 'Пароли не совпадают'
                auth.value.error.forgot.password_confirmation = 'Пароли не совпадают' 
                return false
            }

            return true
        }
    }

    const stages = ref(new Stages())

    onMounted(() => {
        if (router.query && router.query.token) {
            auth.value.formForgot.token = router.query.token
            auth.value.formForgot.email = router.query.email 
            stages.value.activeStage = 3
        }
    })
</script>
