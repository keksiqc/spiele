import { describe, expect, it } from 'vitest'
import { categories } from '../server/game/categories'
import { roomIdFromUrl, RoomManager } from '../server/game/room-manager'

describe('room manager', () => {
  it('shares a category between two players and rejects additional players', () => {
    const rooms = new RoomManager()
    const room = rooms.join('AB12', 'alice')

    expect(room?.currentCategory).toBeTruthy()
    expect(rooms.join('AB12', 'bob')).toBe(room)
    expect(rooms.join('AB12', 'charlie')).toBeNull()
    expect(rooms.get('AB12', 'charlie')).toBeUndefined()
    expect(room?.players).toEqual(new Set(['alice', 'bob']))
  })

  it('isolates rooms and ignores departures from rejected players', () => {
    const rooms = new RoomManager()
    const first = rooms.join('AB12', 'alice')
    const second = rooms.join('CD34', 'bob')

    rooms.leave('AB12', 'charlie')

    expect(first).not.toBe(second)
    expect(rooms.get('AB12', 'alice')).toBe(first)
    expect(rooms.get('AB12', 'bob')).toBeUndefined()
    expect(rooms.get('CD34', 'bob')).toBe(second)
  })

  it('keeps the game for remaining players and frees a departed player slot', () => {
    const rooms = new RoomManager()
    const room = rooms.join('AB12', 'alice')!
    rooms.join('AB12', 'bob')
    room.revealedPlayers.add('alice')

    rooms.leave('AB12', 'alice')

    expect(rooms.get('AB12', 'alice')).toBeUndefined()
    expect(rooms.get('AB12', 'bob')).toBe(room)
    expect(room.revealedPlayers.size).toBe(0)
    expect(rooms.join('AB12', 'charlie')).toBe(room)
  })

  it('discards empty rooms, including their previous reveal and category history', () => {
    const rooms = new RoomManager()
    const oldRoom = rooms.join('AB12', 'alice')!
    oldRoom.revealedPlayers.add('alice')
    rooms.leave('AB12', 'alice')

    const newRoom = rooms.join('AB12', 'bob')!

    expect(newRoom).not.toBe(oldRoom)
    expect(newRoom.usedCategories).toEqual([newRoom.currentCategory])
    expect(newRoom.players).toEqual(new Set(['bob']))
    expect(newRoom.revealedPlayers.size).toBe(0)
  })

  it('resets reveal status each round and uses every category before repeating', () => {
    const rooms = new RoomManager()
    const room = rooms.join('AB12', 'alice')!
    const seen = new Set([room.currentCategory])
    room.revealedPlayers.add('alice')

    for (let index = 1; index < categories.length; index++) {
      rooms.nextCategory(room)
      expect(seen.has(room.currentCategory)).toBe(false)
      seen.add(room.currentCategory)
    }

    expect(room.revealedPlayers.size).toBe(0)
    expect(seen.size).toBe(categories.length)
    rooms.nextCategory(room)
    expect(room.usedCategories).toEqual([room.currentCategory])
  })
})

describe('room URL', () => {
  it('normalizes valid IDs and rejects missing or invalid IDs', () => {
    expect(roomIdFromUrl('https://example.com/ws?room=ab12')).toBe('AB12')
    expect(roomIdFromUrl('https://example.com/ws')).toBeNull()
    expect(roomIdFromUrl('https://example.com/ws?room=bad')).toBeNull()
    expect(roomIdFromUrl('invalid URL')).toBeNull()
  })
})
