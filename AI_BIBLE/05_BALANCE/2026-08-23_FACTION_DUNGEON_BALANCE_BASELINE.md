# Albion Idle — Faction Dungeon Balance Baseline — 2026-08-26

Status: VALIDATED LIVE DUNGEON CURVE / SINGLE AUTHORED COMBAT LAYER
Branch: `agent/albion-idle-development`

## Purpose

Canonical T4-T8 faction-dungeon balance contract after exact-two-potion runtime validation and tiered anti-faction bonus adoption.

Runtime authority remains in:
- `apps/client/src/data/dungeonContentCatalog.ts` for authored dungeon combat values;
- `apps/client/src/data/factionArtifactWeaponContent.ts` for the authored faction matchup curve;
- `scripts/runtime-dungeon-benchmark.ts` for the canonical T4-T8 sweep;
- `apps/client/src/runtime/CombatRuntimeBenchmarkHarness.ts` for deterministic runtime execution.

Do not recreate tuning tables from this document.

---

# 1. CANONICAL LIVE DUNGEON CONTRACT

For every Tier T4-T8, benchmark same-tier `.3` equipment with the matching dungeon-faction cape and exactly 2 health potions.

## Keeper entry dungeon

With the 5 same-tier base weapon families:
- `5/5` clear is mandatory;
- weakest reference clear targets roughly `15%` hero HP;
- this is a margin target, not a requirement that every family finishes near 15%.

Keeper is the reliable faction-dungeon entry point and does not require an artifact weapon.

## Heretic / Undead / Morgana

With same-tier base weapons:
- base clears are telemetry, not a strict `0/5` contract;
- leaks are accepted as long as they do not make base weapons the reliable progression route across the matrix;
- isolated or family-specific clears do not justify over-tuning a dungeon by themselves.

With the 5 correct favorable faction-artifact weapons:
- `5/5` clear is mandatory;
- same-tier `.3` equipment;
- matching dungeon-faction cape;
- exactly 2 health potions;
- no minimum ending-HP contract is imposed.

The progression distinction is therefore **reliable favorable route vs less reliable neutral/base route**, not strict universal failure of every base weapon.

---

# 2. TIERED ANTI-FACTION BONUS

The favorable artifact matchup bonus is authored by weapon tier:

- T4: `+20%` damage dealt;
- T5: `+22%`;
- T6: `+24%`;
- T7: `+26%`;
- T8: `+28%`.

The table is authoritative in `FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER`.

The matchup loop remains:
- Keeper artifact -> Morgana;
- Morgana artifact -> Undead;
- Undead artifact -> Heretic;
- Heretic artifact -> Keeper.

There is no global innate damage bonus for artifact weapons. Their normal-world power continues to come from their authored weapon stats and abilities.

---

# 3. SINGLE AUTHORED DUNGEON COMBAT LAYER

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

# 4. BENCHMARK CONDITIONS

Canonical command: `pnpm benchmark:dungeons`.

Conditions:
- same-tier equipment;
- enchantment `.3`;
- matching faction cape;
- continuous dungeon runtime with persistent HP/cooldowns between encounters;
- deterministic automatic potion use;
- exactly `2` health potions seeded in inventory;
- 5 base weapon families;
- 5 favorable faction-artifact weapon families using the authored tier bonus.

Mastery/IP profiles:
- T4: family 40 / equipped spec 40 / siblings 0;
- T5: 36 / 36 / 36;
- T6: 46 / 46 / 46;
- T7: 56 / 56 / 56;
- T8: 65 / 65 / 65.

---

# 5. VALIDATED T4-T8 RUNTIME SNAPSHOT

## Base routes

- T4: Keeper `5/5` min `18.6%`; Heretic `1/5`; Undead `0/5`; Morgana `0/5`.
- T5: Keeper `5/5` min `16.2%`; Heretic `1/5`; Undead `1/5`; Morgana `1/5`.
- T6: Keeper `5/5` min `14.4%`; Heretic `3/5`; Undead `0/5`; Morgana `0/5`.
- T7: Keeper `5/5` min `13.0%`; Heretic `1/5`; Undead `3/5`; Morgana `1/5`.
- T8: Keeper `5/5` min `15.3%`; Heretic `0/5`; Undead `0/5`; Morgana `0/5`.

These non-Keeper base clears are accepted telemetry under the current contract.

## Favorable artifact routes with tiered bonus

All four faction dungeons are `5/5` at every tier T4-T8.

Weakest deterministic favorable clear observed by tier:
- T4 `+20%`: `4.9%` HP;
- T5 `+22%`: `0.2%` HP;
- T6 `+24%`: `11.3%` HP;
- T7 `+26%`: `10.3%` HP;
- T8 `+28%`: `3.1%` HP.

Ending HP is telemetry only; the hard favorable contract is `5/5`.

---

# 6. POTION / DETERMINISM RULE

The canonical dungeon benchmark seeds exactly 2 potions.

Automatic potion timing is deterministic and can differ from human timing. Because of this, ending HP is useful telemetry but is not a hard favorable-route threshold.

Hard contracts:
- Keeper base `5/5` with roughly the intended entry margin;
- correct favorable artifact route `5/5`;
- base-route clear rates remain monitored for excessive reliability.

Do not add another balance layer or globally alter a weapon to compensate for one dungeon row.

---

# 7. WORLD CROSS-CHECK

Dungeon tuning must not become a hidden weapon-balance patch.

Artifact weapons are already stronger/different through their authored stats and abilities; no extra global artifact damage multiplier is currently used.

If a future dungeon issue appears to require changing weapon stats, rerun the relevant World and weapon-role benchmarks before accepting the change.

---

# 8. CHANGE CONTROL

Re-open dungeon balance when one of these changes materially:
- weapon base stats or abilities;
- enchantment combat scaling;
- armor/defensive scaling;
- potion behavior, cooldown or inventory contract;
- faction cape behavior;
- tiered anti-faction damage curve;
- Mastery IP formula or expected Mastery progression;
- dungeon encounter persistence rules;
- source World combat profiles used by dungeon encounters.

When reopened, rerun at minimum:
1. `pnpm benchmark:dungeons` with exactly 2 potions;
2. favorable artifact matrix;
3. base-weapon leak matrix;
4. relevant World benchmarks if weapon/global combat data changed.

Never tune one synthetic row in isolation and never recreate stacked tuning multipliers.
