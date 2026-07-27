<template>
    <div class="redactor">
        <label class="blank__title" v-if="props.options.title && props.options.title != ''">
            {{ props.options.title }}
        </label>

        <div class="redactor__items" v-if="blocks.length">
            <draggable
                tag="div"
                :group="`redactor_${props.options.id}`"
                v-model="blocks"
                :forceFallback="true"
                :fallbackOnBody="true"
                item-key="_uid"
                handle=".redactor__drag"
                drag-class="draggable-drag"
                ghost-class="draggable-ghost"
                fallback-class="draggable-fallback"
                @end="emitChange"
            >
                <template #item="{ element: block, index }">
                    <div class="redactor__item" :class="`redactor__item_${block.type}`">
                        <div class="redactor__item-head">
                            <IconDrag class="redactor__drag" />
                            <span class="redactor__item-title">{{ typeLabel(block.type) }}</span>
                            <button type="button" class="redactor__move" title="Переместить вверх" :disabled="index == 0" @click="moveBlock(index, -1)">
                                <svg width="12" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0.5 7L7 1L13.5 7" stroke="currentColor" stroke-width="1.5" />
                                </svg>
                            </button>
                            <button type="button" class="redactor__move" title="Переместить вниз" :disabled="index == blocks.length - 1" @click="moveBlock(index, 1)">
                                <svg width="12" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0.5 1L7 7L13.5 1" stroke="currentColor" stroke-width="1.5" />
                                </svg>
                            </button>
                            <button type="button" class="redactor__remove" title="Удалить блок" @click="removeBlock(block)">
                                <IconClose />
                            </button>
                        </div>

                        <div class="redactor__item-body">
                            <RedactorText
                                v-if="block.type == 'wrap'"
                                v-model="block.body"
                                @update:model-value="emitChange"
                            />

                            <div class="redactor__question" v-else-if="block.type == 'question'">
                                <AppSelect
                                    :options="{
                                        id: `${props.options.id}_q_${block._uid}`,
                                        title: 'Вопрос',
                                        type: 'select_dropdown',
                                        list: questions,
                                        multiple: false,
                                        isHaveNull: true,
                                        searchable: true,
                                        placeholder: 'Выберите вопрос'
                                    }"
                                    v-model="block.questionId"
                                    @update:model-value="emitChange"
                                />
                            </div>

                            <div class="redactor__widget" v-else>
                                <IconWidget class="redactor__widget-icon" />
                                <span class="redactor__widget-text">
                                    Виджет «{{ typeLabel(block.type) }}» будет выведен на сайте
                                </span>
                            </div>
                        </div>
                    </div>
                </template>
            </draggable>
        </div>

        <button type="button" class="redactor__add" @click="modal.state = true">
            + Добавить
        </button>

        <teleport to="#menu__overlay" v-if="modal.state">
            <AppModalWarning
                :options="{
                    title: 'Добавить блок',
                    action: 'add',
                    actionTitle: 'Добавить',
                    type: 'blue',
                    template: 'slot'
                }"
                @add="addBlock"
                @close="modal.state = false"
            >
                <AppSelect
                    :options="{
                        id: `${props.options.id}_type`,
                        title: 'Тип поля',
                        type: 'select_dropdown',
                        list: types,
                        multiple: false,
                        isHaveNull: false
                    }"
                    v-model="modal.type"
                />
            </AppModalWarning>
        </teleport>
    </div>
</template>

