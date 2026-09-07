export const MIN_ROOM_ID_LENGTH = 4
export const MAX_ROOM_ID_LENGTH = 12
export const MAX_INPUT_LENGTH = 120
export const ROOM_ID_PATTERN = /^[A-Z0-9]{4,12}$/

export type ClientMessage
  = | { type: 'newCategory' }
    | { type: 'playerInput', value: string }
    | { type: 'reveal' }
    | { type: 'streak', value: number }
    | { type: 'resetStreak' }

export type ServerMessage
  = | { type: 'playerInput', value: string }
    | { type: 'reveal' }
    | { type: 'streak', value: number }
    | { type: 'resetStreak' }
    | { type: 'newCategory', value: string }
    | { type: 'allRevealed' }
    | { type: 'error', value: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeRoomId(value: unknown): string | null {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim().toUpperCase()
  if (normalized.length < MIN_ROOM_ID_LENGTH || normalized.length > MAX_ROOM_ID_LENGTH)
    return null
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string')
    return null

  switch (value.type) {
    case 'newCategory':
      return { type: 'newCategory' }
    case 'reveal':
      return { type: 'reveal' }
    case 'resetStreak':
      return { type: 'resetStreak' }
    case 'playerInput':
      return typeof value.value === 'string'
        ? { type: 'playerInput', value: value.value.slice(0, MAX_INPUT_LENGTH) }
        : null
    case 'streak':
      return typeof value.value === 'number' && Number.isFinite(value.value)
        ? { type: 'streak', value: Math.trunc(value.value) }
        : null
    default:
      return null
  }
}

export function parseServerMessage(value: unknown): ServerMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string')
    return null

  switch (value.type) {
    case 'playerInput':
      return typeof value.value === 'string'
        ? { type: 'playerInput', value: value.value.slice(0, MAX_INPUT_LENGTH) }
        : null
    case 'reveal':
      return { type: 'reveal' }
    case 'streak':
      return typeof value.value === 'number' && Number.isFinite(value.value)
        ? { type: 'streak', value: Math.min(5, Math.max(0, Math.trunc(value.value))) }
        : null
    case 'resetStreak':
      return { type: 'resetStreak' }
    case 'newCategory':
      return typeof value.value === 'string' ? { type: 'newCategory', value: value.value } : null
    case 'allRevealed':
      return { type: 'allRevealed' }
    case 'error':
      return typeof value.value === 'string' ? { type: 'error', value: value.value } : null
    default:
      return null
  }
}
