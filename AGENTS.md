# Albion Idle — Coding Agent Rules

Read before modifying gameplay architecture.

Primary detailed contract:
`AI_BIBLE/20_DATA/20A_DATA_OWNERSHIP_AND_AGENT_RULES.txt`

## Mandatory ownership rules

- `packages/data` owns authored static gameplay truth: balance, costs, rates, tier tables, canonical IDs/mappings, authored recipes and unlock graphs.
- `packages/gameplay` owns domain rules, calculations, validation, transactions and state transitions.
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

## Build / CI rules

- Production builds must remain separated from tests via the dedicated build tsconfigs.
- Tests remain covered by typecheck/test.
- General CI must continue running on `main` and the active integration branch `agent/albion-idle-development` while it remains active.
- Do not hardcode a second client build version in persistence/runtime; `apps/client/package.json` is the current version source.

## Standard validation after architecture/data changes

```powershell
pnpm.cmd typecheck; pnpm.cmd test; pnpm.cmd build; pnpm.cmd exec tsx scripts/runtime-blue-deterministic-check.ts
```

Run `validate:data` / `validate:assets` as well when those contracts are affected.

## Current audit status

- P0 infrastructure audit fixes: CLOSED.
- P1 authored-data ownership cleanup: CLOSED and validated green on 2026-08-25.
- Next architecture topic: P2 authority mapping for economy/loot/persistence/inventory/craft/workers before any server-authoritative migration.
