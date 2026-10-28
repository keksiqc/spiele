import type { ServerMessage } from '../../shared/game'
import type { RoomState } from './room'
import { DurableObject } from 'cloudflare:workers'
import crossws from 'crossws/adapters/cloudflare'
import { parseClientMessage } from '../../shared/game'
import { nextCategory } from './categories'
import { MAX_MESSAGE_BYTES, MAX_PLAYERS, resetRound, roomIdFromUrl } from './room'

type Hooks = NonNullable<NonNullable<Parameters<typeof crossws>[0]>['hooks']>
type Peer = Parameters<NonNullable<Hooks['open']>>[0]
type Message = Parameters<NonNullable<Hooks['message']>>[1]

const TOPIC = 'game'
const STORAGE_KEY = 'room'

function broadcast(peer: Peer, message: ServerMessage) {
  peer.send(message)
  peer.publish(TOPIC, message)
}

function sendError(peer: Peer, value: string) {
  peer.send({ type: 'error', value } satisfies ServerMessage)
}

/** Each normalized room code routes to its own object and SQLite storage. */
export class GameRoom extends DurableObject<Env> {
  private readonly ws = crossws({
    hooks: {
      open: peer => this.open(peer),
      message: (peer, message) => this.message(peer, message),
      close: peer => this.leave(peer),
      error: (peer, error) => {
        console.warn(JSON.stringify({ event: 'room_socket_error', peer: peer.id, message: error.message }))
        this.leave(peer)
        peer.close(1011, 'WebSocket error')
      },
    },
  })

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ws.handleDurableInit(this, ctx, env)
  }

  fetch(request: Request) {
    if (!roomIdFromUrl(request.url))
      return new Response('A valid room ID is required.', { status: 400 })

    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket')
      return new Response('A WebSocket upgrade is required.', { status: 426 })

    return this.ws.handleDurableUpgrade(this, request)
  }

  webSocketMessage(client: WebSocket, message: string | ArrayBuffer) {
    return this.ws.handleDurableMessage(this, client, message)
  }

  webSocketClose(client: WebSocket, code: number, reason: string, wasClean: boolean) {
    client.close()
    return this.ws.handleDurableClose(this, client, code, reason, wasClean)
  }

  webSocketError(client: WebSocket) {
    client.close(1011, 'WebSocket error')
    return this.ws.handleDurableClose(this, client, 1011, 'WebSocket error', false)
  }

  private readRoom() {
    return this.ctx.storage.kv.get<RoomState>(STORAGE_KEY)
  }

  private saveRoom(room: RoomState) {
    // Synchronous storage keeps read/modify/write within one event turn.
    this.ctx.storage.kv.put(STORAGE_KEY, room)
  }

  private open(peer: Peer) {
    let room = this.readRoom()
    if (room) {
      const connectedIds = new Set([...peer.peers]
        .filter(peer => peer.websocket.readyState === WebSocket.OPEN)
        .map(peer => peer.id))
      room.players = room.players.filter(player => connectedIds.has(player.id))
    }

    if (!room || room.players.length === 0) {
      const next = nextCategory([])
      room = {
        currentCategory: next.category,
        usedCategories: next.usedCategories,
        players: [],
        allRevealed: false,
        streak: 0,
      }
    }

    if (room.players.length >= MAX_PLAYERS) {
      sendError(peer, 'roomFull')
      peer.close(1008, 'Room is full')
      return
    }

    room.players.push({ id: peer.id, input: '', revealed: false })
    resetRound(room)
    this.saveRoom(room)
    peer.subscribe(TOPIC)
    broadcast(peer, { type: 'newCategory', value: room.currentCategory })
    peer.send({ type: 'streak', value: room.streak } satisfies ServerMessage)
  }

  private message(peer: Peer, message: Message) {
    const room = this.readRoom()
    const player = room?.players.find(player => player.id === peer.id)
    if (!room || !player)
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

    const command = parseClientMessage(rawMessage)
    if (!command) {
      sendError(peer, 'unknownCommand')
      return
    }

    switch (command.type) {
      case 'newCategory': {
        const next = nextCategory(room.usedCategories)
        room.currentCategory = next.category
        room.usedCategories = next.usedCategories
        resetRound(room)
        this.saveRoom(room)
        broadcast(peer, { type: 'newCategory', value: room.currentCategory })
        return
      }
      case 'playerInput':
        if (player.revealed || room.allRevealed)
          return
        player.input = command.value
        this.saveRoom(room)
        peer.publish(TOPIC, command satisfies ServerMessage)
        return
      case 'reveal':
        if (player.revealed || room.allRevealed)
          return

        player.revealed = true
        room.allRevealed = room.players.length === MAX_PLAYERS && room.players.every(player => player.revealed)
        this.saveRoom(room)
        peer.publish(TOPIC, { type: 'peerRevealed' } satisfies ServerMessage)
        if (room.allRevealed)
          broadcast(peer, { type: 'allRevealed' })
        return
      case 'streak':
        room.streak = Math.min(5, Math.max(0, command.value))
        this.saveRoom(room)
        peer.publish(TOPIC, { type: 'streak', value: room.streak } satisfies ServerMessage)
        return
      case 'resetStreak':
        room.streak = 0
        this.saveRoom(room)
        peer.publish(TOPIC, command satisfies ServerMessage)
    }
  }

  private leave(peer: Peer) {
    const room = this.readRoom()
    if (!room?.players.some(player => player.id === peer.id))
      return

    room.players = room.players.filter(player => player.id !== peer.id)
    if (room.players.length === 0) {
      this.ctx.storage.kv.delete(STORAGE_KEY)
    }
    else {
      resetRound(room)
      this.saveRoom(room)
      peer.publish(TOPIC, { type: 'newCategory', value: room.currentCategory } satisfies ServerMessage)
    }
  }
}
