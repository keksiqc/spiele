import { onBeforeUnmount, readonly, ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export function useToasts() {
  const toasts = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 0

  function remove(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  function notify(message: string, tone: ToastTone = 'info', duration = 3600) {
    const id = ++nextId
    toasts.value.push({ id, message, tone })
    timers.set(id, setTimeout(remove, duration, id))
  }

  onBeforeUnmount(() => {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  })

  return {
    toasts: readonly(toasts),
    notify,
    remove,
  }
}
