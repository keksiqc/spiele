import type { ClientMessage, ServerMessage } from '../shared/game'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MAX_MESSAGE_BYTES } from '../server/game/room'

/** Miniflare is supplied by Wrangler; these tests run the actual Nuxt build. */
const modulesRoot = resolve('.output/server')
const mf = new Miniflare({
  workers: [
    {
      config: {
        name: 'spiele',
        compatibilityDate: '2026-09-07',
        compatibilityFlags: ['nodejs_compat'],
        manifest: {
          mainModule: 'index.mjs',
          modulesRoot,
          modules: Object.fromEntries(readdirSync(modulesRoot, { recursive: true })
            .filter((file): file is string => typeof file === 'string' && file.endsWith('.mjs'))
            .map(file => [
              file,
              {
                type: 'esm',
                contents: readFileSync(resolve(modulesRoot, file), 'utf8'),
              },
            ])),
        },
        exports: {
          GameRoom: { type: 'durable-object', storage: 'sqlite' },
        },
        env: {
          GAME_ROOMS: { type: 'durable-object', worker: 'spiele', exportName: 'GameRoom' },
        },
      },
    },
  ],
  unsafeInspectDurableObjects: true,
})

beforeAll(async () => {
  await mf.ready
})
afterAll(async () => {
  await mf.dispose()
})

async function connect(room: string) {
  const response = await mf.dispatchFetch(`https://game.test/ws?room=${room}`, {
    headers: { Upgrade: 'websocket' },
  })
  expect(response.status).toBe(101)
  const socket = response.webSocket!
  const messages: ServerMessage[] = []
  socket.addEventListener('message', (event) => {
    messages.push(JSON.parse(String(event.data)) as ServerMessage)
  })
  socket.accept()

  return {
    socket,
    messages,
    send: (message: ClientMessage) => socket.send(JSON.stringify(message)),
    async next(type: ServerMessage['type']) {
      await expect.poll(() => messages.some(message => message.type === type)).toBe(true)
      return messages.splice(messages.findIndex(message => message.type === type), 1)[0]!
    },
  }
}

async function join(room: string) {
  const player = await connect(room)
  const category = await player.next('newCategory')
  const streak = await player.next('streak')
  return { ...player, category, streak }
}

describe('cloudflare game rooms', () => {
  it('validates upgrades and continues serving normal HTTP routes', async () => {
    expect((await mf.dispatchFetch('https://game.test/ws')).status).toBe(400)
    expect((await mf.dispatchFetch('https://game.test/ws?room=AB12')).status).toBe(426)
    expect(await (await mf.dispatchFetch('https://game.test/health')).json()).toEqual({ status: 'ok' })
    const page = await mf.dispatchFetch('https://game.test/assoziationsspiel')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('<html')
  })

  it('shares normalized rooms, rejects a third player, and isolates other rooms', async () => {
    const alice = await join('ab12')
    const bob = await join('AB12')
    expect(bob.category).toEqual(alice.category)
    await alice.next('newCategory')

    const rejected = await connect('AB12')
    expect(await rejected.next('error')).toEqual({ type: 'error', value: 'roomFull' })

    const other = await join('CD34')
    alice.send({ type: 'playerInput', value: 'cat' })
    expect(await bob.next('playerInput')).toEqual({ type: 'playerInput', value: 'cat' })
    alice.send({ type: 'newCategory' })
    expect(await alice.next('newCategory')).toEqual(await bob.next('newCategory'))
    expect(other.messages).toEqual([])
    alice.socket.close()
    bob.socket.close()
    other.socket.close()
  })

  it('requires both players, ignores duplicate reveals, and starts a fresh round', async () => {
    const alice = await join('REVEAL')
    alice.send({ type: 'reveal' })
    // A subsequent command acts as a barrier for the preceding reveal.
    alice.send({ type: 'newCategory' })
    await alice.next('newCategory')
    expect(alice.messages).toEqual([])

    const bob = await join('REVEAL')
    await alice.next('newCategory')
    alice.send({ type: 'reveal' })
    await bob.next('peerRevealed')
    alice.send({ type: 'reveal' })
    bob.send({ type: 'reveal' })
    await alice.next('peerRevealed')
    await alice.next('allRevealed')
    await bob.next('allRevealed')
    alice.send({ type: 'reveal' })
    alice.send({ type: 'newCategory' })
    await alice.next('newCategory')
    await bob.next('newCategory')
    expect(alice.messages).toEqual([])
    expect(bob.messages).toEqual([])

    alice.send({ type: 'reveal' })
    await bob.next('peerRevealed')
    bob.send({ type: 'reveal' })
    await alice.next('allRevealed')
    await bob.next('allRevealed')
    alice.socket.close()
    bob.socket.close()
  })

  it('restores membership, category history, reveal state, and topics after hibernation', async () => {
    const alice = await join('SLEEP')
    const bob = await join('SLEEP')
    await alice.next('newCategory')
    alice.send({ type: 'reveal' })
    await bob.next('peerRevealed')

    await mf.unsafeEvictDurableObject('spiele', 'GameRoom', { name: 'SLEEP', webSockets: 'hibernate' })

    bob.send({ type: 'reveal' })
    await alice.next('allRevealed')
    await bob.next('allRevealed')
    bob.send({ type: 'newCategory' })
    const category = await alice.next('newCategory')
    expect(category).toEqual(await bob.next('newCategory'))
    expect(category).not.toEqual(alice.category)
    const rejected = await connect('SLEEP')
    expect(await rejected.next('error')).toEqual({ type: 'error', value: 'roomFull' })
    alice.socket.close()
    bob.socket.close()
  })

  it('frees departed slots and clears an empty room', async () => {
    const alice = await join('LEAVE')
    const bob = await join('LEAVE')
    await alice.next('newCategory')
    alice.send({ type: 'streak', value: 4 })
    await bob.next('streak')
    bob.socket.close()
    await alice.next('newCategory')

    const replacement = await join('LEAVE')
    expect(replacement.category).toEqual(alice.category)
    await alice.next('newCategory')
    replacement.socket.close()
    await alice.next('newCategory')
    await new Promise<void>((resolve) => {
      alice.socket.addEventListener('close', () => resolve(), { once: true })
      alice.socket.close()
    })

    const fresh = await join('LEAVE')
    expect(fresh.streak).toEqual({ type: 'streak', value: 0 })
    fresh.socket.close()
  })

  it('rejects malformed and oversized commands without breaking the connection', async () => {
    const alice = await join('VALID')
    alice.socket.send('{')
    expect(await alice.next('error')).toEqual({ type: 'error', value: 'invalidJson' })
    alice.socket.send('{"type":"unknown"}')
    expect(await alice.next('error')).toEqual({ type: 'error', value: 'unknownCommand' })
    alice.socket.send('x'.repeat(MAX_MESSAGE_BYTES + 1))
    expect(await alice.next('error')).toEqual({ type: 'error', value: 'messageTooLarge' })
    alice.send({ type: 'newCategory' })
    await alice.next('newCategory')
    alice.socket.close()
  })
})
