<template>
    <aside class="menu" :class="{'menu_open': menu.isOpen, 'menu_dragging': menu.isDragging}">
        <teleport to="#mobile-menu-target" v-if="isClient && menu.isMobile">
            <IconGamburger 
                class="menu__gambuger"
                @click="menu.isOpen = true"
            />
        </teleport>
        <teleport to="#menu-group" v-if="isClient">
            <div class="menu__sublinks" v-if="menu.activeGroup">
                <NuxtLink v-for="item in menu.activeGroup.children" class="menu__sublink" :class="{'menu__sublink_active': route.path.startsWith(item.link)}" :key="item.id" :to="item.link ?? '/'">
                    {{ item.name }}
                </NuxtLink>
            </div>
        </teleport>

        <div class="menu__content" ref="menuContentRef">
            <NuxtLink class="menu__logo" :to="props.options?.type == 'default' ? menu.resolveFirstLink() : null">
                <IconLogo />
            </NuxtLink>

            <template v-if="props.options?.type == 'default'">
                <div class="menu-item__summary menu-item__summary_text" @click="menu.isOpen = false">
                    <IconArrowBack class='menu__arrow' />
                    Меню
                </div>
        
                <ul class="menu__list" v-if="menu.loading">
                    <li class="menu__item skeleton" v-for="i in 10" :key="i"> 
                        <div class="menu__link"></div>
                    </li>
                </ul>
        
                <nav class="menu__nav" v-else>
                    <draggable 
                        tag="ul"
                        group="menu"
                        class="menu__list"
                        ghost-class="draggable-ghost"
                        fallback-class="draggable-fallback"
                        v-model="menu.visible"
                        :forceFallback="true" 
                        :fallbackOnBody="true"
                        item-key="id" 
                        handle=".icon_drag"
                        @start="e => menu.dragStart(e)"
                        @end="val => menu.dragEnd(val)"
                    >
                        <template #item="{ element: item }">
                            <li class="menu__item" :class="{'menu__item_disabled': !item.enabled}" v-if="item.children.length == 0">
                                <IconDrag />
                                <NuxtLink :class="{'menu__link_active': menu.isActive(item.link)}" class="menu__link" :to="item.link ?? null" @click="menu.isMobile && menu.closeMenu()">
                                    {{ item.name }}
                                </NuxtLink>
                            </li>
                            <li class="menu__item" :class="{'menu__item_disabled': !item.enabled}" v-else>
                                <IconDrag />
        
                                <details class="menu-item menu-item__details">
                                    <summary class="menu-item__summary">
                                        <NuxtLink class="menu__link" :class="{'menu__link_active': menu.isActive(item.link)}" :to="item.link ?? null">
                                            {{ item.name }}
                                        </NuxtLink>
        

                                        <IconArrowBack class='menu__arrow' />
                                    </summary>
        
                                    <ul class="menu__sublist">
                                        <li @click="menu.isMobile && menu.closeMenu()" class="menu__item" :class="{'menu__link_active': menu.isActive(item.link), 'menu__item_disabled': !child.enabled}" v-for="child in item.children" :key="child.id">
                                            <NuxtLink class="menu__link" :to="child.link ?? '/'">
                                                {{ child.name }}
                                            </NuxtLink>
                                        </li>
                                    </ul>
                                </details>
                            </li>
                        </template>
                    </draggable>
        
                    <details class="menu-item menu-item__details menu-item__details_hidden" ref="menuHidden">
                        <summary class="menu-item__summary">
                            <div class="menu__link"></div>
        
                            <IconArrowBack class='menu__arrow' />
                        </summary>
        
                        <div class="menu-item__hidden-content">
                            <div class="menu__item-hide" @click="menuHidden.removeAttribute('open')">
                                <span class="menu__item-subtitle"> Скрытые </span>
                            </div>
        
                            <draggable 
                                tag="ul"
                                group="menu"
                                class="menu__list"
                                ghost-class="draggable-ghost"
                                v-model="menu.hidden" 
                                fallback-class="draggable-fallback"
                                :forceFallback="true"
                                :fallbackOnBody="true"
                                item-key="id" 
                                handle=".icon_drag"
                                @start="menu.dragStart()"
                                @end="val => menu.dragEnd(val)"
                            >
                                <template #item="{ element: item }">
                                    <li class="menu__item" :class="{'menu__item_disabled': !item.enabled}" v-if="item.children.length == 0">
                                        <IconDrag />
                                        <NuxtLink :class="{'menu__link_active': menu.isActive(item.link)}" class="menu__link" :to="item.link ?? null" @click="menu.isMobile && menu.closeMenu()">
                                            {{ item.name }}
                                        </NuxtLink>
                                    </li>
                                    <li class="menu__item" :class="{'menu__item_disabled': !item.enabled}" v-else>
                                        <IconDrag />
                
                                        <details class="menu-item__details">
                                            <summary class="menu-item__summary">
                                                <NuxtLink :class="{'menu__link_active': menu.isActive(item.link)}" class="menu__link" :to="item.link ?? null">
                                                    {{ item.name }}
                                                </NuxtLink>
                
                                                <IconArrowBack class='menu__arrow' />
                                            </summary>
                
                                            <ul class="menu__sublist">
                                                <li class="menu__item" v-for="child in item.children" :key="child.id" @click="menu.isMobile && menu.closeMenu()">
                                                    <NuxtLink :class="{'menu__link_active': menu.isActive(item.link)}" class="menu__link" :to="child.link ?? '/'">
                                                        {{ child.name }}
                                                    </NuxtLink>
                                                </li>
                                            </ul>
                                        </details>
                                    </li>
                                </template>
                            </draggable>
                        </div>
                    </details>
                </nav>
                
                <div class="menu__actions">
                    <AppSettings 
                        v-model:list="menu.list"
                        v-model:visible="menu.visible"
                        v-model:hidden="menu.hidden"
                        :options="{
                            isCheck: {
                                state: true,
                                name: 'Сущности'
                            },
                            isDrag: {
                                state: true,
                                name: 'Порядок'
                            },
                            isNest: {
                                state: true,
                                name: 'Группы вкладок'
                            },
                            isHaveDefault: true,
                            isHaveHidden: true
                        }"
                        @reset="menu.reset()"
                        @enableField="field => menu.enableField(field)"
                        @isChanged="menu.isChanged = true"
                        @dragEvent="state => menu.isDragging = state"
                        @update:modelVisible="(val) => {
                            menu.visible = val; 
                            menu.updateSortOrder()
                        }"
                        @update:modelHidden="(val) => {
                            menu.hidden = val; 
                            menu.updateSortOrder()
                        }"
                        @update:modelList="(val) => {
                            menu.list = val; 
                            menu.visible = val.filter(item => !item.is_hidden)
                            menu.hidden = val.filter(item => item.is_hidden)
                            menu.isChanged = true
                            menu.updateSortOrder()
                        }"
                    />
                    <AppSave 
                        v-show="menu.isChanged" 
                        @save="(role) => menu.save(role)"
                    />
                </div>
        
                <AppPopup ref="popupRef" class="menu__popup">
                    <template #header>
                        <div class="menu-user">
                            <figure v-if="menu.user?.avatar" class='ibg menu-user__avatar' :class="{'skeleton': menu.loading}">
                                <img :src='menu.user.avatar' alt=''>
                            </figure>
                            <figure v-else class='ibg menu-user__icon' :class="{'skeleton': menu.loading}">
                                <figcaption :style="{ '--backgroundColor': menu.user?.color || '#a6b7d4' }">
                                    {{ menu.user?.name?.charAt(0) || '' }}
                                </figcaption>
                            </figure>
                            <strong class="menu-user__name" :class="{'skeleton': menu.loading}">
                                {{ menu.user?.name }}
                            </strong>
                        </div>
    
                        <IconArrowBack class='menu__arrow' />
                    </template>
                    <template #content>
                        <NuxtLink class="popup__option" to="/profile" @click="popupRef.popup.popupRef.classList.remove('popup_open');">
                            Настройки
                        </NuxtLink>
                        <a href="https://compas.pro/auth/entry" class="popup__option" @click="popupRef.popup.popupRef.classList.remove('popup_open');">
                            Сменить портал
                        </a>
                        <div class="popup__option popup__option_red" @click="() => {userStore.logout(); popupRef.popup.popupRef.classList.remove('popup_open');}">
                            Выйти                    
                        </div>
                    </template>
                </AppPopup>
            </template>
        </div>
    </aside>
