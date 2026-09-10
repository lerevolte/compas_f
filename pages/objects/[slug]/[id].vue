<template>
    <main>
      <AppDetail
          v-if="ready"
          :id="router.params.id"
          :slug="router.params.slug"
          @openModal="item => emit('openModal', item)"
          @closeDetail="item => emit('closeDetail', item)"
          @updateMetaHeader="item => updateMetaHeader(item)"
      />
    </main>
</template>

<script setup>
    import AppDetail from '@AppTemplates/Detail/Detail.vue';
    import api from '@/helpers/api.js'
    import routes from '@/helpers/routes.js'
    import { Common } from '@AppHelpers/classes.js'

    const router = useRoute()

    const ATTACH_RESULT_KEY = 'attach_employee_result'

    const ready = ref(!router.query.attach_employee)

    const showAttachResult = (common, result) => {
        if (result === 'attached') {
            common.showNotification({ title: 'Готово', description: 'Вы добавлены в поле «Сотрудник»' }, 'success')
        } else if (result === 'exists') {
            common.showNotification({ title: 'Вы уже привязаны', description: 'Пользователь уже есть в поле «Сотрудник»' }, 'default')
        } else if (result) {
            common.showNotification({ title: 'Не удалось привязаться', description: result.replace(/^error:/, '') }, 'error')
        }
    }

    onMounted(async () => {
        const common = new Common()
        if (ready.value) {
            try {
                const stored = sessionStorage.getItem(ATTACH_RESULT_KEY)
                if (stored) {
                    sessionStorage.removeItem(ATTACH_RESULT_KEY)
                    showAttachResult(common, stored)
                }
            } catch (e) {}
            return
        }
        let result = ''
        try {
            const url = routes.detail.attach_employee
                .replace('${slug}', router.params.slug)
                .replace('${id}', router.params.id)
            const response = await api.callMethod('POST', url)
            if (response?.status == 401) return
            if (response?.status == 200 && response.data?.attached) {
                result = 'attached'
            } else if (response?.status == 200) {
                result = 'exists'
            } else {
                result = 'error:' + (response?.data?.message ?? '')
            }
        } catch (e) {
            result = 'error:'
        }
        try {
            sessionStorage.setItem(ATTACH_RESULT_KEY, result)
        } catch (e) {}
        window.location.replace(window.location.origin + window.location.pathname)
    })

    const updateMetaHeader = (item) => {
      if (item?.href?.slug && item?.href?.id) {
        window.history.replaceState(window.history.state, document.title, window.location.origin + `/objects/${item.href.slug}/${item.href.id}`)
      }
      useHead({
        title: item?.title
      })
    }

    const emit = defineEmits([
      'openModal',
      'closeDetail'
	])
</script>
