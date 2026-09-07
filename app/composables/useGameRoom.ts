import type { ClientMessage, ServerMessage } from '#shared/game'
import { onBeforeUnmount, ref, shallowRef } from 'vue'
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
  const connecting = ref(false)
  const connected = ref(false)
  const currentCategory = ref('')
  const myInput = ref('')
  const partnerInput = ref('')
  const partnerRevealed = ref(false)
  const revealed = ref(false)
  const revealSent = ref(false)
  const streak = ref(0)
  const socket = shallowRef<WebSocket | null>(null)

  function resetRound() {
    currentCategory.value = ''
    myInput.value = ''
    partnerInput.value = ''
    partnerRevealed.value = false
    revealed.value = false
    revealSent.value = false
    streak.value = 0
  }

  function closeSocket() {
    const currentSocket = socket.value
    if (!currentSocket)
      return

    currentSocket.onopen = null
    currentSocket.onmessage = null
    currentSocket.onerror = null
    currentSocket.onclose = null
    if (currentSocket.readyState === WebSocket.CONNECTING || currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.close(1000, 'Client disconnected')
    }
    socket.value = null
    connecting.value = false
    connected.value = false
  }

  function send(message: ClientMessage): boolean {
    const currentSocket = socket.value
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)
      return false

    currentSocket.send(JSON.stringify(message))
    return true
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
    connecting.value = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const nextSocket = new WebSocket(`${protocol}//${window.location.host}/ws?room=${encodeURIComponent(normalizedRoomId)}`)
    socket.value = nextSocket

    nextSocket.onopen = () => {
      if (socket.value !== nextSocket)
        return
      connecting.value = false
      connected.value = true
      callbacks.onConnected?.()
    }

    nextSocket.onmessage = (event) => {
      if (socket.value !== nextSocket)
        return
      const text = decodeMessage(event.data)
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

    nextSocket.onerror = () => {
      if (socket.value === nextSocket)
        callbacks.onError?.('errors.connectionFailed')
    }

    nextSocket.onclose = () => {
      if (socket.value !== nextSocket)
        return
      socket.value = null
      connecting.value = false
      connected.value = false
      callbacks.onDisconnected?.()
    }

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
