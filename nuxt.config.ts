import { resolve } from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-13',
  devtools: { enabled: false },
  modules: [
    '@pinia/nuxt',
    'nuxt-lodash',
    'pinia-plugin-persistedstate/nuxt',
  ],
  vite: {
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
