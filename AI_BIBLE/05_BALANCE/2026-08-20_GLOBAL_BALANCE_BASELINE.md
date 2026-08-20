# Albion Idle — Global Balance Baseline — 2026-08-20

Status: VALIDATED LIVE BASELINE / CROSS-SYSTEM INDEX
Branch: `agent/albion-idle-development`

## Purpose

This document records the current validated balance state after the 2026-08-19/20 global progression/economy/combat-gate pass.

It is an INDEX/SNAPSHOT, not a second gameplay configuration source. Numeric authority remains in the relevant data/runtime files and system documents linked below.

Use this snapshot to understand how World progression, Island production, Silver, crafting/refining, enchantment shards, Awakening, weapons and dungeons currently fit together.

---

# 1. WORLD PROGRESSION

## 1.1 World bands

The linear world remains:
- Blue = T3/T4 progression
- Yellow = T5
- Orange = T6
- Red = T7
- Black = T8

NORMAL world progression is monotonic. Normal zones/segments must not structurally regress below earlier normal content.

Validated exception:
- an authored end-of-Tier `bossGate` may intentionally exceed the surrounding normal progression envelope;
- the following zone entry does not need to exceed that boss spike;
- it remains compared against the previous normal progression envelope.

This exception is data-driven through `progressionRole: "boss_gate"`, not hardcoded from segment index or zone name.

## 1.2 Recommended IP — UX marker

Recommended IP was recalibrated after enchantment combat power was decoupled from IP.

Band envelopes:
- Blue: 300 -> 510
- Yellow: 510 -> 630
- Orange: 630 -> 745
- Red: 745 -> 860
- Black: 860 -> 975

Current authored zone envelopes:
- Blue starts: `[300, 305, 315, 400, 455]`; ends: `[305, 315, 400, 455, 510]`
- Yellow starts: `[510, 535, 560, 585, 610]`; ends: `[535, 560, 585, 610, 630]`
- Orange starts: `[630, 655, 680, 705, 730]`; ends: `[655, 680, 705, 730, 745]`
- Red starts: `[745, 770, 795, 820, 845]`; ends: `[770, 795, 820, 845, 860]`
- Black starts: `[860, 885, 910, 935, 960]`; ends: `[885, 910, 935, 960, 975]`

IMPORTANT: recommended IP is a readable progression marker, not a direct combat-power requirement.

Authority: `apps/client/src/data/itemPower.ts`.

## 1.3 End-of-Tier boss-gate contract

Bosses that unlock the next production Tier are now explicit gear checks.

Validated semantic contract for the representative normal weapon set:
- full `Tn.2 + potion`: must NOT universally clear;
- full `Tn.3 + potion`: MUST universally clear;
- `Tn.3` without potion: not required to be universal unless separately authored.

The wall comes from combat pressure, not from an artificial equipment-slot lock.

The boss is allowed to be harder than the following zone entry. This is the approved exception to normal progression monotonicity.

## 1.4 Validated live boss gates

Frostpeak T4 -> T5:
- HP x1.575
- damage x1.40
- defense x1.10
- T4.2 + potion: blocked across the validated representative set
- T4.3 + potion: universal clear

Ironveil T5 -> T6:
- HP x1.15
- damage x1.325
- defense x1.05
- T5.2 + potion: 0/5 clear
- T5.3 + potion: 5/5 clear

Ashenpeak T6 -> T7:
- HP x1.00
- damage x1.375
- defense x1.00
- T6.2 + potion: 0/5 clear
- T6.3 + potion: 5/5 clear

Doompeak T7 -> T8:
- HP x1.00
- damage x1.175
- defense x1.00
- T7.2 + potion: 0/5 clear
- T7.3 + potion: 5/5 clear

Authority:
- `packages/data/src/config/combat-progression.ts`
- `AI_BIBLE/10_SYSTEMS/20A_COMBAT_BALANCING_PROCESS.txt`

## 1.5 Tier bridges

