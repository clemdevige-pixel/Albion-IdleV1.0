# Albion Idle — Coding Agent Rules

Read before modifying gameplay architecture.

Primary detailed contract:
`AI_BIBLE/20_DATA/20A_DATA_OWNERSHIP_AND_AGENT_RULES.txt`

Hero weapon spritesheet integration contract:
`AI_BIBLE/30_TECHNICAL/32B_HERO_WEAPON_SPRITESHEET_INTEGRATION_WORKFLOW.md`

## Mandatory ownership rules

- `packages/data` owns authored static gameplay truth: balance, costs, rates, tier tables, canonical IDs/mappings, authored recipes and unlock graphs.
- `packages/gameplay` owns domain rules, calculations, validation, transactions and state transitions.
- `packages/shared` owns transport-agnostic contracts/DTOs and technical constants shared by client/server; it must not absorb gameplay/data/runtime ownership.
- `apps/client` owns React/Phaser presentation, adapters, bootstrapping and client orchestration.
- Do not introduce React/Phaser/runtime state into `packages/data`.
- Do not duplicate authored values across client/gameplay/server.
- Prefer derivation from an existing canonical contract over another synchronized table.
- A compatibility facade may re-export but must not contain a second copy of authored truth.
- Do not move algorithms into `packages/data` just to make the client smaller.
- Do not rebalance values during an architecture move unless explicitly requested.
- When documentation and validated live code/data disagree, do not silently change runtime behavior. Confirm intent and update stale documentation.
- Current enchantment shard costs are `10 / 30 / 60 / 100` for transitions `.1 / .2 / .3 / .4`.
- Keep precise type domains; do not widen/cast to hide an ownership/type mistake.
- Do not rely on array ordering as an implicit ID contract when explicit keyed IDs can be authored.
- Do not launch big-bang refactors. Migrate coherent low-risk slices and validate each pass.
- `GameProvider` is the composition function inside `apps/client/src/state/GameContext.tsx`; its size alone is not justification for another abstraction layer.
- Do not convert TypeScript config to JSON/CSV merely for architecture theatre. Data-driven means one authoritative reusable source with clean ownership.

## Enforced package boundaries

`pnpm lint` also runs `pnpm validate:architecture`.

The executable guard currently enforces the existing dependency direction:
- `packages/shared` must remain transport-agnostic and must not depend on other `@game/*` domain/app packages or React/Phaser/Fastify.
- `packages/core` must not depend on other `@game/*` packages or React/Phaser/Fastify.
- `packages/data` must not depend on core/persistence/gameplay or React/Phaser/Fastify.
- `packages/persistence` must not depend on data/gameplay or React/Phaser/Fastify.
- `packages/gameplay` must remain independent from React/Phaser/Fastify and app-layer source files.
- Low-level packages must not escape through relative imports into `apps/client` or `apps/server`.
- `apps/client` and `apps/server` must not import or depend on each other directly; shared contracts belong in the appropriate `packages/*` boundary.

Do not disable or bypass these guards to make a feature compile. If a future architecture decision genuinely changes a boundary, update the documented contract and the guard together.

## Build / CI rules

- Production builds must remain separated from tests via the dedicated build tsconfigs.
- Tests remain covered by typecheck/test.
- General CI must continue running on `main` and the active integration branch `agent/albion-idle-development` while it remains active.
- Do not hardcode a second client build version in persistence/runtime; `apps/client/package.json` is the current version source.
- Local development must not target the production Render API by default. Cloud/backend E2E testing must opt in through a local ignored environment override or deployed environment configuration.

## Standard validation after architecture/data changes

```powershell
pnpm.cmd lint; pnpm.cmd typecheck; pnpm.cmd test; pnpm.cmd build; pnpm.cmd exec tsx scripts/runtime-blue-deterministic-check.ts
```

Run `validate:data` / `validate:assets` as well when those contracts are affected.

## Current audit status

- P0 infrastructure audit fixes: CLOSED.
- P1 authored-data ownership cleanup: CLOSED and validated green on 2026-08-25.
- P3 persistence / cloud backend for current beta scope: CLOSED; Render API and PostgreSQL/Supabase persistence are integrated, with local fallback and account-save migration safeguards.
- P6 architecture/quality guardrails: CLOSED and validated green on 2026-09-02.
- P2 broader server-authority migration remains deferred; do not move gameplay authority server-side as a big-bang rewrite.
