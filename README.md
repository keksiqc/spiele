# spiele.keksi.dev

The association game rebuilt as a Nuxt 4 application with Tailwind CSS and Cloudflare Workers. The old Go server and standalone Vite client are no longer part of the runtime.

The app uses Nitro's recommended `cloudflare_durable` preset. Nitro owns the generated `$DurableObject` Worker class and the CrossWS WebSocket adapter; logical rooms are isolated by room ID and stored as rows in the object's SQLite database. WebSockets use Cloudflare's Hibernation API, so idle connections do not keep a Worker invocation running.

## Setup

This repository uses Bun:

```bash
bun install
bun run cf-typegen
```

## Development

Use Nuxt's development server for the UI:

```bash
bun run dev
```

Nuxt's development server uses [`wrangler.dev.jsonc`](./wrangler.dev.jsonc), which deliberately contains no Durable Object binding. It uses an in-memory room store for fast UI work. Use the Worker preview below when testing Nitro's generated `$DurableObject`, SQLite state, and WebSockets.

To exercise the built Worker, including the `/ws` Durable Object route:

```bash
bun run preview
```

The Worker preview is available at the URL Wrangler prints, usually `http://localhost:8787`.

## Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Deploy

Authenticate Wrangler once, then deploy the Nuxt output, static assets, and Durable Object binding:

```bash
bunx wrangler login
bun run deploy
```

The Durable Object SQLite export and migration settings are declared in [`wrangler.jsonc`](./wrangler.jsonc). The configuration uses Nitro's `$DurableObject` class rather than the previous custom `Room` class. If the old `Room` Worker has already been deployed, treat this as a Durable Object class/binding migration before deploying to production.
