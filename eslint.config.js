import antfu from '@antfu/eslint-config'
import tailwindcss from 'eslint-plugin-better-tailwindcss'

import nuxt from './.nuxt/eslint.config.mjs'

export default antfu({
  formatters: true,
  vue: true,
  antislop: true,
}, {
  extends: [
    tailwindcss.configs.recommended,
  ],
  settings: {
    'better-tailwindcss': {
      entryPoint: 'app/assets/css/main.css',
    },
  },
}).append(nuxt)
