import { normalizeRoomId } from '../../shared/game'
import { nextCategory } from './categories'

export const MAX_MESSAGE_BYTES = 16 * 1024
const MAX_PLAYERS = 2

export interface Room {
  currentCategory: string
  usedCategories: string[]
  players: Set<string>
  revealedPlayers: Set<string>
}

export function roomIdFromUrl(url: string): string | null {
  try {
    return normalizeRoomId(new URL(url).searchParams.get('room'))
  }
  catch {
    return null
  }
}

/** Owns active games within one server process. Empty rooms are discarded. */
export class RoomManager {
  private readonly rooms = new Map<string, Room>()

  join(roomId: string, playerId: string): Room | null {
    let room = this.rooms.get(roomId)
    if (!room) {
      const next = nextCategory([])
      room = {
        currentCategory: next.category,
        usedCategories: next.usedCategories,
        players: new Set(),
        revealedPlayers: new Set(),
      }
      this.rooms.set(roomId, room)
    }

    if (room.players.size >= MAX_PLAYERS && !room.players.has(playerId))
      return null

    room.players.add(playerId)
    return room
  }

  get(roomId: string, playerId: string): Room | undefined {
    const room = this.rooms.get(roomId)
    return room?.players.has(playerId)
      ? room
      : undefined
  }

  nextCategory(room: Room) {
    const next = nextCategory(room.usedCategories)
    room.currentCategory = next.category
    room.usedCategories = next.usedCategories
    room.revealedPlayers.clear()
  }

  leave(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId)
    if (!room)
      return

    room.players.delete(playerId)
    room.revealedPlayers.delete(playerId)
    if (room.players.size === 0)
      this.rooms.delete(roomId)
  }
}
