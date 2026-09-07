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
    <TransitionGroup name="toast" tag="div" class="w-full space-y-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="{
          'toast-success': toast.tone === 'success',
          'toast-error': toast.tone === 'error',
          'toast-warning': toast.tone === 'warning',
          'toast-info': toast.tone === 'info',
        }"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>
