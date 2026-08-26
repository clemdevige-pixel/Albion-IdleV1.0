# Albion Idle — Faction Dungeon Balance Baseline — 2026-08-26

Status: VALIDATED LIVE DUNGEON CURVE / SINGLE AUTHORED COMBAT LAYER
Branch: `agent/albion-idle-development`

## Purpose

This document records the canonical T4-T8 faction-dungeon balance contract after the exact-two-potion runtime recalibration.

It is a balance snapshot, not a runtime configuration source. Numeric authority remains in:
- `apps/client/src/data/dungeonContentCatalog.ts` for authored dungeon combat values;
- `scripts/runtime-dungeon-benchmark.ts` for the canonical T4-T8 runtime sweep;
- `apps/client/src/runtime/CombatRuntimeBenchmarkHarness.ts` for deterministic runtime execution.

Do not recreate tuning tables from this document.

---

# 1. CANONICAL LIVE DUNGEON CONTRACT

For every Tier T4-T8, benchmark same-tier `.3` equipment with the matching dungeon-faction cape and exactly 2 health potions.

## Keeper entry dungeon

With the 5 same-tier base weapon families:
- `5/5` clear is mandatory;
- the weakest reference clear should finish around `15%` hero HP;
- this is a margin target, not a requirement that every family finishes near 15%.

Keeper is the reliable entry point into faction dungeons and must not require a faction-artifact weapon.

## Heretic / Undead / Morgana

With the 5 same-tier base weapon families:
- the dungeon should block normal progression;
- low-HP leaks are tolerated when they are genuinely marginal;
- a base clear with substantial remaining HP is a balance failure and must trigger a full matrix review.

With the 5 correct favorable faction-artifact weapons:
- `5/5` clear is mandatory;
- same-tier `.3` equipment;
- matching dungeon-faction cape;
- exactly 2 health potions;
- canonical favorable matchup bonus `+20% damage dealt`.

The contract is therefore **not** strict `0/5` base clears. The distinction is between a blocked run / marginal leak and a reliable clear.

---

# 2. SINGLE AUTHORED COMBAT LAYER

Dungeon combat tuning has one authority only: `DUNGEON_COMBAT_STEPS_BY_ID` in `dungeonContentCatalog.ts`.

Each dungeon directly authors final encounter multipliers:
- `hp`;
- `damage`;
- `defense`.

Runtime resolution is conceptually:

`World source profile × authored dungeon encounter step`

There is no additional per-dungeon tuning table and no separate faction boss-HP multiplier afterward.

Do not reintroduce stacked buff/nerf layers.

---

# 3. BENCHMARK CONDITIONS

Canonical command: `pnpm benchmark:dungeons`.

Conditions:
- same-tier equipment;
- enchantment `.3`;
- matching faction cape;
- continuous dungeon runtime with persistent HP/cooldowns between encounters;
- deterministic automatic potion use;
- exactly `2` health potions seeded in inventory;
- 5 base weapon families;
- 5 favorable faction-artifact weapon families using the canonical `+20%` matchup bonus.

Mastery/IP profiles:
- T4: family 40 / equipped spec 40 / siblings 0;
- T5: 36 / 36 / 36;
- T6: 46 / 46 / 46;
- T7: 56 / 56 / 56;
- T8: 65 / 65 / 65.

---

# 4. VALIDATED T4-T8 RUNTIME SNAPSHOT

## T4

Base:
- Keeper: `5/5`, weakest clear `18.6%` HP;
- Heretic: `1/5`, only leak `9.7%` HP;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable faction-artifact route: `5/5` on all four dungeons.

## T5

Base:
- Keeper: `5/5`, weakest clear `16.2%` HP;
- Heretic: `1/5`, only leak `4.6%` HP;
- Undead: `1/5`, only leak `8.1%` HP;
- Morgana: `1/5`, only leak `0.3%` HP.

Favorable faction-artifact route: `5/5` on all four dungeons.

## T6

Base:
- Keeper: `5/5`, weakest clear `14.4%` HP;
- Heretic: `3/5`, all leaks marginal: `0.7%` to `2.8%` HP;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable faction-artifact route: `5/5` on all four dungeons.

## T7

Base:
- Keeper: `5/5`, weakest clear `13.0%` HP;
- Heretic: `1/5`, leak `4.3%` HP;
- Undead: `3/5`, leaks `0.2%` to `6.7%` HP;
- Morgana: `1/5`, leak `8.5%` HP; one additional base profile reaches a deterministic `100%` boss-progress same-tick death and still counts as failure.

Favorable faction-artifact route: `5/5` on all four dungeons.

## T8

Base:
- Keeper: `5/5`, weakest clear `15.3%` HP;
- Heretic: `0/5`;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable faction-artifact route: `5/5` on all four dungeons.

---

# 5. INTERPRETATION OF BASE LEAKS

A leak is acceptable only when the surviving HP is marginal and the favorable route remains the reliable route.

Current accepted worst base leaks outside Keeper:
- T4: `9.7%`;
- T5: `8.1%`;
- T6: `2.8%`;
- T7: `8.5%`;
- T8: none.

Do not chase literal `0/5` by increasing dungeon pressure if that threatens the mandatory `5/5` favorable route.

---

# 6. POTION / DETERMINISM RULE

The canonical dungeon benchmark seeds exactly 2 potions. It no longer seeds a large inventory and filters the result afterward.

Automatic potion timing is deterministic and can differ from player timing. This is useful telemetry, but the hard contracts remain:
- Keeper base `5/5`;
- favorable faction-artifact `5/5`;
- non-Keeper base routes blocked or limited to marginal leaks.

Do not add another balance layer or globally alter a weapon to compensate for a single dungeon row.

---

# 7. WORLD CROSS-CHECK

Dungeon tuning must not become a hidden weapon-balance patch.

If a future dungeon issue appears to require changing weapon stats, rerun the relevant World and weapon-role benchmarks before accepting the change.

Artifact weapons may outperform base weapons and may leak neutral content. That is compatible with their role as faction-content rewards.

---

# 8. CHANGE CONTROL

The current T4-T8 dungeon curve is frozen as the live baseline.

Re-open dungeon balance only when at least one of these changes materially:
- weapon base stats or abilities;
- enchantment combat scaling;
- armor/defensive scaling;
- potion behavior, cooldown or inventory contract;
- faction cape behavior;
- faction `+20%` damage matrix;
- Mastery IP formula or expected Mastery progression;
- dungeon encounter persistence rules;
- source World combat profiles used by dungeon encounters.

When reopened, rerun at minimum:
1. `pnpm benchmark:dungeons` with the canonical exact-two-potion contract;
2. favorable faction-artifact matrix;
3. base-weapon leak matrix;
4. relevant World benchmarks if weapon/global combat data changed.

Never tune one synthetic row in isolation and never recreate stacked tuning multipliers.
