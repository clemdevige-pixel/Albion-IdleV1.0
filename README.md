# Albion Idle

Albion Idle is a PC-focused 2D pixel-art idle RPG / incremental side-scroller inspired by Albion Online systems. The project is a TypeScript pnpm monorepo built around a deterministic gameplay runtime, a React UI, and a Phaser 3 presentation layer.

## Project state

The project is no longer in prototype-foundation mode. The core architecture is established and the active work is primarily gameplay/content production, balancing, presentation, and targeted hardening.

Current implemented foundations include:

- deterministic combat runtime and world progression;
- progression/farm navigation across the world bands;
- T3 onboarding and authored progression through T8 where applicable;
- equipment, Item Power, enchantment, quality, durability and repair;
- weapon-family / specialization masteries;
- gathering, refining, crafting and workers;
- player island progression and production infrastructure;
- faction systems, faction artifacts and faction dungeons;
- dungeon completion rewards, keys and related progression data;
- endgame systems under active validation, including the Endless Tower and Black Market;
- local persistence, save/load migrations and background/offline progression;
- React ↔ gameplay ↔ Phaser separation through GameBridge and presentation controllers;
- data-driven content registries and validation tooling.

PvP, guilds and a player marketplace remain outside the current gameplay scope.

Authentication / cloud-save code exists in the repository, but backend hosting/infrastructure is not the current development priority. Local persistence remains the reliable development baseline.

## Core architecture

```text
React UI
   │
   ▼
GameBridge / application adapters
   │
   ▼
Authoritative gameplay runtime
   │
   ├──────────────► Persistence
   │
   ▼
Presentation runtime
   │
   ▼
Phaser 3 renderer
```

Content follows the data-driven path:

```text
Authored content / config
        │
        ▼
@game/data registries + validation
        │
        ▼
@game/gameplay
        │
        ▼
Client view-models / presentation
```

### Workspace packages

- `apps/client` — React UI, HUD, application composition and Phaser presentation.
- `apps/server` — Fastify backend/auth/cloud-save support.
- `packages/core` — deterministic runtime primitives, ECS, scheduler, event bus and RNG.
- `packages/gameplay` — authoritative gameplay rules and runtimes.
- `packages/data` — canonical authored balance/content configuration, registries and schemas.
- `packages/persistence` — save/load, providers, snapshots, migrations and validation.
- `packages/shared` — transport-agnostic shared contracts and constants.
- `packages/tooling` — validation and asset/data tooling.
- `AI_BIBLE` — design and system specifications.

## Development rules

1. **Code + canonical data + tests are the technical source of truth.** Do not trust old handoff/roadmap documents over the current repository.
2. **Reuse existing architecture before creating a new layer.** Avoid wrappers, parallel managers and duplicate catalogs.
3. **Keep gameplay authoritative outside React and Phaser.** UI/presentation consumes view-models; it does not decide gameplay outcomes.
4. **Keep content data-driven.** Balance/content values belong in canonical data/config sources, not scattered UI constants.
5. **Prefer targeted refactors.** Do not rewrite stable systems without a demonstrated blocking problem.
6. **Protect persistent/runtime invariants with contract tests.** Avoid diagnostic-only tests that only print calibration data.
7. **Background/offline time must remain deterministic.** Long absences must use bulk/background resolution, not massive fake tick replays.

## Local development

### Prerequisites

- Node.js `>=22`
- pnpm `>=9.15.0`

On Windows PowerShell, use `pnpm.cmd` when script execution policy blocks `pnpm.ps1`.

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

### Main verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Useful targeted checks also exist under `scripts/`, including deterministic runtime checks.

## Repository structure

```text
apps/
  client/
  server/
packages/
  core/
  data/
  gameplay/
  persistence/
  shared/
  tooling/
AI_BIBLE/
assets/
content/
docs/
scripts/
```

## Documentation policy

The repository intentionally does **not** maintain a conversational handoff document as a live source of truth. Those documents become stale too quickly on this project.

For future work:

- inspect the current branch first;
- read the relevant AI_BIBLE section for design intent;
- inspect the owning gameplay/data/runtime modules;
- use current tests as executable contracts;
- update durable system documentation only when it describes a stable rule rather than a temporary project snapshot.

The README is an orientation document, not a frozen roadmap.
