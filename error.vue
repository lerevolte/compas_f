<template>
    <div class="error-page">
        <div class="error-page__content">
            <div class="error-page__code">{{ statusCode }}</div>
            <h1 class="error-page__title">{{ title }}</h1>
            <p class="error-page__text">{{ text }}</p>
            <div class="error-page__actions">
                <button class="error-page__button" @click="goHome">
                    Вернуться на главную
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    const props = defineProps({
        error: {
            default: null,
            type: Object
        }
    })

    const statusCode = computed(() => props.error?.statusCode ?? 500)

    const title = computed(() => {
        if (statusCode.value == 403) return 'Доступ запрещён'
        if (statusCode.value == 404) return 'Страница не найдена'
        return 'Что-то пошло не так'
    })

    const text = computed(() => {
        if (statusCode.value == 403) return 'У вас нет прав для просмотра этой страницы. Обратитесь к администратору портала, чтобы получить доступ.'
        if (statusCode.value == 404) return 'Такой страницы не существует или она была удалена.'
        return 'Произошла ошибка. Попробуйте обновить страницу или вернуться на главную.'
    })

    useHead({
        title: computed(() => `${title.value} | Compas.pro`)
    })

    const goHome = () => {
        clearError({ redirect: '/' })
    }
</script>

<style lang="scss">
    @use '@/assets/variables.scss' as variables;

    .error-page {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        min-height: 100dvh;
        padding: 20px;
        font-family: PT Sans;
        background: variables.$color-background;

        .error-page__content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 460px;
        }

        .error-page__code {
            font-size: 120px;
            line-height: 1;
            font-weight: 700;
            color: variables.$color-icon;
        }

        .error-page__title {
            margin-top: 15px;
            font-size: variables.$font-size-h2;
            font-weight: 700;
            color: variables.$color-black;
        }

        .error-page__text {
            margin-top: 10px;
            font-size: variables.$font-size-default;
            line-height: 1.4;
            color: variables.$color-scroll;
        }

        .error-page__actions {
            margin-top: 25px;
        }

        .error-page__button {
            padding: 10px 25px;
            border-radius: 10px;
            border: none;
            font-size: variables.$font-size-default;
            font-family: PT Sans;
            color: variables.$color-white;
            background: variables.$button-fill;

            &:hover {
                background: variables.$color-hover;
            }
        }
    }
</style>
