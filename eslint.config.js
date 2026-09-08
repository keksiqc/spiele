import antfu from '@antfu/eslint-config'
import tailwindcss from 'eslint-plugin-better-tailwindcss'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu({
  stylistic: true,
  formatters: true,
  antislop: true,
  typescript: true,
  vue: true,
  unicorn: {
    allRecommended: true,
  },
}, {
  extends: [
    tailwindcss.configs.recommended,
  ],
  settings: {
    'better-tailwindcss': {
      entryPoint: 'app/assets/css/main.css',
    },
  },
  rules: {
    'unicorn/filename-case': 'off',
  },
}).append(nuxt)