All bridges were revalidated after the new enchantment curve and boss-gate model:
- T4.3 -> T5 / Yellow: VALID
- T5.3 -> T6 / Orange: VALID
- T6.3 -> T7 / Red: VALID
- T7.3 -> T8 / Black: VALID

The boss gate certifies completion of the current Tier; after that clear, previous-tier `.3` must still retain viable entry access to the next normal band/shard economy.

Different weapons do NOT need identical deepest segments or shard/hour throughput.

---

# 2. EQUIPMENT / WEAPON BALANCE

## 2.1 Armor model

There are currently no separate armor archetypes with distinct progression identities in live balance. The meaningful profile differences are primarily carried by weapons and explicit off-hands.

Do not invent plate/leather/cloth balance archetypes until they are explicitly designed and authored.

## 2.2 Resistance formula

Live mitigation uses diminishing returns, not a hard 80% cap:

`mitigation = resistance / (resistance + 100)`

A previous synthetic benchmark incorrectly capped mitigation at 80%; that benchmark was corrected. Do not use the old capped interpretation for balance decisions.

Validated T8.3 defensive reference from the corrected audit:
- standard no-shield package: ~62.6% physical / ~55.5% magical mitigation
- Broadsword + Reinforced Shield: ~70.3% physical / ~62.4% magical mitigation

The shield therefore retains meaningful value at high Tier.

## 2.3 Current cross-tier weapon package balance

Corrected neutral/package benchmark average scores before the latest localized T5 Broadsword correction:
- Longbow: ~103.2
- Infernal Staff: ~102.5
- Broadsword package: ~100.4
- Spiked Gauntlets: 100 reference
- Dual Dagger: ~97.6

This dispersion remains accepted as healthy. Equal DPS/performance is NOT the goal.

Weapons may meet ordinary walls at different times. A balance problem exists when an archetype persistently over- or under-performs across relevant content, or when one profile makes an explicit global progression contract impossible to satisfy.

## 2.4 Broadsword T5 correction

Ironveil diagnostics showed a real overlap:
- Longbow T5.2 remained ahead of Broadsword T5.3 in the boss-gate context;
- therefore no global Ironveil boss multiplier could produce `T5.2 + potion = 0/5` and `T5.3 + potion = 5/5` without breaking Broadsword.

The Broadsword T5 authored base damage was corrected:
- T4: 86
- T5: 120 (was 110)
- T6: 155
- T7: 210
- T8: 275

The 120 candidate was the smallest validated correction:
- +9.1% base damage versus the previous T5 value;
- T5.3 offense index moved from ~77.2 to ~84.2;
- explicit shield-package score ~99.7;
- Ironveil T5.2 + potion remained 0/5;
- Ironveil T5.3 + potion became 5/5;
- Broadsword T5.3 retained ~12.4% HP in the candidate sweep.

This remains data-driven: the value is authored in `weaponContentCatalog.ts`; no tier-specific runtime override exists.

---

# 3. ENCHANTMENT POWER / IP

Enchant combat power is independent from enchantment display IP.

| Enchant | Display IP bonus | Combat stat multiplier |
|---:|---:|---:|
| `.0` | +0 | x1.00 |
| `.1` | +25 | x1.12 |
| `.2` | +50 | x1.26 |
| `.3` | +75 | x1.42 |
| `.4` | +100 | x1.42 base |

`.4` currently preserves `.3` base-stat power; Awakening traits are its separate long-term progression layer.

Mastery IP remains independent and continues to use the shared bonus-IP stat conversion.

Authority:
- `packages/gameplay/src/equipment/enchantment-balance.ts`
- `AI_BIBLE/10_SYSTEMS/33_ENCHANTMENT_SYSTEM.txt`

---

# 4. ENCHANTMENT SHARD ECONOMY

## 4.1 Upgrade costs

Full-cost item shard curve:
- `.0 -> .1`: 10
- `.1 -> .2`: 30
- `.2 -> .3`: 60
- `.3 -> .4`: 100, eligible weapon Awakening only

