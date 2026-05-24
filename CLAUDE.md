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