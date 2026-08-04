# Albion Idle

Idle/incremental game inspired by Albion Online systems. This repository is a
TypeScript monorepo containing the game client, backend, and shared tooling.

> **Project state: Phase 02.2 — Entity Framework (engine only).**
> The technical skeleton and the deterministic simulation engine (`@game/core`)
> exist. No gameplay systems are implemented yet.

## Source of truth

The design and technical specifications live in [`AI_BIBLE/`](./AI_BIBLE). **The
AI Bible always prevails over the code.** If code and the Bible disagree, the
Bible is correct and the code must be changed — not the reverse.

## Stack

- **Monorepo:** pnpm workspaces, TypeScript (strict), Node.js LTS (pinned via `.nvmrc`).
- **Client:** React (UI) + Vite (tooling) + Phaser (world rendering).
- **Server:** Node.js + Fastify.
- **Validation:** Zod (shared contracts, content/asset validation).
- **Tests:** Vitest.

## Prerequisites

- Node.js as pinned in [`.nvmrc`](./.nvmrc).
- [pnpm](https://pnpm.io) via Corepack: `corepack enable`.

## Install

```bash
pnpm install
```

## Local development

```bash
pnpm dev
```

Runs the client (Vite, http://localhost:5173) and the server (Fastify) in
parallel. Copy [`.env.example`](./.env.example) to `.env` to override defaults.

## Available commands

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `pnpm dev`             | Run client and server in watch mode.            |
| `pnpm build`           | Type-check + build every workspace.             |
| `pnpm typecheck`       | Type-check the whole monorepo.                  |
| `pnpm lint`            | Lint with ESLint (typed rules).                 |
| `pnpm test`            | Run the Vitest suite across all packages.       |
| `pnpm format`          | Format the repo with Prettier.                  |
| `pnpm format:check`    | Verify formatting without writing.              |
| `pnpm validate:data`   | Validate content against its schemas.           |
| `pnpm validate:assets` | Validate the asset manifest against its schema. |

## Monorepo structure

```text
apps/
  client/    React + Vite + Phaser client (UI shell + Phaser bootstrap scene)
  server/    Fastify backend (technical /health endpoint)
packages/
  shared/    Transport-agnostic contracts, DTOs and constants (@game/shared)
  core/      Deterministic simulation engine — Runtime Core + Entity Framework (@game/core)
  data/      Content/asset schemas and validating loaders (@game/data)
  tooling/   Content & asset validation logic and CLIs (@game/tooling)
content/     Game content data (JSON) — minimal but valid for Phase 01
assets/      Asset manifests
AI_BIBLE/    Design & technical specifications (source of truth)
.github/     CI workflow
```

### Responsibilities & boundaries

- **`@game/shared`** contains only code safe for both client and server. It must
  not depend on React, Phaser, Fastify, or Node-specific APIs.
- **`@game/core`** is the deterministic simulation engine (fixed-timestep loop,
  clock, RNG, scheduler, event bus, and a lightweight Entity–Component–System world).
  It owns no gameplay and must stay free of React/Phaser/Fastify/Node/DOM. See
  [`packages/core/README.md`](packages/core/README.md).
- **`@game/data`** owns content/asset schemas and their loaders (data, not rules).
- **`@game/tooling`** provides validation used by scripts and CI.
- **client** — React owns the UI; Phaser owns the world. React does not drive the
  frame-by-frame simulation; Phaser does not own persistent player data. The
  Phaser configuration lives outside React components (`src/game/`).
- **server** — Fastify route handlers are thin transport adapters. `buildServer()`
  (in `src/app.ts`) is separate from network start-up (`src/server.ts`) so it can
  be tested via `app.inject()`.

## Roadmap

Implementation order is defined in
[`AI_BIBLE/30_TECHNICAL/37_IMPLEMENTATION_PLAN.txt`](./AI_BIBLE/30_TECHNICAL/37_IMPLEMENTATION_PLAN.txt).
This repository currently covers **Phase 01** (bootstrap), **Phase 02.1** (Runtime
Core) and **Phase 02.2** (Entity Framework), all in `@game/core`. Phase 02.3 (Data
Runtime) has not started.