Full normal `.0 -> .3` item cost = 100 shards.

1H/off-hand package through `.3`:
- 2H = 100%
- 1H = 50%
- off-hand = 50%
- 1H + off-hand = one full 2H package

Full-set benchmark convention = five full-cost equivalents:
- `.0 -> .1`: 50 shards
- `.1 -> .2`: 150 shards
- `.2 -> .3`: 300 shards

## 4.2 Current open-world shard generation

Authoritative open-world constants:
- base expected shard/kill: 0.0165
- depth bonus/segment: 0.015
- elite multiplier: x1.20
- boss multiplier: x1.35

Blue authored weights:
- Forest: 0.35 / 0.50
- Swamp: 0.50 / 0.90
- Highland: 0.90 / 2.00
- Steppe: 3.80 / 6.50
- Mountain: 6.80 / 9.50

Yellow authored weights:
- 3.50 / 5.50
- 4.80 / 6.20
- 5.80 / 7.40
- 7.60 / 10.20
- 9.00 / 10.50

Orange/Red/Black current reference weights:
- 4.20 / 6.60
- 5.76 / 7.44
- 6.96 / 8.88
- 9.12 / 12.24
- 10.80 / 12.60

Authority: `apps/client/src/data/economyContentCatalog.ts`.

## 4.3 Combat vs active gathering

Critical global-economy rule:
- if the HERO gathers, the hero does not fight;
- active hero gathering therefore interrupts personal shard farming;
- workers may continue gathering in parallel.

Economy projections must not treat hero combat and hero gathering as simultaneous resource streams.

---

# 5. CRAFTING / REFINING / PREDECESSOR CHAIN

Higher-tier normal equipment recipes consume the previous-tier equipment instance in addition to the new Tier refined-material cost.

The representative sequential set-chain regression validates:
- T3 -> T4 consumes the T3 set
- T4 -> T5 consumes the T4 set
- T5 -> T6 consumes the T5 set
- T6 -> T7 consumes the T6 set
- T7 -> T8 consumes the T7 set

This predecessor consumption is a structural economy rule and must be included in progression-time/material calculations.

Enchant material requirements are derived by scaling the BASE CRAFT materials of the item. Do not maintain a separate unrelated enchantment material recipe.

Refining remains part of the recursive production chain.

Regression source:
- `apps/client/src/data/globalEconomySequentialSetChain.test.ts`

---

# 6. PLAYER ISLAND / PRODUCTION SCALING

Authority: `AI_BIBLE/10_SYSTEMS/19A_PRODUCTION_PROGRESSION_BALANCE.txt`.

## 6.1 Gathering mastery gates

- T3: mastery 0
- T4: 3
- T5: 7
- T6: 11
- T7: 18
- T8: 25

## 6.2 Operational building material upgrades

Refined previous-Tier material requirement:
- unlock T4 production: 15 refined T3
- unlock T5: 40 refined T4
- unlock T6: 70 refined T5
- unlock T7: 110 refined T6
- unlock T8: 160 refined T7

Workshop uses the same total requirement but allows a flexible family mix; current contract requires at least 3 distinct resource families.

## 6.3 World / Island gates

- after Dark Swamp / T3: Island 2 -> T4 production step
- after Frostpeak boss gate / T4: Island 3 -> T5 production
- after Ironveil boss gate / T5: Island 4 -> T6 production
- after Ashenpeak boss gate / T6: Island 5 -> T7 production
- after Doompeak boss gate / T7: Island 6 -> T8 production

Island/world gating must remain synchronized with actual production access. The new boss-gate contract intentionally prevents production progression from opening while the player is still materially under-geared for the previous Tier.

## 6.4 Sequential production pacing reference

Current representative cumulative progression times:
- T3 -> T4: ~0.72 h
- through T5: ~5.18 h
- through T6: ~13.81 h
- through T7: ~31.88 h
- through T8 production unlock: ~58.27 h
- representative T8 craft: ~59.85 h

