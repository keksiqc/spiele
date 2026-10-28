# spiele.keksi.dev

A two-player association game built with Nuxt 4 and Cloudflare Durable Objects.

Each room code selects one `GameRoom` Durable Object. The object owns its sockets and stores game state in SQLite-backed storage. CrossWS, included with Nitro, handles WebSocket subscriptions and hibernation. Hibernation lets an idle object sleep while players stay connected.

Category history, membership, reveal status, and streak survive hibernation. Both players must reveal before the answers become visible. Joining or leaving resets the current round with the same category. The room clears its state when the last player leaves.

## Development

Install dependencies with Bun:

```bash
bun install
```

Start the game in the local Cloudflare runtime:

```bash
bun run dev
```

This command builds Nuxt and starts Wrangler, usually at `http://localhost:8787`. It uses local Durable Objects and storage. It does not connect to production rooms.

This workflow serves a production build without hot reload. After editing the source, rebuild Nuxt in another terminal:

```bash
bun run build
```

Wrangler reloads the changed build. To preview an existing build, run `bun run preview`.

## Verification

Run the source checks and unit tests:

```bash
bun run lint
bun run typecheck
bun run test
```

Run the game against the local Cloudflare runtime:

```bash
bun run test:integration
```

This command builds Nuxt and uses the simulator included with Wrangler. Tests cover room isolation, capacity, reveal coordination, disconnects, validation, and recovery after forced hibernation.

## Deployment

Sign in to Cloudflare and deploy:

```bash
bunx wrangler login
bun run deploy
```

The configuration in `wrangler.jsonc` binds `GAME_ROOMS` to `GameRoom` and creates its SQLite-backed namespace. The Worker entry routes `/ws` to the object for the normalized room code. Nitro handles the other requests, and Cloudflare serves the static assets.

To validate the deployment bundle without publishing it, run:

```bash
bun run build
bunx wrangler deploy --dry-run
```

After changing Cloudflare bindings, regenerate the types with `bun run cf:types`. The install preparation step also generates these types.
