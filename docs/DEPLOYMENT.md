# Albion Idle deployment

The public game consists of three independent services:

1. the React/Vite client (Vercel);
2. the Fastify API (`Dockerfile.server`);
3. a PostgreSQL database.

Local saves remain available, while authenticated slots are synchronized with
the API. PostgreSQL is mandatory when the API runs with `NODE_ENV=production`.

## 1. PostgreSQL

Create a PostgreSQL database with a provider of your choice and keep its
connection string. The API creates its authentication, OAuth-flow and cloud-save
tables at startup; there is no separate migration command for this first
version.

## 2. Public API on Render

The repository includes `render.yaml`. In Render, create a new Blueprint and
connect the GitHub repository. Render detects the API service, builds
`Dockerfile.server` from the repository root and checks `/health` before making
the deployment live.

During Blueprint creation, Render asks for the variables marked as secrets.
Provide:

```text
NODE_ENV=production
SERVER_HOST=0.0.0.0
DATABASE_URL=<postgres connection string>
CLIENT_ORIGIN=https://<your-vercel-domain>
DISCORD_CLIENT_ID=<discord application id>
DISCORD_CLIENT_SECRET=<discord client secret>
DISCORD_REDIRECT_URI=https://<your-api-domain>/auth/discord/callback
```

Render provides `PORT` automatically. `SERVER_PORT` is still supported as an
explicit override on other hosts. Once deployed, verify:

```text
https://<your-api-domain>/health
```

## 3. Discord application

In the Discord Developer Portal, add this exact redirect URI:

```text
https://<your-api-domain>/auth/discord/callback
```

It must exactly match `DISCORD_REDIRECT_URI`, including the protocol, hostname
and path. Never expose `DISCORD_CLIENT_SECRET` through a `VITE_*` variable.

## 4. Vercel client

Configure the client project with:

```text
VITE_API_ORIGIN=https://<your-api-domain>
```

The Vercel project must build `apps/client` using the existing monorepo build
configuration. Redeploy after changing the environment variable because Vite
embeds public variables at build time.

## 5. Production smoke check

After both deployments are live:

1. open the Vercel URL in a private browser window;
2. connect with Discord once;
3. create or select a save slot;
4. play until an automatic save occurs;
5. close the page, reopen it and select the same slot;
6. confirm that equipment, progression and resources are restored;
7. repeat from a second browser/device to confirm the cloud path rather than
   local browser storage.

Do not use Vercel preview domains for final Discord validation unless each
preview URL is also registered as an allowed Discord redirect and API CORS
origin. The stable production domain is the intended target.
