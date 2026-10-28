import { describe, expect, it } from 'vitest'
import { categories, nextCategory } from '../server/game/categories'
import { roomIdFromUrl } from '../server/game/room'

describe('room URL', () => {
  it('normalizes valid IDs and rejects missing or invalid IDs', () => {
    expect(roomIdFromUrl('https://example.com/ws?room=ab12')).toBe('AB12')
    expect(roomIdFromUrl('https://example.com/ws')).toBeNull()
    expect(roomIdFromUrl('https://example.com/ws?room=bad')).toBeNull()
    expect(roomIdFromUrl('invalid URL')).toBeNull()
  })
})

describe('room categories', () => {
  it('uses every category before repeating', () => {
    let history: string[] = []
    for (let index = 0; index < categories.length; index++) {
      const next = nextCategory(history)
      expect(history).not.toContain(next.category)
      history = next.usedCategories
    }
    expect(history).toHaveLength(categories.length)
    const next = nextCategory(history)
    expect(next.usedCategories).toEqual([next.category])
  })
})