<script setup>
    import './Redactor.scss'
    import { ref, watch, onMounted } from 'vue'
    import draggable from 'vuedraggable'

    import api from '@AppHelpers/api'
    import IconDrag from '@AppIcons/Actions/Drag.vue'
    import IconClose from '@AppIcons/Close.vue'
    import IconWidget from '@AppIcons/Actions/Show.vue'
    import RedactorText from '@AppComponents/Inputs/Redactor/Text.vue'
    import AppSelect from '@AppComponents/Inputs/Select/Select.vue'
    import AppModalWarning from '@AppComponents/Modal/Warning/Warning.vue'

    const TYPES = [
        { value: 'wrap', label: 'Текст' },
        { value: 'logistic-program', label: 'Логистическая программа' },
        { value: 'question', label: 'Вопрос' }
    ]

    const LEGACY_TYPES = [
        { value: 'check-sts', label: 'Проверка по СТС' },
        { value: 'check-vu', label: 'Проверка по ВУ' },
        { value: 'check-post', label: 'Проверка по постановлению' },
        { value: 'check-gos', label: 'Проверка по гос. номеру' },
        { value: 'check-inn', label: 'Проверка по ИНН' }
    ]

    const LOGISTIC_PROGRAM_HTML = '<section class="main-page section_without-background lg-hero"><!--[--><div class="main-page__container"><h1><!--[-->Логистическая программа для грузоперевозок <span class="lg-hero__accent">Бесплатно 24/7 365 дней в году!</span><!--]--></h1><p class="main-page__form-subtitle"> Получите максимальную выгоду от ваших маршрутов. Compas.pro — логистическая программа, которая помогает простраивать оптимальные маршруты, анализировать водителей, повышать эффективность машин и лояльность клиентов </p><div class="main-page__actions lg-hero__actions"><a href="/auth/registration" class=""><button class="button_blue lg-hero__reg"><span><!--[--> Зарегистрируйтесь <!--]--></span></button></a><div class="main-page__fansy-box"><!--[--><button type="button" class="fines__button" data-fancybox="finesBlock" data-src="#video-about"><span><!--[--><div id="video-about" class="video-modal fines-video__top"><iframe width="720" height="405" src="https://rutube.ru/play/embed/9050946b577ad1df9bad0507bbd97195/" frameborder="0" allow="clipboard-write; autoplay" webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen=""></iframe><div class="fines-video__cover"><img src="https://rutube.ru/api/video/9050946b577ad1df9bad0507bbd97195/thumbnail/?redirect=1" alt=""><div class="guide__video-play play-video"><img src="https://compas.pro/landing/images/icons/play-rutube.svg" alt=""></div></div></div><figure class="ibg fines__icon"><img src="https://compas.pro/landing/images/icons/youtube_blue.svg" alt="О сервисе"></figure> О сервисе <span class="button-text"> (4 мин 28 сек) </span><!--]--></span></button><!--]--></div></div></div><figure class="ibg main-page__image"><img src="https://compas.pro/landing/images/logistics/i1.webp" alt="Логистический сервис Компас"></figure><!--]--></section>'

    const props = defineProps({
        options: {
            default: () => ({
                id: 0,
                title: '',
                name: ''
            }),
            type: Object
        },
        modelValue: {
            default: null,
            type: [Array, String, Object]
        }
    })

    const emit = defineEmits(['update:modelValue'])

    const types = TYPES.map(t => ({ label: t.label, value: t.value }))
    const questions = ref([])
    const blocks = ref([])
    const modal = ref({ state: false, type: 'wrap' })

    let uid = 0

    function typeLabel(type) {
        return [...TYPES, ...LEGACY_TYPES].find(t => t.value == type)?.label ?? type
    }

    // Приведение входного значения к массиву блоков. С бэкенда значение может
    // прийти массивом (уже распарсенным), JSON-строкой (detail_text) либо —
    // у статей, сохранённых до фикса двойного кодирования — JSON-строкой внутри
    // JSON-строки. Поэтому разворачиваем строку несколько раз, пока не получим массив.
    function parseValue(value) {
        let v = value
        for (let i = 0; i < 3 && typeof v == 'string' && v.trim() != ''; i++) {
            try {
                v = JSON.parse(v)
            } catch (e) {
                return []
            }
        }
        return Array.isArray(v) ? v : []
    }

    function setBlocks(value) {
        blocks.value = parseValue(value).map(block => ({
            _uid: ++uid,
            ...block
        }))
    }

    // Эмитим чистую структуру без служебного _uid. Бэкенд (CrudService) ждёт
    // именно JSON-строку: массив он бы записал в строковую колонку detail_text
    // как "Array". Поэтому сериализуем сами — как это делал старый админ.
    function emitChange() {
        const clean = blocks.value.map(({ _uid, ...rest }) => rest)
        emit('update:modelValue', JSON.stringify(clean))
    }

    function addBlock() {
        const type = modal.value.type || 'wrap'
        const block = { _uid: ++uid, type }

        if (type == 'wrap') block.body = ''
        else if (type == 'logistic-program') {
            block.type = 'wrap'
            block.body = LOGISTIC_PROGRAM_HTML
        }
        else if (type == 'question') block.questionId = null

        blocks.value.push(block)
        modal.value = { state: false, type: 'wrap' }
        emitChange()
    }

    function moveBlock(index, offset) {
        const target = index + offset
        if (target < 0 || target >= blocks.value.length) return
        const items = [...blocks.value]
        const [moved] = items.splice(index, 1)
        items.splice(target, 0, moved)
        blocks.value = items
        emitChange()
    }

    function removeBlock(block) {
        blocks.value = blocks.value.filter(item => item._uid != block._uid)
        emitChange()
    }

    async function loadQuestions() {
        try {
            const response = await api.callMethod('GET', '/redactor/questions')
            const rows = Array.isArray(response?.data) ? response.data : []
            questions.value = rows.map(row => {
                let name = row.name
                if (name && typeof name == 'object') name = name.value
                return {
                    label: name ?? `Вопрос #${row.id}`,
                    value: String(row.id)
                }
            })
        } catch (e) {
            questions.value = []
        }
    }

    watch(() => props.modelValue, (value) => {
        // Не перетираем локальное состояние во время правок — синхронизируемся
        // только когда снаружи пришло реально другое значение (отмена/сброс).
        const current = JSON.stringify(blocks.value.map(({ _uid, ...rest }) => rest))
        const incoming = JSON.stringify(parseValue(value))
        if (current != incoming) setBlocks(value)
    })

    onMounted(() => {
        setBlocks(props.modelValue)
        loadQuestions()
    })
</script>
