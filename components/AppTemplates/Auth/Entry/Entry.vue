<template>
    <div class="auth__entry">
        <AppH1>
            Вход на портал <br>
            {{ auth.domain }}
        </AppH1>

        <form class="auth__form" @submit.prevent>
            <div class="auth__item" :class="{'error': auth.error.entry.email}">
                <AppInput 
                    v-model="auth.formEntry.email"
                    :options="{
                        id: 0,
                        title: 'E-mail',
                        type: 'email',
                        name: 'email',
                        autocomplete: 'on',
                        placeholder: 'E-mail'
                    }"
                />
                <AppError v-show="auth.error.entry.email">
                    {{ auth.error.entry.email }}
                </AppError>
            </div>

            <div class="auth__item" :class="{'error': auth.error.entry.password}">
                <AppInput 
                    v-model="auth.formEntry.password"
                    :options="{
                        id: 0,
                        title: 'Пароль',
                        type: auth.isShowPassword ? 'text' : 'password',
                        name: 'password',
                        autocomplete: 'on',
                        placeholder: 'Пароль'
                    }"
                >
                    <IconShow @click="auth.isShowPassword = !auth.isShowPassword" :class="{'icon_show_active': auth.isShowPassword}"/>
                </AppInput>
                <AppError v-show="auth.error.entry.password">
                    {{ auth.error.entry.password }}
                </AppError>
            </div>
            <AppCheckbox 
                v-model="auth.formEntry.rememberMe"
                :options="{
                    title: 'Запомнить меня'
                }"
            />
            <AppButton class="button_fill button_arrow" :class="{'skeleton': auth.loading}" type="submit" @click="auth.logIn()">
                Войти

                <figure class='icon_button-arrow'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13"><title>Path 12</title><path fill="#fff" fill-rule="evenodd" d="M11.923 6.92.57 6.913a.566.566 0 0 1-.565-.57.577.577 0 0 1 .575-.573l11.328-.037-4.443-4.471a.6.6 0 0 1-.009-.84.573.573 0 0 1 .82-.009l5.595 5.59a.5.5 0 0 1-.001.709l-5.68 5.634a.59.59 0 0 1-.842-.013.617.617 0 0 1 .012-.862z"/></svg>
                </figure>
            </AppButton>

            <p class="auth__text auth__text_action" @click="auth.initForgot()">
                Восстановление пароля
            </p>
        </form>
    </div>
</template>

<script setup>
    import './Entry.scss';
    
    import AppH1 from '@AppComponents/Headers/H1/H1.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppButton from '@AppComponents/Button/Button.vue'
    import AppError from '@AppComponents/Error/Error.vue'
    import IconShow from '@AppIcons/Actions/Show.vue'
    import AppCheckbox from '@AppComponents/Inputs/Checkbox/Checkbox.vue'

    const auth = inject('auth')
</script>
