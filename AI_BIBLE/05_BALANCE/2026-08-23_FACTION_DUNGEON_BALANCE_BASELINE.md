# Albion Idle — Faction Dungeon Balance Baseline — 2026-08-26

Status: VALIDATED LIVE DUNGEON CURVE / SINGLE AUTHORED COMBAT LAYER
Branch: `agent/albion-idle-development`

## Purpose

This document records the validated T4-T8 faction-dungeon balance contract after the runtime benchmark cleanup and the exact two-potion recalibration.

It is a balance snapshot, not a runtime configuration source. Numeric authority remains in:
- `apps/client/src/data/dungeonContentCatalog.ts` for authored dungeon combat values;
- `scripts/runtime-dungeon-benchmark.ts` for the current T4-T8 runtime benchmark contract;
- `apps/client/src/runtime/CombatRuntimeBenchmarkHarness.ts` for deterministic runtime execution.

Do not recreate tuning tables from this document.

---

# 1. LIVE DUNGEON CONTRACT

Faction dungeons are horizontal/return content and a faction-progression layer. They do not replace the linear World boss-gate structure.

Per Tier:
- 4 factions: Keeper, Heretic, Undead, Morgana;
- continuous dungeon run with persistent HP/cooldowns between encounters;
- Keeper is the entry dungeon and must remain broadly accessible with a prepared same-tier base weapon;
- Heretic / Undead / Morgana progressively reward faction-artifact matchup knowledge;
- favorable artifact matchup = canonical `+20% damage dealt`;
- neutral artifact leaks are acceptable;
- base-weapon leaks beyond Keeper are acceptable when the favorable route remains clearly superior.

A strict `0/5` non-favorable target is NOT part of the contract.

---

# 2. SINGLE AUTHORED COMBAT LAYER

Dungeon combat tuning has one authority only: `DUNGEON_COMBAT_STEPS_BY_ID` in `dungeonContentCatalog.ts`.

Each dungeon directly authors the final encounter multipliers:
- `hp`;
- `damage`;
- `defense`.

Runtime resolution is conceptually:

`World source profile × authored dungeon encounter step`

There is no additional per-dungeon tuning table and no separate faction boss-HP multiplier applied afterward.

Do not reintroduce stacked buff/nerf layers.

---

# 3. BENCHMARK CONTRACT

The canonical runtime sweep is `pnpm benchmark:dungeons`.

Conditions:
- same-tier equipment;
- enchantment `.3`;
- matching faction cape;
- continuous dungeon runtime;
- automatic health-potion usage;
- exactly **2 health potions seeded in inventory**;
- 5 base weapon families;
- 5 favorable faction-artifact weapon families using the canonical `+20%` matchup bonus.

Mastery/IP profiles:
- T4: family 40 / equipped spec 40 / sibling specs 0;
- T5: 36 / 36 / 36;
- T6: 46 / 46 / 46;
- T7: 56 / 56 / 56;
- T8: 65 / 65 / 65.

The benchmark harness supports an explicit `healthPotionQuantity`; dungeon benchmarks must keep it at `2` unless the benchmark contract itself is intentionally changed.

---

# 4. VALIDATED T4-T8 RUNTIME SNAPSHOT

## T4 — unchanged

Base weapons:
- Keeper: `5/5`;
- Heretic: `1/5`;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable artifact weapons:
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `5/5`;
- Morgana: `5/5`.

T4 was behaviorally identical before and after the single-layer architecture refactor.

## T5

Base weapons:
- Keeper: `5/5`;
- Heretic: `4/5`;
- Undead: `1/5`;
- Morgana: `3/5`.

Favorable artifact weapons:
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `5/5`;
- Morgana: `5/5`.

T5 intentionally allows base leaks. Do not strengthen the dungeon only to force those leaks to zero: the favorable route is reliable and the deeper non-Keeper gates remain materially harder than Keeper.

## T6

Base weapons:
- Keeper: `5/5`;
- Heretic: `3/5`;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable artifact weapons:
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `5/5`;
- Morgana: `5/5`.

This is the intended T6 shape. Do not continue inflating Heretic solely to chase `0/5` base clears.

## T7 — unchanged

Base weapons:
- Keeper: `5/5`;
- Heretic: `1/5`;
- Undead: `3/5`;
- Morgana: `1/5`.

Favorable artifact weapons:
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `5/5`;
- Morgana: `5/5`.

T7 required no recalibration during the exact-two-potion pass.

## T8

Base weapons:
- Keeper: `5/5`;
- Heretic: `0/5`;
- Undead: `0/5`;
- Morgana: `0/5`.

Favorable artifact weapons:
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `5/5`;
- Morgana: `5/5`.

The final Morgana T8 adjustment removes a deterministic same-tick boss-kill/player-death tie while leaving base weapons far from clearing the boss.

---

# 5. POTION / DETERMINISM RULE

The runtime benchmark uses deterministic automatic potion timing, but the inventory itself is now correctly capped to exactly two potions for the canonical dungeon sweep.

A real player can still improve timing manually, so a near-clear is useful telemetry rather than automatic proof that a weapon or dungeon must be changed.

Do not compensate a single near-clear by:
- adding another balance layer;
- globally buffing a weapon;
- globally nerfing a dungeon.

Recheck the full faction/tier matrix first.

---

# 6. WORLD CROSS-CHECK

Dungeon tuning must not silently become a weapon-balance patch.

If a future dungeon issue appears to require changing weapon stats, also rerun the relevant World and weapon-role benchmarks before accepting the change.

Artifact weapons may outperform base weapons and may leak neutral content. That is compatible with their role as faction-content rewards.

---

# 7. CHANGE CONTROL

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
