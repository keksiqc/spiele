import type { ClientMessage, ServerMessage } from '#shared/game'
import { useWebSocket } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { MAX_INPUT_LENGTH, normalizeRoomId, parseServerMessage } from '#shared/game'

export interface GameRoomCallbacks {
  onConnected?: () => void
  onDisconnected?: () => void
  /** Receives a translation key (client-side errors) or a server error key. */
  onError?: (key: string) => void
  onMessage?: (message: ServerMessage) => void
}

function decodeMessage(data: unknown): string | null {
  if (typeof data === 'string')
    return data
  if (data instanceof ArrayBuffer)
    return new TextDecoder().decode(data)
  return null
}

export function useGameRoom(callbacks: GameRoomCallbacks = {}) {
  const roomId = ref('')
  const joined = ref(false)
  const currentCategory = ref('')
  const myInput = ref('')
  const partnerInput = ref('')
  const partnerRevealed = ref(false)
  const revealed = ref(false)
  const revealSent = ref(false)
  const streak = ref(0)
  const socketUrl = shallowRef<string | undefined>()
  const intentionallyClosed = new WeakSet<WebSocket>()

  function resetRound() {
    currentCategory.value = ''
    myInput.value = ''
    partnerInput.value = ''
    partnerRevealed.value = false
    revealed.value = false
    revealSent.value = false
    streak.value = 0
  }

  function handleMessage(data: unknown) {
    const text = decodeMessage(data)
    if (!text) {
      callbacks.onError?.('errors.unreadableResponse')
      return
    }

    let rawMessage: unknown
    try {
      rawMessage = JSON.parse(text) as unknown
    }
    catch {
      callbacks.onError?.('errors.invalidResponse')
      return
    }

    const message = parseServerMessage(rawMessage)
    if (!message) {
      callbacks.onError?.('errors.invalidResponse')
      return
    }

    switch (message.type) {
      case 'playerInput':
        partnerInput.value = message.value
        break
      case 'peerRevealed':
        // This only means the other player is ready. The answers stay
        // hidden until the server confirms that every player revealed.
        partnerRevealed.value = true
        break
      case 'streak':
        streak.value = message.value
        break
      case 'resetStreak':
        streak.value = 0
        break
      case 'newCategory':
        currentCategory.value = message.value
        myInput.value = ''
        partnerInput.value = ''
        partnerRevealed.value = false
        revealed.value = false
        revealSent.value = false
        break
      case 'allRevealed':
        partnerRevealed.value = false
        revealed.value = true
        break
      case 'error':
        callbacks.onError?.(`errors.server.${message.value}`)
        break
    }

    callbacks.onMessage?.(message)
  }

  const {
    status: socketStatus,
    ws: socket,
    open: openSocket,
    close: closeSocketConnection,
    send: sendRaw,
  } = useWebSocket(socketUrl, {
    immediate: false,
    autoConnect: false,
    autoClose: false,
    autoReconnect: false,
    onConnected: (currentSocket) => {
      if (socket.value === currentSocket)
        callbacks.onConnected?.()
    },
    onMessage: (currentSocket, event) => {
      if (socket.value === currentSocket)
        handleMessage(event.data)
    },
    onError: (currentSocket) => {
      if (socket.value === currentSocket)
        callbacks.onError?.('errors.connectionFailed')
    },
    onDisconnected: (disconnectedSocket) => {
      if (intentionallyClosed.delete(disconnectedSocket))
        return
      if (socket.value !== disconnectedSocket)
        return
      callbacks.onDisconnected?.()
    },
  })

  const connected = computed(() => socketStatus.value === 'OPEN')
  const connecting = computed(() => socketStatus.value === 'CONNECTING')

  function closeSocket() {
    const currentSocket = socket.value
    if (currentSocket && (socketStatus.value === 'CONNECTING' || socketStatus.value === 'OPEN')) {
      intentionallyClosed.add(currentSocket)
      closeSocketConnection(1000, 'Client disconnected')
    }
    socketUrl.value = undefined
  }

  function send(message: ClientMessage): boolean {
    if (!connected.value)
      return false

    return sendRaw(JSON.stringify(message), false)
  }

  function join(rawRoomId: unknown): boolean {
    if (!import.meta.client)
      return false

    const normalizedRoomId = normalizeRoomId(rawRoomId)
    if (!normalizedRoomId) {
      callbacks.onError?.('game.toast.invalidCode')
      return false
    }

    closeSocket()
    resetRound()
    roomId.value = normalizedRoomId
    joined.value = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    socketUrl.value = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(normalizedRoomId)}`
    openSocket()

    return true
  }

  function leave() {
    closeSocket()
    joined.value = false
    roomId.value = ''
    resetRound()
  }

  function updateInput(value: string) {
    const boundedValue = value.slice(0, MAX_INPUT_LENGTH)
    myInput.value = boundedValue
    send({ type: 'playerInput', value: boundedValue })
  }

  onBeforeUnmount(closeSocket)

  return {
    roomId,
    joined,
    connecting,
    connected,
    currentCategory,
    myInput,
    partnerInput,
    partnerRevealed,
    revealed,
    revealSent,
    streak,
    join,
    leave,
    send,
    updateInput,
  }
}
