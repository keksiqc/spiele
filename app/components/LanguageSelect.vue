<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

const { locale, locales, setLocale, t } = useI18n()

type LocaleCode = typeof locale.value

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const options = ref<HTMLElement[]>([])

const current = computed(() => locales.value.find(item => item.code === locale.value))

function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus)
    trigger.value?.focus()
}

onClickOutside(root, () => close())

async function toggle() {
  open.value = !open.value
  if (open.value)
    await focusOption(locales.value.findIndex(item => item.code === locale.value))
}

async function focusOption(index: number) {
  await nextTick()
  const items = options.value
  if (items.length === 0)
    return
  const bounded = (index + items.length) % items.length
  items[bounded]?.focus()
}

function choose(code: LocaleCode) {
  void setLocale(code)
  close(true)
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    void focusOption(event.key === 'ArrowDown' ? 0 : locales.value.length - 1)
  }
}

function onOptionKeydown(event: KeyboardEvent, index: number, code: LocaleCode) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      void focusOption(index + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      void focusOption(index - 1)
      break
    case 'Home':
      event.preventDefault()
      void focusOption(0)
      break
    case 'End':
      event.preventDefault()
      void focusOption(locales.value.length - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      choose(code)
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="btn btn-ghost"
      :aria-label="t('site.language')"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <Icon name="lucide:languages" aria-hidden="true" class="size-4" />
      <span
        class="
          hidden
          sm:inline
        "
      >{{ current?.name }}</span>
      <span
        class="
          uppercase
          sm:hidden
        "
      >{{ locale }}</span>
      <Icon
        name="lucide:chevron-down"
        aria-hidden="true"
        class="size-4 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <Transition name="menu">
      <ul
        v-if="open"
        role="listbox"
        :aria-label="t('site.language')"
        class="lang-menu"
      >
        <li
          v-for="(item, index) in locales"
          :key="item.code"
          ref="options"
          role="option"
          tabindex="-1"
          :aria-selected="item.code === locale"
          class="lang-option"
          :class="{ 'lang-option-active': item.code === locale }"
          @click="choose(item.code)"
          @keydown="onOptionKeydown($event, index, item.code)"
        >
          <span>{{ item.name }}</span>
          <Icon
            v-if="item.code === locale"
            name="lucide:check"
            aria-hidden="true"
            class="size-4 text-lilac"
          />
        </li>
      </ul>
    </Transition>
  </div>
</template>
