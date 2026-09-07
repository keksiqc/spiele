export default defineEventHandler(() => ({
  runtime: 'cloudflare-workers',
  roomState: 'durable-objects',
  websocketMode: 'hibernation',
}))
