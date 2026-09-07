import { describe, expect, it } from 'vitest'
import { normalizeRoomId, parseClientMessage, parseServerMessage } from '../shared/game'

describe('game protocol', () => {
  it('normalizes valid room ids and rejects unsafe values', () => {
    expect(normalizeRoomId(' ab12 ')).toBe('AB12')
    expect(normalizeRoomId('abc')).toBeNull()
    expect(normalizeRoomId('room id')).toBeNull()
  })

  it('parses and bounds player input', () => {
    expect(parseClientMessage({ type: 'playerInput', value: 'Hallo' })).toEqual({
      type: 'playerInput',
      value: 'Hallo',
    })
    expect(parseClientMessage({ type: 'streak', value: 3.9 })).toEqual({
      type: 'streak',
      value: 3,
    })
    expect(parseClientMessage({ type: 'unknown' })).toBeNull()
  })

  it('accepts server messages with the expected shape', () => {
    expect(parseServerMessage({ type: 'newCategory', value: 'Tiere' })).toEqual({
      type: 'newCategory',
      value: 'Tiere',
    })
    expect(parseServerMessage({ type: 'streak', value: 12 })).toEqual({
      type: 'streak',
      value: 5,
    })
  })
})
