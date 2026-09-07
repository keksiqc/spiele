import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts'],
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
})
