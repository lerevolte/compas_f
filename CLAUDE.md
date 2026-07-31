# Project: Compas — Nuxt Frontend

## Stack
- Nuxt 3.18
- Pinia (@pinia/nuxt 0.10)
- nuxt-lodash 2.5
- Leaflet (карты)
- Режим: SSG — `nuxt generate`, деплой в public/ Laravel

## Архитектура: гибрид с Laravel

Бэкенд: Laravel 9 в отдельном репо
(https://github.com/lerevolte/compas_back)

- API: JSON через /api/* на том же домене (compas.pro)
- Лендинг (/) — НЕ наша территория, его рендерит Laravel через Blade
- Закрытое приложение — наша территория, статика после авторизации

### Деплой (deploy.sh)

npm run generate
→ rsync .output/public/_nuxt/ на сервер
→ scp index.html → index2.html (мастер-шаблон)
→ для каждой папки {auth,logistic,roles,profile,settings,analytics,
tariffs,trash,users,external} копируется свой index.html
→ ВСЕ index.html (кроме landing/) перезаписываются index2.html

### ВАЖНО: список SPA-разделов

deploy.sh знает только эти разделы (hardcoded):
auth, logistic, roles, profile, settings, analytics, tariffs, trash,
users, external

При добавлении НОВОГО раздела верхнего уровня:
1. Создать страницу в pages/[название]/
2. Обновить список папок в deploy.sh
3. Возможно обновить routes/web.php или Route::fallback в Laravel

Иначе после деплоя у нового раздела не будет index.html и он отдаст 404.

## КРИТИЧНО: Leaflet и SSG

Leaflet использует window/document. При `npm run generate` Nuxt
пытается отрендерить страницу на сервере — упадёт.

✅ Правильно — через ClientOnly:
```vue
<template>
  <ClientOnly fallback-tag="div" fallback="Загрузка карты...">
    <LMap :zoom="13" :center="[52.5, 5.5]">
      <LTileLayer url="..." />
    </LMap>
  </ClientOnly>
</template>
```

✅ Правильно — динамический импорт самого leaflet:
```ts
onMounted(async () => {
  const L = (await import('leaflet')).default
  // инициализация карты
})
```

❌ Неправильно:
```ts
import L from 'leaflet'  // упадёт при generate
import 'leaflet/dist/leaflet.css'  // CSS можно через nuxt.config
```

Признаки проблемы: `window is not defined`, `ReferenceError: navigator`,
`document is not defined`, `self is not defined` при `npm run generate`.

## Тестовый портал avixo

avixo.compas.pro — тестовый портал: новые фичи выкатываются сначала туда
(бэкенд ставит сущности только в его БД). Фронт один на все порталы, поэтому
новые компоненты/типы полей должны быть данными-управляемыми: рендерить ветку
только когда бэкенд прислал соответствующий field.type / сущность, и ничего
не ломать на порталах, где фичи нет. Подробнее — CLAUDE.md бэкенда
(«Тестовый портал avixo»).

В скором времени появится страница «Модули» для порталов — пользователь сам
ставит/удаляет модули (сущности вроде deals/contacts). Новые фичи проектировать
из этого расчёта: UI обязан переживать как появление, так и исчезновение
сущности/полей в рантайме (не кэшировать наличие сущности жёстче menuStore,
не падать на отсутствующих slug). Это будет новый SPA-раздел верхнего уровня —
потребует обновления deploy.sh (см. «список SPA-разделов»).

## Команды
- Dev: `npm run dev`
- Билд для прода: `npm run generate` (НЕ `nuxt build`!)
- Деплой: `./deploy.sh`
- Превью локально: `npm run preview`

## Конвенции

- Composables в composables/ — auto-import
- Stores — Pinia в stores/
- Компоненты карты — в components/Map/, всегда ClientOnly
- API base URL — runtimeConfig.public.apiBase, не хардкод
- API-вызовы — useFetch / $fetch
- Lodash — через `useLodash` (nuxt-lodash), не прямой импорт
- Новые комментарии в код не добавлять

## Алиасы импортов (nuxt.config.ts)

- `@AppComponents` → components/AppComponents (базовые UI-компоненты)
- `@AppTemplates` → components/AppTemplates (крупные блоки: Detail, Logistic, Analytic)
- `@AppIcons` → components/AppIcons
- `@AppHelpers` → helpers/

## Ключевые файлы

- `helpers/classes.js` — «ядро» фронта: классы Table (виртуализированная
  таблица на @tanstack/vue-virtual, useVirtualizer по tableRef), Common
  (useDoubleClick, уведомления, копирование), History, Columns, Socket,
  HeaderEditable. Большинство поведений таблиц/деталок меняется здесь.
- `helpers/http.js` + `helpers/api.js` — обёртка axios. ВАЖНО:
  `api.callMethod` НЕ реджектится на HTTP-ошибках — резолвится
  `{data, status}`, статус проверять вручную. 401 → сброс токена и /auth;
  403 'Forbidden' → полностраничный error только при прямом просмотре
  (isDirectForbiddenView), в модалке деталка рисует свой экран 403, тостов нет.
- `helpers/routes.js` — константы всех API-путей (не хардкодить URL в компонентах).
- `middleware/auth.global.js` — проверка токена; `/` редиректит на первый
  видимый пункт меню; `/logistic` гейтится наличием пункта логистики в меню
  (прав нет → пункт удалён бэком → 403).
- `stores/{userStore,menuStore}.js` — persisted (persist: true, localStorage);
  учитывать возможный стейл после смены прав.

## Модалки деталок (app.vue)

Деталки открываются стеком модалок (`entity.openModal` в app.vue, до 9 уровней,
рендер в `#detail__overlay`). При открытии URL подменяется через
`history.replaceState` на `/objects/{slug}/{id}` (это НЕ навигация роутера),
title восстанавливается при закрытии (basePageTitle). Событие `openModal`
пробрасывается вверх из любых таблиц/деталок до app.vue.

## Таблицы (VirtualTable)

- Клики по строке: одинарный = выделение (choseRow), двойной = открыть деталку
  (`common.useDoubleClick`). Служебные колонки исключаются по data-column-key
  (isChoose, actions, active, clicked) — новые колонки-чекбоксы добавлять в эти
  списки в Body.vue. В таблицах аналитики (options.isAnalytic) двойной клик
  отключён — открытие только по entity-link (колонка name c row.link).
- Значения ячеек типа json (например «Состав») рендерятся через v-html
  (`Название, <b> N шт.</b>` через запятую) — формат задаёт
  setFieldValue/useCellModel в classes.js.
- Тексты истории со `<span data-slug data-id>` становятся ссылками на объекты.

## Контракт страницы (pages/*)

Каждая страница обязана:
1. Отдать элемент `id="mobile-menu-target"` (обычно на AppH1 в шапке) — туда
   телепортируется бургер мобильного меню (Menu.vue); без него бургер пропадает.
2. Выставить title через `useHead({ title: '... | Compas.pro' })`.
Страница `/` — транзитная (редирект по меню из middleware), но обязана иметь
и таргет, и title (см. pages/index.vue).

## Скролл на тач-устройствах (не ломать)

При `@media (pointer: coarse)` у html/body стоит `overflow: hidden` —
скроллером служит `.page` (assets/default.scss). iOS Safari может сместить
window (фокус инпута/клавиатура) и смещение застревает («пружинит, не
долистать до верха/низа»); в app.vue стоит пиннинг window-скролла для
pointer:coarse (не срабатывает при фокусе в инпуте и pinch-zoom) — не удалять.

## Realtime

`Socket` (classes.js) слушает события бэка (ObjectUpdated/HistoryUpdated и др.)
и копит изменения; таблицы показывают плашку «N изменений [Загрузить]».
У модалок отдельная логика flushPendingOwn при закрытии стека (app.vue).

## Тесты

Автотестов на фронте нет; проверка — `npm run generate` (обязан пройти без
ошибок) и ручная проверка страниц с картой.

## Что НЕ делать

- НЕ использовать `nuxt build` для прода — только `nuxt generate`
- НЕ импортировать leaflet в setup без ClientOnly или process.client
- НЕ обращаться к window/document/localStorage в setup без проверки
- НЕ хардкодить URL API
- НЕ добавлять новый SPA-раздел верхнего уровня без обновления deploy.sh
- НЕ ставить тяжёлые либы без обсуждения (раздувает статик-билд)

## Перед коммитом

1. Локальный `npm run generate` — должен пройти без ошибок
2. Проверить страницы с картой — не падают при build
3. Conventional commits