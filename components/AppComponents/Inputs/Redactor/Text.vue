<template>
    <div class="redactor-text">
        <div class="redactor-text__toolbar">
            <button type="button" class="redactor-text__btn" title="Заголовок H2" @mousedown.prevent="format('h2')"><b>H2</b></button>
            <button type="button" class="redactor-text__btn" title="Заголовок H3" @mousedown.prevent="format('h3')"><b>H3</b></button>
            <button type="button" class="redactor-text__btn" title="Абзац" @mousedown.prevent="format('p')">¶</button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Полужирный" @mousedown.prevent="cmd('bold')"><b>Ж</b></button>
            <button type="button" class="redactor-text__btn" title="Курсив" @mousedown.prevent="cmd('italic')"><i>К</i></button>
            <button type="button" class="redactor-text__btn" title="Подчёркнутый" @mousedown.prevent="cmd('underline')"><u>Ч</u></button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Маркированный список" @mousedown.prevent="cmd('insertUnorderedList')">•</button>
            <button type="button" class="redactor-text__btn" title="Нумерованный список" @mousedown.prevent="cmd('insertOrderedList')">1.</button>
            <button type="button" class="redactor-text__btn" title="Ссылка" @mousedown.prevent="insertLink">🔗</button>
            <span class="redactor-text__sep"></span>
            <button type="button" class="redactor-text__btn" title="Очистить форматирование" @mousedown.prevent="cmd('removeFormat')">⌫</button>
        </div>
        <div
            ref="editorRef"
            class="redactor-text__editor"
            contenteditable="true"
            @input="onInput"
            @blur="onInput"
        ></div>
    </div>
</template>

<script setup>
    import './Redactor.scss'
    import { ref, onMounted, watch } from 'vue'

    const props = defineProps({
        modelValue: {
            default: '',
            type: String
        }
    })

    const emit = defineEmits(['update:modelValue'])

    const editorRef = ref(null)

    onMounted(() => {
        if (editorRef.value) {
            editorRef.value.innerHTML = props.modelValue || ''
        }
    })

    // Внешнее обновление значения (отмена/сброс) — синхронизируем DOM,
    // но не трогаем редактор, пока в нём фокус, чтобы не сбивать каретку.
    watch(() => props.modelValue, (value) => {
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
</script>
