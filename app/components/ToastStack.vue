<script setup lang="ts">
import type { Toast } from '~/composables/useToasts'

defineProps<{
  toasts: readonly Toast[]
}>()
</script>

<template>
  <div
    class="
      pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end
      sm:left-auto sm:max-w-sm
    "
    aria-live="polite"
    aria-atomic="true"
  >
    <TransitionGroup name="toast" tag="div" class="w-full space-y-3">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="
          rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl
          shadow-black/30 backdrop-blur-xl
        "
        :class="{
          'border-emerald-300/25 bg-emerald-400/15 text-emerald-100': toast.tone === 'success',
          'border-rose-300/25 bg-rose-400/15 text-rose-100': toast.tone === 'error',
          'border-amber-300/25 bg-amber-400/15 text-amber-100': toast.tone === 'warning',
          'border-sky-300/25 bg-sky-400/15 text-sky-100': toast.tone === 'info',
        }"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>
