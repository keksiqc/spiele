/// <reference path="../../worker-configuration.d.ts" />

import { normalizeRoomId } from '../../shared/game'
import { categories, nextCategory } from './categories'

export const ROOM_TIMEOUT_MS = 30 * 60 * 1000
export const MAX_MESSAGE_BYTES = 16 * 1024

export interface RoomState {
  currentCategory: string
  usedCategories: string[]
  revealedCount: number
  lastActivity: number
}

interface RoomRow extends Record<string, SqlStorageValue> {
  room_id: string
  current_category: string
  used_categories: string
  revealed_count: number
  last_activity: number
}

interface LastActivityRow extends Record<string, SqlStorageValue> {
  last_activity: number
}

export interface RoomStore {
  read: (roomId: string) => RoomState
  write: (roomId: string, state: RoomState) => void
  scheduleExpiry: () => void | Promise<void>
  expireInactiveRooms: (activeRoomIds: readonly string[]) => void | Promise<void>
}

export function initialRoomState(): RoomState {
  return {
    currentCategory: '',
    usedCategories: [],
    revealedCount: 0,
    lastActivity: Date.now(),
  }
}

export function roomIdFromUrl(url: string): string | null {
  try {
    return normalizeRoomId(new URL(url).searchParams.get('room'))
  }
  catch {
    return null
  }
}

function cloneState(state: RoomState): RoomState {
  return {
    ...state,
    usedCategories: [...state.usedCategories],
  }
}

function parseUsedCategories(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed))
      return []
    return parsed.filter((category): category is string => typeof category === 'string' && categories.includes(category))
  }
  catch {
    return []
  }
}

export class DurableRoomStore implements RoomStore {
  private initialized = false

  constructor(private readonly state: DurableObjectState) {}

  initialize() {
    if (this.initialized)
      return

    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_state (
        room_id TEXT PRIMARY KEY,
        current_category TEXT NOT NULL,
        used_categories TEXT NOT NULL,
        revealed_count INTEGER NOT NULL,
        last_activity INTEGER NOT NULL
      )
    `)
    this.initialized = true
  }

  read(roomId: string): RoomState {
    this.initialize()
    this.state.storage.sql.exec(
      `INSERT OR IGNORE INTO room_state
        (room_id, current_category, used_categories, revealed_count, last_activity)
       VALUES (?, ?, ?, ?, ?)`,
      roomId,
      '',
      '[]',
      0,
      Date.now(),
    )

    const row = this.state.storage.sql.exec<RoomRow>(
      `SELECT current_category, used_categories, revealed_count, last_activity
       FROM room_state WHERE room_id = ?`,
      roomId,
    ).toArray()[0]

    if (!row)
      return initialRoomState()

    return {
      currentCategory: row.current_category,
      usedCategories: parseUsedCategories(row.used_categories),
      revealedCount: Math.max(0, row.revealed_count),
      lastActivity: row.last_activity,
    }
  }

  write(roomId: string, state: RoomState) {
    this.initialize()
    this.state.storage.sql.exec(
      `UPDATE room_state
       SET current_category = ?, used_categories = ?, revealed_count = ?, last_activity = ?
       WHERE room_id = ?`,
      state.currentCategory,
      JSON.stringify(state.usedCategories),
      state.revealedCount,
      state.lastActivity,
      roomId,
    )
  }

  scheduleExpiry() {
    return this.state.storage.setAlarm(Date.now() + ROOM_TIMEOUT_MS)
  }

  async expireInactiveRooms(activeRoomIds: readonly string[]) {
    this.initialize()
    const active = new Set(activeRoomIds)
    const now = Date.now()
    const rows = this.state.storage.sql.exec<RoomRow>(
      'SELECT room_id, current_category, used_categories, revealed_count, last_activity FROM room_state',
    ).toArray()

    for (const row of rows) {
      if (!active.has(row.room_id) && now - row.last_activity >= ROOM_TIMEOUT_MS)
        this.write(row.room_id, initialRoomState())
    }

    const nextDeadline = this.state.storage.sql.exec<LastActivityRow>(
      'SELECT MIN(last_activity) AS last_activity FROM room_state',
    ).toArray()[0]?.last_activity

    if (typeof nextDeadline === 'number' && Number.isFinite(nextDeadline))
      await this.state.storage.setAlarm(Math.max(Date.now() + 1000, nextDeadline + ROOM_TIMEOUT_MS))
    else
      await this.state.storage.deleteAlarm()
  }
}

class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomState>()

  read(roomId: string): RoomState {
    const state = this.rooms.get(roomId)
    if (state)
      return cloneState(state)

    const next = initialRoomState()
    this.rooms.set(roomId, next)
    return cloneState(next)
  }

  write(roomId: string, state: RoomState) {
    this.rooms.set(roomId, cloneState(state))
  }

  scheduleExpiry() {}

  expireInactiveRooms() {}
}

let activeRoomStore: RoomStore | undefined
let durableRoomStore: DurableRoomStore | undefined

export function registerDurableRoomStore(state: DurableObjectState): DurableRoomStore {
  const store = new DurableRoomStore(state)
  durableRoomStore = store
  activeRoomStore = store
  return store
}

export function getDurableRoomStore(): DurableRoomStore | undefined {
  return durableRoomStore
}

export function getRoomStore(): RoomStore {
  return activeRoomStore ??= new MemoryRoomStore()
}

export function chooseNextCategory(state: RoomState) {
  if (state.currentCategory)
    return state

  const next = nextCategory(state.usedCategories)
  state.currentCategory = next.category
  state.usedCategories = next.usedCategories
  return state
}
