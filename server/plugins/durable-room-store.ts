import { getDurableRoomStore, registerDurableRoomStore, roomIdFromUrl } from '../game/room-store'

interface DurableContextLike {
  getWebSockets: () => WebSocket[]
}

interface DurableObjectLike {
  ctx?: DurableContextLike
}

interface SocketAttachment {
  u?: unknown
}

function activeRoomIds(durable: unknown): string[] {
  const context = (durable as DurableObjectLike).ctx
  if (!context)
    return []

  return context.getWebSockets().flatMap((socket) => {
    const attachment = (socket as WebSocket & { deserializeAttachment?: () => unknown }).deserializeAttachment?.()
    if (!attachment || typeof attachment !== 'object' || !('u' in attachment))
      return []

    const url = (attachment as SocketAttachment).u
    return typeof url === 'string' ? [roomIdFromUrl(url)].filter((roomId): roomId is string => roomId !== null) : []
  })
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:durable:init', async (_durable, { state }) => {
    const store = registerDurableRoomStore(state)
    await state.blockConcurrencyWhile(async () => {
      store.initialize()
    })
  })

  nitroApp.hooks.hook('cloudflare:durable:alarm', async (durable) => {
    await getDurableRoomStore()?.expireInactiveRooms(activeRoomIds(durable))
  })
})
