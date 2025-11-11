<template>
    <div class="form__item form__item_file" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div class="file" v-if="props.options.edit">
            <FansyBox ref="fansyBoxRef" class="file__values" v-if="fileManager.previewUrl.length > 0">
                <draggable
                    tag="div"
                    :group="`${props.options.key}_${props.options.id}`"
                    v-model="fileManager.previewUrl" 
                    :forceFallback="true"
                    :fallbackOnBody="true"
                    item-key="file_image" 
                    class="file__values-list"
                    drag-class="draggable-drag"
                    ghost-class="draggable-ghost"
                    fallback-class="draggable-fallback"
                    :filter="'.show-more, .show-more *'"
                    @end="fileManager.dragEnd()"
                    :draggable="props.options.isDraggable ? '.file__image' : ''"
                >
                    <template #item="{ element: item }">
                        <div class="file__image">
                            <FansyBoxItem 
                                :id="`file_${props.options.id}`"
                                :image="{
                                    path: item.file,
                                    thumbnail_path: item.url
                                }"
                            />

                            <AppShowMore 
                                :options="fileManager.actions"
                                :isPreventBottom="true"
                                @initClick="action => fileManager[action](item)"
                            />
                        </div>
                    </template>
                </draggable>
            </FansyBox>
            <div class="file__upload">
                <input type="file" @change="fileManager.onFileChange" :multiple="props.options.multiple" :accept="props.options.accept ? props.options.accept.join(', ') : ['*']" />
                <figure class='ibg file__preview'>
                    <IconFile />
                </figure>
            </div>
        </div>

        <div class="file" :class="{'file_empty': fileManager.previewUrl.length == 0}" v-else>
            <FansyBox ref="fansyBoxRef" class="file__values" v-if="fileManager.previewUrl && fileManager.previewUrl.length > 0">
                <div class="file__image" v-for="item in fileManager.modal.state ? fileManager.modal.content.image : fileManager.previewUrl">
                    <FansyBoxItem 
                        :id="`file_${props.options.id}`"
                        :image="{
                            path: item.file,
                            thumbnail_path: item.url
                        }"
                    />
                    <AppShowMore 
                        :options="props.options.isModal ? fileManager.actions.filter(p => p.action != 'showMore') : fileManager.actions"
                        :isPreventBottom="true"
                        @initClick="action => fileManager[action](item)"
                    />
                </div>
            </FansyBox>
        </div>
        <AppError v-show="props.error.state">
            {{ props.error.text }}
        </AppError>


        <teleport to="#menu__overlay" v-if="fileManager.modal.state">
            <AppModalWarning 
                :options="{
                    title: fileManager.modal.title,
                    action: fileManager.modal.action,
                    actionTitle: fileManager.modal.actionTitle,
                    template: 'slot'
                }"
                :loading="fileManager.modal.loading"
                @update="fileManager.update()"
                @close="fileManager.modal.state = false"
            >
            <div class="modal__fields">
                <AppFile 
                    :options="{
                        edit: false,
                        isModal: true,
                        title: 'Изображение'
                    }"
                    v-model="fileManager.modal.content.image"
                />
                <AppBlank 
                    :item="{
                        title: 'Название',
                        text: fileManager.modal.content.name
                    }"
                />
                <AppBlank 
                    :item="{
                        title: 'Название файла',
                        text: fileManager.modal.content.file_name
                    }"
                />
            </div>
            </AppModalWarning>
        </teleport>
    </div>
  </template>

<script setup>
    import './File.scss';

    import draggable from 'vuedraggable';
    import routes from '@AppHelpers/routes'
    import IconFile from '@AppIcons/Input/File.vue'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import FansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import FansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppError from '@AppComponents/Error/Error.vue'

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
                 isModal: false,
                 isDraggable: false,
                 accept: ['*'],
                 query: {}
            },
            type: Object
        },
        modelValue: [Array, Object],
        error: {
            default: {
                state: false,
                text: ''
            },
            type: Object
        }
    })

    const emit = defineEmits([
        'update:modelValue'
    ])

    const fansyBoxRef = ref(null)

    class FileManager {
        constructor() {
            this.previewUrl = []
            this.loading = false
            this.actions = [
                {
                    name: 'Посмотреть',
                    action: 'check'
                },
                {
                    name: 'Подробная информация',
                    action: 'showMore'
                },
                {
                    name: 'Скачать',
                    action: 'download'
                },
                {
                    name: 'Удалить',
                    action: 'delete'
                }
            ]    
            this.modal = {
                state: false,
                title: 'Подробная информация',
                actionTitle: 'Принять',
                action: 'close',
                content: {
                    image: [],
                    name: '',
                    file_name: ''
                },
            }
        }

        // Получение превью из родителя
        get() {
            if (Array.isArray(props.modelValue)) {
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
                this.previewUrl = [...this.previewUrl, ...response]
                emit('update:modelValue', this.previewUrl);
            }
        }

        // Загрузка файла на сервер
        async uploadFiles(files, uploadUrl = routes.file.upload) {
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
                formData.append(`files[]`, file);
            });
    
            try {
                this.loading = true
                const response = await fetch(`${routes.domain}/api${props.options.query ? `${uploadUrl}?${new URLSearchParams(props.options.query).toString()}` : uploadUrl}`, {
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

        // Конец перетаскивания
        dragEnd() {
            emit('update:modelValue', this.previewUrl)
        }

        // Посмотреть
        check(file) {
            const index = this.previewUrl.findIndex(img => img.file === file.file);
            if (index !== -1 && fansyBoxRef.value) {
                const galleryId = `fansy-box__file_${props.options.id}`;
                const links = fansyBoxRef.value.fansyBoxRef.querySelectorAll(`[data-fancybox="${galleryId}"]`);
                if (links[index]) {
                    links[index].click();
                }
            }
        }

        // Подробная информация
        showMore(file) {
            this.modal.state = true
            this.modal.content = {
                ...file,
                image: [file],
                file_name: file.name
            }
        }

        // Скачать
        async download(file) {
            const imageSrc = file.file;
            const nameOfDownload = [null, undefined].includes(file.name) || file.name !== '' ? file.name : 'Без названия'

            try {
                const response = await fetch(imageSrc, {
                    method: 'GET',
                    headers: {
                        accept: 'application/json',
                    },
                });

                const blobImage = await response.blob();

                const href = URL.createObjectURL(blobImage);

                const anchorElement = document.createElement('a');
                anchorElement.href = href;
                anchorElement.download = nameOfDownload;

                document.body.appendChild(anchorElement);
                anchorElement.click();

                document.body.removeChild(anchorElement);
                window.URL.revokeObjectURL(href);
            } catch (error) {
                console.log(error);
            }
        }

        //  Скачать
        delete(file) {
            this.previewUrl = this.previewUrl.filter(f => f.id != file.id)
            emit('update:modelValue', this.previewUrl.filter(f => f.id != file.id))
        }
    }

    const fileManager = ref(new FileManager())

    onMounted(() => {
        fileManager.value.get()
    })

</script>
