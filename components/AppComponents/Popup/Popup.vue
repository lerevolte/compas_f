<template>
    <div class="popup" ref="popupRef" :class="{ 'popup_open': popup.state.isOpen }">
        <div class="popup__header" @click="event => popup.toggleOptions(event)">
            <slot name="header"></slot>
        </div>
        <!--
            Содержимое попапа выносим в body через Teleport, иначе любой предок
            с will-change/transform/filter создаёт containing block для position:
            fixed и popup «уезжает» в случайное место относительно этого предка.
            Прокидываем модификатор-классы родительского .popup на сам контент,
            чтобы каскадные стили вида ".popup.settings .popup__content { ... }"
            и т.п. продолжали работать.
        -->
        <Teleport to="body">
            <div
                class="popup__content"
                :class="[popup.state.contentClass, { 'popup__content_top': popup.state.isTop, 'popup__content_open': popup.state.isOpen }]"
                ref="contentRef"
                @click="popup.onContentClick($event)"
            >
                <slot name="content"></slot>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
    import './Popup.scss';
    import { ref, reactive, nextTick, onMounted, onBeforeUnmount, watch, markRaw } from 'vue'

    const popupRef = ref(null)
    const contentRef = ref(null)
    const classObserver = ref(null)

    const emit = defineEmits([
        'close'
    ])

    class Popup {
        constructor(popupRef, contentRef) {
            this.popupRef = popupRef;
            this.contentRef = contentRef

            this.state = reactive({
                isOpen: false,
                isTop: false,
                // Классы, скопированные с корневого .popup (кроме сервисных
                // popup/popup_open). Нужны, чтобы каскадные стили вида
                // ".my-popup .popup__content { ... }" работали и после
                // переноса контента в body через Teleport — без этого
                // селектор-предок «.my-popup» больше не относится к контенту.
                contentClass: ''
            });

            this.closeOptions = this.closeOptions.bind(this);
            this._scrollHandler = null;
        }

        _syncContentClass() {
            const root = this.popupRef.value;
            if (!root) return;
            const classes = Array.from(root.classList).filter(
                c => c !== 'popup' && c !== 'popup_open'
            );
            this.state.contentClass = classes.join(' ');
        }

        closeOptions(event) {
            if (!this.popupRef.value) return;

            for (const sel of props.ignoreSelectors) {
                const el = document.querySelector(sel);
                if (el && el.contains(event.target)) return;
            }

            const insidePopup = this.popupRef.value.contains(event.target);
            const insideContent = this.contentRef?.value?.contains?.(event.target);
            if (!insidePopup && !insideContent) {
                this._close();
            }
        }

        _close() {
            this.state.isOpen = false;
            this.state.isTop = false;
            this._teardownScroll();
            this._clearStyles();
            document.removeEventListener('mousedown', this.closeOptions);
            emit('close', true);
        }

        // Делегированный обработчик клика по контенту popup'а.
        // Закрывает popup, когда пользователь выбрал любой .popup__option,
        // КРОМЕ чекбокса/disable/empty/checkbox-обёртки и КРОМЕ submenu-
        // навигации внутри popup'а (Settings.vue/Save.vue имеют вложенное
        // меню с шагами, которое должно держать popup открытым).
        //
        // Раньше каждый консьюмер сам пытался убрать класс popup_open
        // через DOM, но (1) после Teleport контент уехал в body — и
        // closest('.popup') стал null; (2) markRaw на Popup-инстансе сделал
        // popupRef ВНУТРИ объекта обычным Vue-ref'ом, и `popup.popupRef
        // .classList` снаружи стал undefined → TypeError. Поэтому close
        // централизованный.
        //
        // Маркер «не закрывать»: класс из списка ниже ИЛИ data-popup-stay
        // на самом .popup__option (для случаев, когда консьюмеру нужно
        // явно сохранить popup открытым — например, чекбокс настроек,
        // навигация в submenu).
        onContentClick(event) {
            const option = event?.target?.closest?.('.popup__option');
            if (!option) return;
            if (option.dataset && option.dataset.popupStay != null) return;
            const stayClasses = [
                'popup__option_checkbox',
                'popup__option_disable',
                'popup__option_empty',
                'popup__option_stay',
                // Settings/Save: submenu-навигация внутри popup'а. Клик по
                // «Отображение/Порядок/Фиксированные/Назад/Создать новую…»
                // ведёт во вложенное состояние popup'а — закрывать его
                // нельзя, иначе пользователь не видит подменю.
                'settings__item_submenu',
                'settings__item_back'
            ];
            for (const cls of stayClasses) {
                if (option.classList.contains(cls)) return;
            }
            // Закрытие через _close — оно само снимает класс, отписывает
            // обработчики, кикает MutationObserver. Делаем после клика по
            // опции, т.е. её собственный @click уже отработал (bubble).
            this._close();
        }

        toggleOptions(event) {
            if (this.state.isOpen) {
                const classList = Array.from(event.target.closest('.popup').classList)
                if (classList.some(className => props.ignoreSelectors.includes(className))) {
                    return;
                }
                this._close();
                return;
            }

            this.state.isOpen = true;
            this._syncContentClass();
            document.addEventListener('mousedown', this.closeOptions);
            this._scheduleApply();
        }

        _scheduleApply() {
            // Сначала Vue должен довести до DOM факт открытия (nextTick),
            // потом даём браузеру layout-цикл (rAF), и только после этого
            // запускаем замеры. Без чейна applyPosition мог сработать ДО
            // того, как Vue переключит видимость, и getBoundingClientRect
            // возвращал 0×0 — попап оставался без inline top/left.
            nextTick(() => requestAnimationFrame(() => this.applyPosition()));
        }

        // Позиционируем popup-контент через position:fixed относительно
        // viewport (top/left считаем от anchorRect, который сам в координатах
        // viewport). Это снимает проблему с обрезкой overflow:hidden у
        // родителей таблиц/секций и позволяет надёжно перевернуть контент
        // вверх или прижать к правому/левому краю в пределах viewport.
        applyPosition(retry = 0) {
            if (!this.state.isOpen) return;
            const headerEl = this.popupRef.value?.querySelector('.popup__header');
            const contentEl = this.contentRef.value;
            if (!headerEl || !contentEl) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            // Перед измерением сбрасываем inline-позицию — иначе предыдущее
            // позиционирование на правом/верхнем краю исказит contentRect.
            contentEl.style.left = '0px';
            contentEl.style.right = 'auto';
            contentEl.style.top = '0px';
            contentEl.style.bottom = 'auto';
            contentEl.style.position = 'fixed';

            const anchorRect = headerEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            if (!contentRect.width || !contentRect.height) {
                if (retry < 10) requestAnimationFrame(() => this.applyPosition(retry + 1));
                return;
            }

            const GAP = 5;
            const MARGIN = 5; // отступ от края viewport

            // Вертикальное позиционирование: предпочитаем вниз. Если внизу не
            // помещается (или isPreventBottom) — открываем вверх. Если и сверху
            // не помещается — берём ту сторону, где места больше, и обрезаем по
            // ней через max-height в стилях (.popup__content max-height).
            let bottomBound = window.innerHeight - MARGIN;
            if (props.parentContainer) {
                bottomBound = Math.min(bottomBound, props.parentContainer.getBoundingClientRect().bottom);
            } else {
                const massAction = typeof document !== 'undefined'
                    ? document.querySelector('.mass-action')
                    : null;
                if (massAction) {
                    const r = massAction.getBoundingClientRect();
                    if (r.top > 0 && r.top < bottomBound) bottomBound = r.top - MARGIN;
                }
            }

            const spaceBelow = bottomBound - anchorRect.bottom - GAP;
            const spaceAbove = anchorRect.top - MARGIN - GAP;
            const fitsBelow = contentRect.height <= spaceBelow;
            const fitsAbove = contentRect.height <= spaceAbove;

            let openBelow;
            if (props.isPreventBottom) {
                openBelow = fitsAbove ? false : (fitsBelow ? true : (spaceBelow >= spaceAbove));
            } else {
                openBelow = fitsBelow ? true : (fitsAbove ? false : (spaceBelow >= spaceAbove));
            }
            this.state.isTop = !openBelow;

            let top;
            if (openBelow) {
                top = anchorRect.bottom + GAP;
            } else {
                top = anchorRect.top - GAP - contentRect.height;
                // Если не помещается выше — прижимаем к верхнему краю.
                if (top < MARGIN) top = MARGIN;
            }
            contentEl.style.top = `${Math.round(top)}px`;
            contentEl.style.bottom = 'auto';

            // Горизонтальное позиционирование.
            // align="right" — открываем влево от анкера (правый край контента
            //   совпадает с правым краем анкера). Нужно для триггеров у правого
            //   края экрана, иначе контент уезжает вправо и обрезается.
            // По умолчанию (align="left") — left анкера, а если уезжает вправо
            //   за viewport, выравниваем по правому краю анкера.
            let left;
            if (props.align === 'right') {
                left = anchorRect.right - contentRect.width;
                // Если уехали за левый край — открываем вправо от анкера.
                if (left < MARGIN) left = anchorRect.left;
            } else {
                left = anchorRect.left;
                if (left + contentRect.width > window.innerWidth - MARGIN) {
                    left = anchorRect.right - contentRect.width;
                }
            }
            // Финальный клэмп в пределах viewport.
            if (left + contentRect.width > window.innerWidth - MARGIN) {
                left = window.innerWidth - MARGIN - contentRect.width;
            }
            if (left < MARGIN) left = MARGIN;
            contentEl.style.left = `${Math.round(left)}px`;
            contentEl.style.right = 'auto';

            this._setupScroll();
        }

        _clearStyles() {
            const contentEl = this.contentRef?.value;
            if (!contentEl) return;
            contentEl.style.left = '';
            contentEl.style.right = '';
            contentEl.style.top = '';
            contentEl.style.bottom = '';
            contentEl.style.position = '';
        }

        _setupScroll() {
            if (this._scrollHandler) return;
            this._scrollHandler = () => {
                if (!this.state.isOpen) return;
                this.applyPosition();
            };
            window.addEventListener('scroll', this._scrollHandler, true);
            window.addEventListener('resize', this._scrollHandler);
        }

        _teardownScroll() {
            if (!this._scrollHandler) return;
            window.removeEventListener('scroll', this._scrollHandler, true);
            window.removeEventListener('resize', this._scrollHandler);
            this._scrollHandler = null;
        }
    }

    const props = defineProps({
        parentContainer: {
            default: null
        },
        isPreventBottom: {
            default: false,
            type: Boolean
        },
        // Сторона выравнивания контента относительно анкера: 'left' (по
        // умолчанию) открывает вправо, 'right' — влево (для триггеров у
        // правого края экрана).
        align: {
            default: 'left',
            type: String
        },
        forceFloating: {
            default: false,
            type: Boolean
        },
        ignoreSelectors: {
            type: Array,
            default: () => []
        }
    })

    // markRaw, чтобы Vue не оборачивал инстанс Popup в reactive-прокси.
    // Внутри Popup мы держим this.popupRef = popupRef (Vue ref). Если бы инстанс
    // был реактивным прокси, доступ this.popupRef через прокси АВТОматически
    // распаковывал бы ref → this.popupRef.value становился бы undefined
    // (DOM-элементы не имеют .value). Из-за этого applyPosition не находил
    // anchor/content и попап оставался без inline top/left.
    const popup = ref(markRaw(new Popup(popupRef, contentRef)))

    watch(() => popup.value.state.isOpen, (next) => {
        if (next) popup.value._scheduleApply();
    })

    onMounted(() => {
        if (!popupRef.value) return;

        classObserver.value = new MutationObserver(() => {
            const rootEl = popupRef.value;
            if (!rootEl) return;

            const hasOpenClass = rootEl.classList.contains('popup_open');
            if (!hasOpenClass && popup.value.state.isOpen) {
                popup.value._close();
            }
        });

        classObserver.value.observe(popupRef.value, { attributes: true, attributeFilter: ['class'] });
    })

    onBeforeUnmount(() => {
        if (classObserver.value) classObserver.value.disconnect();
        document.removeEventListener('mousedown', popup.value.closeOptions);
        popup.value._teardownScroll?.();
    })

    defineExpose({ popup });
</script>
