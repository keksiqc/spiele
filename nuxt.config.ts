import tailwindcss from '@tailwindcss/vite'

/** https://nuxt.com/docs/api/configuration/nuxt-config */
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    'nuxt-i18n-micro',
    'vue-sonner/nuxt',
  ],
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-09-07',

  nitro: {
    preset: 'cloudflare_durable',
    experimental: {
      websocket: true,
    },
    cloudflare: {
      deployConfig: false,
      dev: {
        configPath: 'wrangler.dev.jsonc',
      },
      nodeCompat: true,
    },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  typescript: {
    strict: true,
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  fonts: {
    families: [
      {
        name: 'Bricolage Grotesque',
        provider: 'google',
        weights: ['200 800'],
        styles: ['normal'],
      },
    ],
  },

  i18n: {
    defaultLocale: 'de',
    strategy: 'no_prefix',
    translationDir: 'i18n/locales',
    translationPayloads: { mode: 'source' },
    disablePageLocales: true,
    meta: true,
    localeCookie: 'lang',
    autoDetectLanguage: true,
    locales: [
      {
        code: 'de',
        iso: 'de-DE',
        dir: 'ltr',
        displayName: 'Deutsch',
      },
      {
        code: 'en',
        iso: 'en-US',
        dir: 'ltr',
        displayName: 'English',
      },
    ],
  },

  icon: {
    mode: 'svg',
    serverBundle: {
      collections: ['lucide'],
    },
  },
})
