import { resolve } from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-13',
  devtools: { enabled: false },
  ssr: false,
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      meta: [
        // theme-color подтягивает цвет URL-бара / статус-бара iOS Safari (15+)
        // под фон сайта — без этого видны серые плашки сверху и снизу.
        { name: 'theme-color', content: '#ffffff' }
      ]
    }
  },
  modules: [
    '@pinia/nuxt',
    'nuxt-lodash',
    'pinia-plugin-persistedstate/nuxt',
  ],
  vite: {
    cacheDir: 'node_modules/.vite',
    resolve: {
      dedupe: ['vue']
    },
    optimizeDeps: {
      include: [
        '@fancyapps/ui',
        'axios',
        'date-fns',
        '@vuepic/vue-datepicker',
        'vue3-toastify',
        'maska',
        'vuedraggable',
        '@tanstack/vue-virtual'
      ],
      exclude: [
        'nuxt/app',
        'vue-demi'
      ]
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  },
  alias: {
    '@AppComponents': resolve(__dirname, './components/AppComponents'),
    '@AppHelpers': resolve(__dirname, './helpers'),
    '@AppIcons': resolve(__dirname, './components/AppIcons'),
    '@AppTemplates': resolve(__dirname, './components/AppTemplates'),
  }
})
