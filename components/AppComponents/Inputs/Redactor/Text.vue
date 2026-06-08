<template>
    <div class="redactor-text">
        <div class="redactor-text__toolbar">
            <button type="button" class="redactor-text__btn" title="Заголовок H2" :disabled="isHtml" @mousedown.prevent="format('h2')"><b>H2</b></button>
            <button type="button" class="redactor-text__btn" title="Заголовок H3" :disabled="isHtml" @mousedown.prevent="format('h3')"><b>H3</b></button>
            <button type="button" class="redactor-text__btn" title="Абзац" :disabled="isHtml" @mousedown.prevent="format('p')">¶</button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Полужирный" :disabled="isHtml" @mousedown.prevent="cmd('bold')"><b>Ж</b></button>
            <button type="button" class="redactor-text__btn" title="Курсив" :disabled="isHtml" @mousedown.prevent="cmd('italic')"><i>К</i></button>
            <button type="button" class="redactor-text__btn" title="Подчёркнутый" :disabled="isHtml" @mousedown.prevent="cmd('underline')"><u>Ч</u></button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Маркированный список" :disabled="isHtml" @mousedown.prevent="cmd('insertUnorderedList')">•</button>
            <button type="button" class="redactor-text__btn" title="Нумерованный список" :disabled="isHtml" @mousedown.prevent="cmd('insertOrderedList')">1.</button>
            <button type="button" class="redactor-text__btn" title="Ссылка" :disabled="isHtml" @mousedown.prevent="insertLink">🔗</button>
            <button type="button" class="redactor-text__btn" title="Изображение" :disabled="isHtml || uploading" @mousedown.prevent="insertImage">
                <span v-if="uploading">…</span>
                <span v-else>🖼️</span>
            </button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Очистить форматирование" :disabled="isHtml" @mousedown.prevent="cmd('removeFormat')">⌫</button>
            <button
                type="button"
                class="redactor-text__btn redactor-text__btn_code"
                :class="{ 'redactor-text__btn_active': isHtml }"
                title="Редактировать HTML"
                @mousedown.prevent="toggleHtml"
            >&lt;/&gt;</button>
        </div>
        <div
            v-show="!isHtml"
            ref="editorRef"
            class="redactor-text__editor"
            contenteditable="true"
            @input="onInput"
            @blur="onInput"
        ></div>
        <textarea
            v-show="isHtml"
            ref="htmlRef"
            class="redactor-text__editor redactor-text__editor_html"
            spellcheck="false"
            :value="htmlValue"
            @input="onHtmlInput"
        ></textarea>
    </div>
</template>

<script setup>
    import './Redactor.scss'
    import { ref, onMounted, watch, nextTick } from 'vue'
    import routes from '@AppHelpers/routes'
    import { useUserStore } from '@/stores/userStore.js'

    const userStore = useUserStore()

    const props = defineProps({
        modelValue: {
            default: '',
            type: String
        }
    })

    const emit = defineEmits(['update:modelValue'])

    const editorRef = ref(null)
    const htmlRef = ref(null)

    const isHtml = ref(false)
    const htmlValue = ref('')
    const uploading = ref(false)

    // Сохранённый диапазон выделения — чтобы вставить картинку туда, где
    // стояла каретка, даже после открытия диалога выбора файла.
    let savedRange = null

    onMounted(() => {
        if (editorRef.value) {
            editorRef.value.innerHTML = props.modelValue || ''
        }
    })

    // Внешнее обновление значения (отмена/сброс) — синхронизируем DOM,
    // но не трогаем редактор, пока в нём фокус, чтобы не сбивать каретку.
    watch(() => props.modelValue, (value) => {
        if (isHtml.value) return
        if (!editorRef.value) return
        if (typeof document !== 'undefined' && document.activeElement === editorRef.value) return
        if (editorRef.value.innerHTML !== (value || '')) {
            editorRef.value.innerHTML = value || ''
        }
    })

    function onInput() {
        if (editorRef.value) {
            emit('update:modelValue', editorRef.value.innerHTML)
        }
    }

    function cmd(command, value = null) {
        if (typeof document === 'undefined') return
        editorRef.value?.focus()
        document.execCommand(command, false, value)
        onInput()
    }

    function format(tag) {
        cmd('formatBlock', tag.toUpperCase())
    }

    function insertLink() {
        if (typeof window === 'undefined') return
        const url = window.prompt('Введите ссылку', 'https://')
        if (url) {
            cmd('createLink', url)
        }
    }

    // --- Режим HTML ---

    function toggleHtml() {
        if (!isHtml.value) {
            // Визуальный -> HTML: показываем текущую разметку.
            htmlValue.value = editorRef.value ? editorRef.value.innerHTML : (props.modelValue || '')
            isHtml.value = true
        } else {
            // HTML -> визуальный: переносим правки обратно в редактор.
            isHtml.value = false
            nextTick(() => {
                if (editorRef.value) {
                    editorRef.value.innerHTML = htmlValue.value
                }
            })
        }
    }

    function onHtmlInput(event) {
        htmlValue.value = event.target.value
        emit('update:modelValue', htmlValue.value)
    }

    // --- Вставка изображения ---

    function saveSelection() {
        if (typeof window === 'undefined') return
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            if (editorRef.value && editorRef.value.contains(range.commonAncestorContainer)) {
                savedRange = range
            }
        }
    }

    function restoreSelection() {
        editorRef.value?.focus()
        if (savedRange && typeof window !== 'undefined') {
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(savedRange)
        }
    }

    function insertImage() {
        if (typeof window === 'undefined') return
        saveSelection()
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async () => {
            const file = input.files && input.files[0]
            if (!file) return
            await uploadAndInsert(file)
        }
        input.click()
    }

    async function uploadAndInsert(file) {
        const formData = new FormData()
        formData.append('files[]', file)
        uploading.value = true
        try {
            const response = await fetch(`${routes.domain}/api${routes.file.upload}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${userStore.token}`
                },
                body: formData
            })
            const data = await response.json()
            const item = Array.isArray(data) ? data[0] : data
            const url = item?.file || item?.url
            if (url) {
                restoreSelection()
                document.execCommand('insertImage', false, url)
                onInput()
            }
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error)
        } finally {
            uploading.value = false
        }
    }
</script>
