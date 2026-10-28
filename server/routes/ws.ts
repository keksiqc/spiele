import type { ServerMessage } from '../../shared/game'
import { parseClientMessage } from '../../shared/game'
import { MAX_MESSAGE_BYTES, roomIdFromUrl, RoomManager } from '../game/room-manager'

type WebSocketHooks = Parameters<typeof defineWebSocketHandler>[0]
type RoomPeer = Parameters<NonNullable<WebSocketHooks['open']>>[0]

const rooms = new RoomManager()

function roomTopic(roomId: string) {
  return `room:${roomId}`
}

/** CrossWS publish excludes the sender; room-wide events also need a direct send. */
function broadcast(peer: RoomPeer, roomId: string, message: ServerMessage) {
  peer.send(message)
  peer.publish(roomTopic(roomId), message)
}

function sendError(peer: RoomPeer, value: string) {
  peer.send({ type: 'error', value } satisfies ServerMessage)
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
    const roomId = roomIdFromUrl(peer.request.url)
    if (!roomId)
      return

    const room = rooms.join(roomId, peer.id)
    if (!room) {
      sendError(peer, 'roomFull')
      peer.close(1008, 'Room is full')
      return
    }

    peer.subscribe(roomTopic(roomId))
    peer.send({ type: 'newCategory', value: room.currentCategory } satisfies ServerMessage)
  },

  message(peer, message) {
    const roomId = roomIdFromUrl(peer.request.url)
    if (!roomId)
      return

    const room = rooms.get(roomId, peer.id)
    if (!room)
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

    const topic = roomTopic(roomId)
    switch (messageData.type) {
      case 'newCategory':
        rooms.nextCategory(room)
        broadcast(peer, roomId, { type: 'newCategory', value: room.currentCategory })
        return
      case 'playerInput':
        peer.publish(topic, { type: 'playerInput', value: messageData.value } satisfies ServerMessage)
        return
      case 'reveal': {
        if (room.revealedPlayers.has(peer.id))
          return

        room.revealedPlayers.add(peer.id)
        peer.publish(topic, { type: 'peerRevealed' } satisfies ServerMessage)

        if (room.revealedPlayers.size === room.players.size) {
          room.revealedPlayers.clear()
          broadcast(peer, roomId, { type: 'allRevealed' })
        }
        return
      }
      case 'streak':
        peer.publish(topic, {
          type: 'streak',
          value: Math.min(5, Math.max(0, messageData.value)),
        } satisfies ServerMessage)
        return
      case 'resetStreak':
        peer.publish(topic, { type: 'resetStreak' } satisfies ServerMessage)
    }
  },

  close(peer) {
    const roomId = roomIdFromUrl(peer.request.url)
    if (!roomId)
      return

    peer.unsubscribe(roomTopic(roomId))
    rooms.leave(roomId, peer.id)
  },

  error(peer, error) {
    console.warn(JSON.stringify({ event: 'room_socket_error', peer: peer.id, message: error.message }))
  },
})
