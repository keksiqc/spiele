import { normalizeRoomId } from '../../shared/game'

export const MAX_MESSAGE_BYTES = 16 * 1024
export const MAX_PLAYERS = 2

export interface RoomPlayer {
  id: string
  input: string
  revealed: boolean
}

export interface RoomState {
  currentCategory: string
  usedCategories: string[]
  players: RoomPlayer[]
  allRevealed: boolean
  streak: number
}

export function roomIdFromUrl(url: string): string | null {
  try {
    return normalizeRoomId(new URL(url).searchParams.get('room'))
  }
  catch {
    return null
  }
}

export function resetRound(room: RoomState) {
  room.allRevealed = false
  for (const player of room.players) {
    player.input = ''
    player.revealed = false
  }
}
