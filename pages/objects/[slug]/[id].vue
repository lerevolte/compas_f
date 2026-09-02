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

    const ready = ref(!router.query.attach_employee)

    onMounted(async () => {
        if (ready.value) return
        const common = new Common()
        try {
            const url = routes.detail.attach_employee
                .replace('${slug}', router.params.slug)
                .replace('${id}', router.params.id)
            const response = await api.callMethod('POST', url)
            if (response?.status == 200 && response.data?.attached) {
                common.showNotification({ title: 'Готово', description: 'Вы добавлены в поле «Сотрудник»' }, 'success')
            } else if (response?.status == 200) {
                common.showNotification({ title: 'Вы уже привязаны', description: 'Пользователь уже есть в поле «Сотрудник»' }, 'default')
            } else {
                common.showNotification({ title: 'Не удалось привязаться', description: response?.data?.message ?? '' }, 'error')
            }
        } catch (e) {
            console.log(e)
        } finally {
            common.cleanUrl()
            ready.value = true
        }
    })

    const updateMetaHeader = (item) => {
      useHead({
        title: item?.title
      })
    }

    const emit = defineEmits([
      'openModal',
      'closeDetail'
	])
</script>
