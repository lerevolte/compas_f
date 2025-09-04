<template>
    <div class="form__item form__item_file">
        <label :for="props.options.id">
            {{ props.options.title }}
        </label>

        <div class="file">
            <FansyBox class="file__values" v-if="fileManager.previewUrl.length > 0">
                <FansyBoxItem 
                    v-for="item in fileManager.previewUrl"
                    :image="item"
                />
            </FansyBox>
            <div class="file__upload">
                <input type="file" @change="fileManager.onFileChange" :multiple="props.options.multiple" :accept="props.options.accept ? props.options.accept.join(', ') : ['*']" />
                <figure class='ibg file__preview'>
                    <IconFile />
                </figure>
            </div>
        </div>
    </div>
  </template>

<script setup>
    import './File.scss';

    import IconFile from '@AppIcons/Input/File.vue'
    import AppHelpers from '@AppHelpers/routes'
    import FansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import FansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'

    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()    

    const props = defineProps({
        options: {
            default: {
                 id: 0,
                 title: '',
                 name: '',
                 autocomplete: 'on',
                 placeholder: '',
                 multiple: false,
                 accept: ['*']
            },
            type: Object
        },
        modelValue: [Array, Object]
    })

    const emit = defineEmits([
        'update:modelValue'
    ])


    class FileManager {
        constructor() {
            this.previewUrl = []
            this.loading = false
        }

        // Получение превью из родителя
        get() {
            if (Array.isArray(props.modelValue) && props.modelValue.length > 0) {
                this.previewUrl = JSON.parse(JSON.stringify(props.modelValue))
            } else {
                this.previewUrl = props.modelValue ? JSON.parse(JSON.stringify([props.modelValue])) : []
            }
        }

        // Изменение файла
        async onFileChange(event) {
            const files = Array.from(event.target.files);
            let response = null

            if (files.length > 0) {
                response = await this.uploadFiles(files);
                
                this.previewUrl = []
                files.forEach(element => {
                    this.previewUrl.push(response.data)
                });
                emit('update:modelValue', this.previewUrl);
            }
        }

        // Загрузка файла на сервер
        async uploadFiles(files, uploadUrl = AppHelpers.file.upload) {
            if (!files || files.length === 0) {
                console.error('Нет файлов для загрузки');
                return null;
            }
    
            const formData = new FormData();
            
            if (files instanceof FileList) {
                files = Array.from(files);
            }
    
            // Добавляем файлы в formData
            files.forEach((file, index) => {
                formData.append(`file`, file);
            });
    
            try {
                this.loading = true
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${userStore.token}`
                    }
                });
    
                if (!response.ok) {
                    throw new Error(`Ошибка загрузки: ${response.statusText}`);
                }
    
                return await response.json(); // Возвращаем JSON-ответ сервера
            } catch (error) {
                console.error('Ошибка:', error);
                return null;
            } finally {
                this.loading = false
            }
        }
    }

    const fileManager = ref(new FileManager())

    onMounted(() => {
        fileManager.value.get()
    })

</script>
