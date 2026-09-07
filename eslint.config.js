import antfu from '@antfu/eslint-config'
import tailwindcss from 'eslint-plugin-better-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(antfu({
  formatters: true,
  vue: true,
}, {
  extends: [
    tailwindcss.configs.recommended,
  ],
  settings: {
    'better-tailwindcss': {
      entryPoint: 'app/assets/css/main.css',
    },
  },
}))