Incremental block references:
- T3 -> T4: ~0.72 h
- T4 -> T5: ~4.46 h
- T5 -> T6: ~8.63 h
- T6 -> T7: ~18.07 h
- T7 -> T8: ~26.39 h

---

# 7. SILVER ECONOMY

Silver remains the universal currency and a meaningful progression sink, but it must not become the only blocker.

Current production-progression Silver sink totals:
- T3 -> T4: 3,900
- T4 -> T5: 60,000
- T5 -> T6: 200,000
- T6 -> T7: 525,000
- T7 -> T8: 900,000

Current distribution:

T3 -> T4:
- Island: 1,000
- 8 mono buildings: 300 each
- Workshop: 500

T4 -> T5:
- Island: 18,000
- 8 mono buildings: 4,500 each
- Workshop: 6,000

T5 -> T6:
- Island: 60,000
- 8 mono buildings: 14,500 each
- Workshop: 24,000

T6 -> T7:
- Island: 155,000
- 8 mono buildings: 38,000 each
- Workshop: 66,000

T7 -> T8:
- Island: 270,000
- 8 mono buildings: 65,000 each
- Workshop: 110,000

Representative best-farm Silver/hour references used for calibration:
- T3: ~23.3k/h
- T4: ~54.3k/h
- T5: ~88.5k/h
- T6: ~116.9k/h
- T7: ~135.5k/h

Approximate dedicated Silver-farm equivalents:
- ~0.17 h
- ~1.11 h
- ~2.26 h
- ~4.49 h
- ~6.64 h

---

# 8. AWAKENING / ATTUNEMENT / SILVER SCALING

Authority: `AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.txt`.

## 8.1 `.4` acquisition

- 100 matching Tier shards
- refined-material multiplier x8
- base Silver cost before Tier/category scaling: 25,000
- weapon becomes `.4` UNAWAKENED

## 8.2 Initial Awakening thresholds

- T4.4: 5,000 Attunement
- T5.4: 10,000
- T6.4: 15,000
- T7.4: 20,000
- T8.4: 25,000

Initial storage caps:
- T4: 15,000
- T5: 28,000
- T6: 35,000
- T7: 38,000
- T8: 40,000

Dynamic cap:
`max(InitialCap * (1 + Strain * 0.025), NextAttunementCost * 1.5)`

## 8.3 Trait action costs

Base at Strain 0:
- T4: 1,000 Attunement / 12,000 Silver
- T5: 2,000 / 24,000
- T6: 3,000 / 36,000
- T7: 4,000 / 48,000
- T8: 5,000 / 60,000

Validated compounded growth:
- Attunement: `1.03 ^ Strain`
- Silver: `1.026 ^ Strain`

Every Awake/trait modification becomes incrementally more expensive than the previous one.

---

# 9. DUNGEONS — CURRENT BALANCE ROLE

Dungeons are parallel return-content, not the linear-world progression gate.

Current authored faction set:
- 4 factions per Tier: Keeper, Heretic, Undead, Morgana
- T4 through T8
- 5 continuous encounters per dungeon
- HP/cooldowns persist through the run

Current full-run secondary shard totals:
- T4: 5
- T5: 6
- T6: 8
- T7: 10
- T8: 12

Open-world combat remains the primary enchantment-shard source; dungeon shards are collateral value alongside faction progression/rewards.

## 9.1 Same-tier `.3` benchmark

All 20 faction dungeons x 5 normal weapon profiles were tested at same-tier `.3`, end-of-tier mastery, no potion:
- T4: 0/20 clears
- T5: 0/20
- T6: 0/20
- T7: 0/20
- T8: 0/20

Most profiles still reach encounter 5. `.3` alone is below the intended dungeon-farm threshold rather than the entire dungeon being inaccessible from the start.

## 9.2 `.3 + potion` / current `Tn.3++` entry signal

Clear rates across all 20 weapon/faction runs per Tier:
- T4: 18/20 = 90%
- T5: 11/20 = 55%
- T6: 15/20 = 75%
- T7: 16/20 = 80%
- T8: 19/20 = 95%

