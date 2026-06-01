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
                                    path: item.file ?? null,
                                    thumbnail_path: item.url ?? null
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
                        <div class="file__upload" v-for="progress in fileManager.uploadProgress" :key="progress.id">
                            <div class="file__preview">
                                {{ progress.percent }}
                                <IconFileLoader :progress="progress.percent" />
                            </div>
                        </div>
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
                            path: item.file ?? item.url,
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

                <AppInput
                    v-if="fileManager.modal.edit"
                    v-model="fileManager.modal.content.display_name"
                    :options="{
                        id: 0,
                        title: 'Название',
                        type: 'text',
                        focus: true
                    }"
                />
                <AppBlank
                    v-else
                    :item="{
                        title: 'Название',
                        text: fileManager.modal.content.display_name
                    }"
                    @click="() => fileManager.modal.edit = true"
                />

                <AppBlank
                    class="blank_static"
                    :item="{
                        title: 'Название файла',
                        text: fileManager.modal.content.name
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
    import { Common } from '@AppHelpers/classes.js'
    import AppBlank from '@AppComponents/Blank/Blank.vue'
    import AppFile from '@AppComponents/Inputs/File/File.vue'
    import AppShowMore from '@AppComponents/ShowMore/ShowMore.vue'
    import FansyBox from '@AppComponents/FansyBox/FansyBox.vue'
    import FansyBoxItem from '@AppComponents/FansyBox/Item/Item.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'
    import AppInput from '@AppComponents/Inputs/Input/Input.vue'
    import AppError from '@AppComponents/Error/Error.vue'
    import IconFileLoader from '@AppIcons/Input/FileLoader.vue'

    import { nextTick } from 'vue'
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
        'update:modelValue',
        'update-file-info'
    ])

    const fansyBoxRef = ref(null)
    const common = new Common()

    class FileManager {
        constructor() {
            this.previewUrl = []
            this.loading = false
            this.uploadProgress = []
            this.actions = [
                {
                    name: 'Посмотреть',
                    action: 'check',
                    enabled: true
                },
                {
                    name: 'Подробная информация',
                    action: 'showMore',
                    enabled: true
                },
                {
                    name: 'Скачать',
                    action: 'download',
                    enabled: true
                },
                {
                    name: 'Удалить',
                    action: 'delete',
                    enabled: true
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

            if (files.length > 0) {
                try {
                    this.loading = true;
                    
                    // Создаем прогресс-бары для всех файлов сразу
                    const fileIdMap = new Map(); // Мапа для связи fileId с файлом
                    const uploadPromises = files.map((file, i) => {
                        const fileId = `file_${Date.now()}_${i}_${Math.random()}`;
                        
                        // Сохраняем связь fileId с файлом
                        fileIdMap.set(fileId, file);
                        
                        // Добавляем прогресс для этого файла
                        this.uploadProgress.push({
                            id: fileId,
                            fileName: file.name,
                            percent: 0
                        });
                        
                        // Загружаем файл и возвращаем промис с fileId
                        return this.uploadSingleFile(file, fileId)
                            .then(response => {
                                return { fileId, response };
                            })
                            .catch(error => {
                                console.error(`Ошибка загрузки файла ${file.name}:`, error);
                                // Удаляем прогресс при ошибке сразу
                                const index = this.uploadProgress.findIndex(p => p.id === fileId);
                                if (index !== -1) {
                                    this.uploadProgress.splice(index, 1);
                                }
                                return { fileId, response: null };
                            });
                    });
                    
                    // Загружаем все файлы параллельно
                    const results = await Promise.all(uploadPromises);
                    
                    // Собираем все успешные ответы и удаляем прогресс после добавления в previewUrl
                    const allResponses = [];
                    results.forEach(({ fileId, response }) => {
                        if (response && Array.isArray(response)) {
                            allResponses.push(...response);
                        } else if (response) {
                            allResponses.push(response);
                        }
                    });
                    
                    if (allResponses.length > 0) {
                        this.previewUrl = [...this.previewUrl, ...allResponses]
                        emit('update:modelValue', this.previewUrl);
                        
                        // Удаляем прогресс-бары только после того, как файлы отобразились на экране
                        // Используем nextTick, чтобы дождаться обновления DOM
                        await nextTick();
                        results.forEach(({ fileId, response }) => {
                            if (response) {
                                // Удаляем прогресс только для успешно загруженных файлов
                                const index = this.uploadProgress.findIndex(p => p.id === fileId);
                                if (index !== -1) {
                                    this.uploadProgress.splice(index, 1);
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Ошибка загрузки файлов:', error);
                } finally {
                    this.loading = false;
                }
            }
        }

        // Загрузка одного файла на сервер
        async uploadSingleFile(file, fileId, uploadUrl = routes.file.upload) {
            if (!file) {
                console.error('Нет файла для загрузки');
                return null;
            }
    
            const formData = new FormData();
            formData.append(`files[]`, file);
    
            return new Promise((resolve, reject) => {
                try {
                    const url = `${routes.domain}/api${props.options.query ? `${uploadUrl}?${new URLSearchParams(props.options.query).toString()}` : uploadUrl}`
                    
                    const xhr = new XMLHttpRequest();
                    
                    // Отслеживание прогресса загрузки
                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = Math.round((event.loaded / event.total) * 100);
                            // Обновляем прогресс для конкретного файла
                            const progressItem = this.uploadProgress.find(p => p.id === fileId);
                            if (progressItem) {
                                progressItem.percent = percentComplete;
                            }
                        }
                    });
                    
                    // Обработка успешной загрузки
                    xhr.addEventListener('load', () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(response);
                            } catch (e) {
                                reject(new Error('Ошибка парсинга ответа сервера'));
                            }
                        } else {
                            reject(new Error(`Ошибка загрузки: ${xhr.statusText}`));
                        }
                    });
                    
                    // Обработка ошибок
                    xhr.addEventListener('error', () => {
                        reject(new Error('Ошибка сети'));
                    });
                    
                    // Обработка отмены
                    xhr.addEventListener('abort', () => {
                        reject(new Error('Загрузка отменена'));
                    });
                    
                    // Отправка запроса
                    xhr.open('POST', url);
                    xhr.setRequestHeader('Authorization', `Bearer ${userStore.token}`);
                    xhr.send(formData);
                    
                } catch (error) {
                    console.error('Ошибка:', error);
                    reject(error);
                }
            });
        }

        // Загрузка файлов на сервер (старый метод для обратной совместимости)
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
    
            return new Promise((resolve, reject) => {
                try {
                    this.loading = true

                    const url = `${routes.domain}/api${props.options.query ? `${uploadUrl}?${new URLSearchParams(props.options.query).toString()}` : uploadUrl}`
                    
                    const xhr = new XMLHttpRequest();
                    
                    // Обработка успешной загрузки
                    xhr.addEventListener('load', () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(response);
                            } catch (e) {
                                reject(new Error('Ошибка парсинга ответа сервера'));
                            }
                        } else {
                            reject(new Error(`Ошибка загрузки: ${xhr.statusText}`));
                        }
                    });
                    
                    // Обработка ошибок
                    xhr.addEventListener('error', () => {
                        reject(new Error('Ошибка сети'));
                    });
                    
                    // Обработка отмены
                    xhr.addEventListener('abort', () => {
                        reject(new Error('Загрузка отменена'));
                    });
                    
                    // Отправка запроса
                    xhr.open('POST', url);
                    xhr.setRequestHeader('Authorization', `Bearer ${userStore.token}`);
                    xhr.send(formData);
                    
                } catch (error) {
                    console.error('Ошибка:', error);
                    reject(error);
                } finally {
                    this.loading = false
                }
            });
        }

        // Конец перетаскивания
        dragEnd() {
            emit('update:modelValue', this.previewUrl)
        }

        // Посмотреть
        check(file) {
            const index = this.previewUrl.findIndex(img => img.file === file.file);
            if (index !== -1 && fansyBoxRef.value) {
                // Берём все ссылки по порядку: у документов (pdf/excel) нет data-fancybox,
                // поэтому селектор по классу сохраняет соответствие индексов с previewUrl.
                const links = fansyBoxRef.value.fansyBoxRef.querySelectorAll('.fancybox-item__link');
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
                // Используем отдельный эмит, чтобы родитель НЕ ставил поле в edit
                // (update:modelValue в TileSection триггерит initChangeField → field.edit = true).
                emit('update-file-info', request)
                this.previewUrl = request
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
