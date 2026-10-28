import nitroHandler from 'nitropack/presets/cloudflare/runtime/cloudflare-module'
import { roomIdFromUrl } from './game/room'

export { GameRoom } from './game/durable-room'

export default {
  ...nitroHandler,
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (new URL(request.url).pathname !== '/ws')
      return nitroHandler.fetch(request, env, ctx)

    const roomId = roomIdFromUrl(request.url)
    if (!roomId)
      return new Response('A valid room ID is required.', { status: 400 })

    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket')
      return new Response('A WebSocket upgrade is required.', { status: 426 })

    return env.GAME_ROOMS.getByName(roomId).fetch(request)
  },
}