Aggregate clear rate by normal weapon profile across all Tiers/factions:
- Broadsword: 15/20 = 75%
- Longbow: 18/20 = 90%
- Infernal Staff: 11/20 = 55%
- Spiked Gauntlets: 19/20 = 95%
- Dual Dagger: 16/20 = 80%

Current design interpretation:
- do NOT globally weaken dungeons simply because every normal weapon cannot clear every faction dungeon at entry power;
- the important future entry contract is that each normal weapon profile has at least ONE viable faction dungeon at the intended Tier entry state;
- faction weapons will later expand matchup coverage and progressively unlock additional faction dungeons.

PLANNED / NOT LIVE:
- faction weapons are intended to have matchup advantages against another faction;
- exact faction-damage relationships and values are NOT yet authored and must be balanced when those weapons are created.

INVALID DATA EXCLUDED:
- the temporary `tn4_base` benchmark is NOT balance evidence. It did not represent a valid live `.4` loadout.

---

# 10. CURRENT BALANCE PHILOSOPHY

The current validated global rules are:

1. Data/runtime is authoritative; UI labels and synthetic diagnostics are secondary.
2. Recommended IP is a UX marker, not direct enchant combat power.
3. Enchantment must produce a meaningful power gain, but `.3` must remain below the next Tier's identity.
4. Normal world progression remains monotonic.
5. Explicit end-of-Tier `bossGate` encounters may create local spikes above the following zone entry.
6. `Tn.2 + potion` must not universally bypass an end-of-Tier boss gate; `Tn.3 + potion` must universally clear it for the representative normal weapon set.
7. Previous-tier `.3` must preserve entry access to next-Tier shard farming after the gate is cleared.
8. Weapon walls do not need to align; persistent global outliers are the concern.
9. When one weapon makes a global gate contract impossible, diagnose the weapon/package before distorting the whole zone.
10. Active hero gathering competes with combat time; workers are the parallel gather channel.
11. Higher-Tier crafting consumes predecessor equipment and must be modeled sequentially.
12. Silver, materials and shards are complementary sinks; do not tune all three as extreme simultaneous bottlenecks.
13. Dungeons are return-content and future horizontal faction progression, not another copy of the linear-world wall structure.

---

# 11. AUTHORITATIVE DOCUMENTS / REGRESSION SOURCES

System docs:
- `AI_BIBLE/10_SYSTEMS/19A_PRODUCTION_PROGRESSION_BALANCE.txt`
- `AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.txt`
- `AI_BIBLE/10_SYSTEMS/20A_COMBAT_BALANCING_PROCESS.txt`
- `AI_BIBLE/10_SYSTEMS/33_ENCHANTMENT_SYSTEM.txt`
- `AI_BIBLE/10_SYSTEMS/14_LOOT_SYSTEM.txt`
- `AI_BIBLE/10_SYSTEMS/35_CURRENCY_SYSTEM.txt`
- `AI_BIBLE/20_DATA/42_BALANCING_TABLES.txt`

Key live/diagnostic tests:
- `worldProgressionFoundation.test.ts`
- `blueFrostpeakProgressionSweep.test.ts`
- `laterTierBossGateRegression.test.ts`
- `enchantmentProgressionLadderSweep.test.ts`
- `enchantmentTierBridgeSweep.test.ts`
- `weaponCrossTierNeutralBenchmark.test.ts`
- `defensiveMitigationCrossTierAudit.test.ts`
- `globalEconomySequentialSetChain.test.ts`
- `islandProductionProgressionBalance.test.ts`
- `dungeonTn3AllWeaponsBenchmark.test.ts`
- `dungeonTn3PlusThresholdBenchmark.test.ts` — only `tn3_potion` scenario currently valid evidence

One-off boss-gate candidate/diagnostic sweeps are discovery tools. The durable live contract is protected by the regression tests above.

When a future balance pass changes an authoritative value, update the relevant system document first and then refresh this dated snapshot if the global relationship between systems changed.
