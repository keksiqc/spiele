/** Upgrades are routed by the Worker entry before reaching Nitro's HTTP handler. */
export default defineEventHandler(() => {
  throw createError({ statusCode: 426, statusMessage: 'A WebSocket upgrade is required.' })
})
