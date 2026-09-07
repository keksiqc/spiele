import type { ServerMessage } from '../../shared/game'
import { parseClientMessage } from '../../shared/game'
import { chooseNextCategory, getRoomStore, MAX_MESSAGE_BYTES, roomIdFromUrl } from '../game/room-store'

const MAX_CLIENTS = 2

type WebSocketHooks = Parameters<typeof defineWebSocketHandler>[0]
type RoomPeer = Parameters<NonNullable<WebSocketHooks['open']>>[0]
type RoomMessage = Parameters<NonNullable<WebSocketHooks['message']>>[1]

const developmentReveals = new Map<string, boolean>()

interface SocketAttachment {
  deserializeAttachment?: () => unknown
  serializeAttachment?: (value: unknown) => void
}

interface RoomPeerInternals {
  _internal?: {
    ws?: unknown
  }
}

function peerRoomId(peer: RoomPeer): string | null {
  return roomIdFromUrl(peer.request.url)
}

function peersInRoom(peer: RoomPeer, roomId: string): RoomPeer[] {
  return [...peer.peers].filter(candidate => peerRoomId(candidate) === roomId)
}

function socketAttachment(peer: RoomPeer): SocketAttachment {
  // CrossWS exposes a Proxy as `peer.websocket` in the Durable Object adapter.
  // Cloudflare's attachment methods must be invoked on the original socket.
  const socket = (peer as unknown as RoomPeerInternals)._internal?.ws ?? peer.websocket
  return socket as SocketAttachment
}

function attachmentValue(peer: RoomPeer): Record<string, unknown> {
  const attachment = socketAttachment(peer).deserializeAttachment?.()
  return attachment && typeof attachment === 'object' && !Array.isArray(attachment)
    ? attachment as Record<string, unknown>
    : {}
}

function setRevealed(peer: RoomPeer, revealed: boolean) {
  const socket = socketAttachment(peer)
  if (socket.serializeAttachment) {
    socket.serializeAttachment({ ...attachmentValue(peer), revealed })
    return
  }

  developmentReveals.set(peer.id, revealed)
}

function isRevealed(peer: RoomPeer): boolean {
  const value = attachmentValue(peer).revealed
  return typeof value === 'boolean' ? value : developmentReveals.get(peer.id) === true
}

/** Sends an error key; clients translate it into their own language. */
function sendError(peer: RoomPeer, value: string) {
  peer.send({ type: 'error', value } satisfies ServerMessage)
}

function sendToRoom(peer: RoomPeer, roomId: string, message: ServerMessage, excluded?: RoomPeer) {
  for (const candidate of peersInRoom(peer, roomId)) {
    if (candidate !== excluded)
      candidate.send(message)
  }
}

function touchRoom(roomId: string, peer: RoomPeer) {
  const store = getRoomStore()
  const state = store.read(roomId)
  state.revealedCount = peersInRoom(peer, roomId).filter(isRevealed).length
  state.lastActivity = Date.now()
  store.write(roomId, state)
  return { store, state }
}

export default defineWebSocketHandler({
  upgrade(request) {
    if (!roomIdFromUrl(request.url))
      throw new Response('A valid room ID is required.', { status: 400 })

    return {
      headers: { 'Cache-Control': 'no-store' },
    }
  },

  open(peer) {
    const roomId = peerRoomId(peer)
    if (!roomId)
      return

    const roomPeers = peersInRoom(peer, roomId)
    if (roomPeers.length > MAX_CLIENTS) {
      peer.context.rejected = true
      sendError(peer, 'roomFull')
      peer.close(1008, 'Room is full')
      return
    }

    const store = getRoomStore()
    const state = chooseNextCategory(store.read(roomId))
    state.lastActivity = Date.now()
    store.write(roomId, state)
    setRevealed(peer, false)
    peer.send({ type: 'newCategory', value: state.currentCategory } satisfies ServerMessage)
  },

  message(peer, message: RoomMessage) {
    const roomId = peerRoomId(peer)
    if (!roomId)
      return

    if (message.uint8Array().byteLength > MAX_MESSAGE_BYTES) {
      sendError(peer, 'messageTooLarge')
      return
    }

    let rawMessage: unknown
    try {
      rawMessage = message.json<unknown>()
    }
    catch {
      sendError(peer, 'invalidJson')
      return
    }

    const messageData = parseClientMessage(rawMessage)
    if (!messageData) {
      sendError(peer, 'unknownCommand')
      return
    }

    const store = getRoomStore()
    const state = store.read(roomId)

    switch (messageData.type) {
      case 'newCategory': {
        const next = chooseNextCategory({ ...state, currentCategory: '' })
        state.currentCategory = next.currentCategory
        state.usedCategories = next.usedCategories
        state.revealedCount = 0
        state.lastActivity = Date.now()
        for (const candidate of peersInRoom(peer, roomId))
          setRevealed(candidate, false)
        store.write(roomId, state)
        sendToRoom(peer, roomId, { type: 'newCategory', value: state.currentCategory })
        return
      }
      case 'playerInput':
        state.lastActivity = Date.now()
        store.write(roomId, state)
        sendToRoom(peer, roomId, { type: 'playerInput', value: messageData.value }, peer)
        return
      case 'reveal': {
        if (isRevealed(peer))
          return

        setRevealed(peer, true)
        const roomPeers = peersInRoom(peer, roomId)
        state.revealedCount = roomPeers.filter(isRevealed).length
        state.lastActivity = Date.now()
        store.write(roomId, state)
        sendToRoom(peer, roomId, { type: 'peerRevealed' }, peer)

        if (state.revealedCount >= roomPeers.length && roomPeers.length > 0) {
          for (const candidate of roomPeers)
            setRevealed(candidate, false)
          state.revealedCount = 0
          store.write(roomId, state)
          sendToRoom(peer, roomId, { type: 'allRevealed' })
        }
        return
      }
      case 'streak':
        state.lastActivity = Date.now()
        store.write(roomId, state)
        sendToRoom(peer, roomId, { type: 'streak', value: Math.min(5, Math.max(0, messageData.value)) }, peer)
        return
      case 'resetStreak':
        state.lastActivity = Date.now()
        store.write(roomId, state)
        sendToRoom(peer, roomId, { type: 'resetStreak' }, peer)
    }
  },

  async close(peer) {
    developmentReveals.delete(peer.id)
    if (peer.context.rejected)
      return

    const roomId = peerRoomId(peer)
    if (!roomId)
      return

    const { store } = touchRoom(roomId, peer)
    await store.scheduleExpiry()
  },

  error(peer, error) {
    console.warn(JSON.stringify({ event: 'room_socket_error', peer: peer.id, message: error.message }))
  },
})
