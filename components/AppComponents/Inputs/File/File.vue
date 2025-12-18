<template>
    <div class="form__item form__item_file" :class="{'error': props.error.state}">
        <label class="blank__title" :for="props.options.id" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div class="file" v-if="props.options.edit">
            <FansyBox ref="fansyBoxRef" class="file__values">
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
                    :draggable="props.options.isDraggable ? '.file__image' : '.'"
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

                            <div class="file__name" v-show="props.options.show_file_name">
                                {{ common.transformName(item.display_name ?? item.name ?? '', 15) }}
                            </div>

                            <AppShowMore 
                                :options="fileManager.actions"
                                :isPreventBottom="true"
                                @initClick="action => fileManager[action](item)"
                            />
                        </div>
                    </template>
                    <template #footer>
                        <div class="file__upload">
                            <input type="file" @change="fileManager.onFileChange" :multiple="props.options.multiple" :accept="props.options.accept ? props.options.accept.join(', ') : ['*']" />
                            <div class="file__preview">
                                <IconFile />
                                <div class="file__upload-text" v-if="props.options.button_name">
                                    {{ props.options.button_name }}
                                </div>
                            </div>
                        </div>
                    </template>
                </draggable>
            </FansyBox>
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
                    <div class="file__name" v-show="props.options.show_file_name">
                        {{ common.transformName(item.display_name ?? item.name ?? '', 15) }}
                    </div>
                    <AppShowMore 
                        :options="props.options.isModal ? fileManager.actions.filter(p => p.action != 'showMore' && p.action != 'delete') : fileManager.actions"
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
                @updateFile="fileManager.updateFile()"
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
                    class="blank_static"
                    :item="{
                        title: 'Название',
                        text: fileManager.modal.content.name
                    }"
                />

                <AppInput 
                    v-if="fileManager.modal.edit"
                    v-model="fileManager.modal.content.display_name"
                    :options="{
                        id: 0,
                        title: 'Название файла',
                        type: 'text',
                        focus: true
                    }"
                />
                <AppBlank 
                    v-else
                    :item="{
                        title: 'Название файла',
                        text: fileManager.modal.content.display_name
                    }"
                    @click="() => fileManager.modal.edit = true"
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
    import { Common } from '@AppHelpers/classes.js'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import FansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import FansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
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
                query: {
                    field_id: 0,
                    page_id: 0,
                    slug: null
                }
            },
            type: Object
        },
        modelValue: [Array, Object, String],
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
    const common = new Common()

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
                action: 'updateFile',
                content: {
                    image: [],
                    name: '',
                    display_name: ''
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
            this.modal.edit = false
            this.modal.content = {
                ...file,
                image: [file],
                display_name: file?.display_name ?? file?.name
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

        async updateFile() {
            try {
                this.modal.loading = true
                let request = this.previewUrl.map(file => {
                    return {
                        ...file,
                        display_name: this.modal.content.id == file.id ? this.modal.content.display_name : file.display_name
                    }
                })
                emit('update:modelValue', request)
                await common.updateFileName({slug: props.options.query.slug, id: props.options.query.page_id, field: {key: props.options.key, value: request}})
            } catch (error) {
                console.log(error);
            } finally {
                this.modal.loading = false
                this.modal.state = false
            }
        }
    }

    const fileManager = ref(new FileManager())

    onMounted(() => {
        fileManager.value.get()
    })

    watch(() => props.modelValue, () => {
        fileManager.value.get()
    })
</script>
