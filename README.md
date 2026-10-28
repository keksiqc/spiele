# spiele.keksi.dev

The two-player association game uses Nuxt 4, Tailwind CSS, and Nitro WebSockets. Run the application as one Node.js or Bun server.

The `/ws` route uses Nitro's `defineWebSocketHandler` and CrossWS room topics. A plain TypeScript room manager keeps category history, membership, and reveal status in memory. The server discards a room when its last player leaves. Restarting the server ends all active games.

## Setup

This repository uses Bun:

```bash
bun install
```

## Development

Start Nuxt's development server:

```bash
bun run dev
```

To preview a production build:

```bash
bun run build
bun run preview
```

Open the URL that Nuxt prints, usually `http://localhost:3000`.

## Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Deploy

Build the application and start the generated Node.js server:

```bash
bun run build
bun run start
```

The start command runs `node .output/server/index.mjs`. Deploy the entire `.output/` directory to a host that supports a long-running Node.js process and WebSocket connections. Set `HOST` and `PORT` to change the listening address. Configure any reverse proxy to forward WebSocket upgrades.

For Bun, select Nitro's Bun preset when building, then start the generated server:

```bash
NITRO_PRESET=bun bun run build
bun .output/server/index.mjs
```

Run one server process. Room state and topic subscriptions belong to that process. Multiple processes require shared room coordination and message delivery. A shared database alone does not provide either connection routing or broadcasts.

Cloudflare Workers and short-lived serverless functions need a different room coordination backend. Selecting a deployment preset alone does not make in-memory games work across isolated or suspended instances. Static generation cannot serve the WebSocket game.