</template>

<script setup>
    import './Menu.scss';

    import IconArrowBack from '@AppIcons/ArrowBack.vue';
    import IconDrag from '@AppIcons/Actions/Drag.vue';
    import IconLogo from '@AppIcons/Logo.vue';
    import draggable from 'vuedraggable';
    import AppSettings from '@AppComponents/Settings/Settings.vue'
    import AppSave from '@AppComponents/Save/Save.vue'
    import IconGamburger from '@AppIcons/Gamburger.vue'
    import AppPopup from '@AppComponents/Popup/Popup.vue'
    import { useMediaQuery } from '@vueuse/core'

    import { useMenuStore } from '@/stores/menuStore.js'
    import { useUserStore } from '@/stores/userStore.js'
    const userStore = useUserStore()
    const menuStore = useMenuStore()

    const menuHidden = ref(null)
    const isClient = ref(false)
	const route = useRoute()
    const popupRef = ref(null)
    const menuContentRef = ref(null)

    const props = defineProps({
        options: {
            default: {
                type: 'default'
            },
            type: Object
        }
    })

    class Menu {
        constructor() {
            this.isChanged = false
            this.isHiddenOpen = false
            this.list = []
            this.visible = []
            this.hidden = []
            this.user = {}
            this.isOpen = false
            this.loading = false
            this.beforeDrag = []
            this.isDragging = false
            this.activeGroup = null
            this.isMobile = useMediaQuery('(max-width: 990px)')
        }

        // Получение
        async get() {
            try {
                this.loading = true
                const full_name = `${userStore.user?.name ?? ''} ${userStore.user?.last_name ?? ''}`
                this.user = {
                    name: full_name.replaceAll(' ', '') == '' ? 'Без имени' : full_name,
                    avatar: userStore.user && userStore.user?.avatar ? JSON.parse(userStore.user?.avatar)[0]?.url ?? null : null,
                    color: userStore.user?.color || '#a6b7d4'
                }
                await this.update()
            } catch (error) {
                console.log('menu_template', error);
            } finally {
                this.loading = false
            }
        }

        // Обновление
        async update() {
            // Обновляем информацию о пользователе
            const full_name = `${userStore.user?.name ?? ''} ${userStore.user?.last_name ?? ''}`
            this.user = {
                name: full_name.replaceAll(' ', '') == '' ? 'Без имени' : full_name,
                avatar: userStore.user && userStore.user?.avatar ? JSON.parse(userStore.user?.avatar)[0]?.url ?? null : null,
                color: userStore.user?.color || '#a6b7d4'
            }
            // Обновляем меню
            this.list = menuStore.list
            this.visible = this.list.filter(item => !item.is_hidden)
            this.hidden = this.list.filter(item => item.is_hidden)
        }

        // Изменение отображения поля
        enableField(field) {
            this.visible = this.visible.map(p => ({
                ...p,
                enabled: p.id == field.id ? field.enabled : p.enabled
            }))
            this.hidden = this.hidden.map(p => ({
                ...p,
                enabled: p.id == field.id ? field.enabled : p.enabled
            }))
        }

        // Вернуть значение по умолчанию
        async reset() {
            try {
                this.loading = true
                this.isChanged = true
                await menuStore.reset()
                await this.update()
            } catch (error) {
                console.log('reset_menu', error);
            } finally {
                this.loading = false
            }
        }

        // Поиск активной вкладки
        isActive(link) {
            if (route.path.startsWith(link)) {
                this.activeGroup = this.getActiveGroup(link)
            }
            return route.path.startsWith(link)
        }

        getActiveGroup(link) {
            let findedGroup = this.visible.find(item => item.is_group && item.children.find(child => child.link == link))
            
            if (!findedGroup) {
                return this.hidden.find(item => item.is_group && item.children.find(child => child.link == link))
            } else {
                return findedGroup
            }
        }

        // Начало перетаскивания в меню
        dragStart(e) {
            e?.preventDefault()
            this.isDragging = true
            this.beforeDrag = [...this.visible.map(item => item.id), ...this.hidden.map(item => item.id)]

            if (!menuHidden.value.hasAttribute('open')) {
                this.isHiddenOpen = true
                menuHidden.value.setAttribute('open', true)
            }
        }

        // Конец перетаскивания в меню
        dragEnd(val) {
            if (this.isHiddenOpen) {
                menuHidden.value.removeAttribute('open')
            }

            const afterDrag = [...this.visible.map(item => item.id), ...this.hidden.map(item => item.id)]

            this.visible.reduce((acc, obj) => {obj.is_hidden = false; acc.push(obj); return acc; }, []);
            this.hidden.reduce((acc, obj) => {obj.is_hidden = true; acc.push(obj); return acc; }, []);
            
            this.isChanged = JSON.stringify(this.beforeDrag) !== JSON.stringify(afterDrag)
            this.isHiddenOpen = false
            this.isDragging = false
            this.updateSortOrder()
        }

        // Обновление сортировки
        updateSortOrder() {
            [...this.visible, ...this.hidden].forEach((el, index) => {
                el.sort = index + 1
            })

            this.list = this.list.sort((a, b) => a.sort - b.sort)
        }

        // Сохранение
        save(role) {
            menuStore.save(role, this.list)
            this.isChanged = false
        }

        closeMenu() {
            setTimeout(() => {
                this.isOpen = false
            }, 100);
        }

        // Первый рабочий link для логотипа: если первый пункт меню — группа,
        // ищем первого enabled + не скрытого ребёнка с link.
        resolveFirstLink() {
            const first = this.visible?.[0]
            if (!first) return null
            if (first.is_group) {
                const children = first.children || []
                // enabled приходит как 0/1, поэтому truthy-проверка через !!
                const child = children.find(c => c?.link && !!c.enabled && !c.is_hidden)
                    || children.find(c => c?.link)
                return child?.link || null
            }
            return first.link || null
        }
    }

    const menu = ref(new Menu())

    // Загружаем данные самыми первыми на сайте
    if (props.options?.type == 'default') {
        menu.value.list = Array.isArray(menuStore?.list) ? menuStore.list : []
        menu.value.visible = menu.value.list.filter(item => !item.is_hidden)
        menu.value.hidden = menu.value.list.filter(item => item.is_hidden)
        await userStore.get()
        await userStore.getRoles()
    }
    
    onMounted(async () => {
        if (props.options?.type == 'default') {
            // Сначала показываем сохраненное меню (если есть), чтобы навигация не стиралась
            if (menuStore.list && menuStore.list.length > 0) {
                await menu.value.update()
            }
            // Затем дожидаемся обновления меню из API (которое запущено в setup) и обновляем отображение
            await menuStore.get()
            await menu.value.update()
            isClient.value = true
        }
    })

    watch(() => menu.value.isOpen, () => {
        if (menu.value.isOpen) {
            menuContentRef.value.querySelectorAll('.popup_open').forEach(el => el.classList.remove('popup_open'))
            menuContentRef.value.querySelectorAll('details[open]').forEach(el => el.removeAttribute('open'))
        }
    })

    watch(() => route.path, () => {
        isClient.value = false
        nextTick(() => {
            isClient.value = true
        })
    })
</script>
