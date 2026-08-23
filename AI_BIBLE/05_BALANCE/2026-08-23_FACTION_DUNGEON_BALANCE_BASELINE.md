# Albion Idle — Faction Dungeon Balance Baseline — 2026-08-23

Status: VALIDATED LIVE BASELINE
Branch: `agent/albion-idle-development`

## Purpose

This document freezes the validated faction-dungeon balance state after the artifact-weapon, faction-matchup and cross-specialization Mastery pass.

It is a balance snapshot, not a second runtime configuration source. Numeric authority remains in the live data/runtime files and benchmarks referenced below.

---

# 1. LIVE DUNGEON CONTRACT

Faction dungeons are horizontal/return content and a faction-progression layer. They are not a replacement for the linear World boss-gate structure.

Per Tier:
- 4 factions: Keeper, Heretic, Undead, Morgana;
- continuous dungeon run with persistent HP/cooldowns between encounters;
- Keeper is the entry dungeon and must remain broadly accessible with a prepared same-tier base weapon;
- Heretic / Undead / Morgana progressively reward faction-artifact matchup knowledge;
- artifact weapons are intentionally allowed to outperform base weapons outside their favorable matchup;
- neutral artifact leaks are acceptable and expected; 0% neutral clear rate is NOT a target.

The favorable faction matrix uses the canonical artifact bonus:
- favorable matchup = `+20% damage dealt`;
- the bonus applies only against the authored opposing faction;
- it is part of the intended dungeon identity, not a temporary benchmark modifier.

---

# 2. MASTERY / IP BENCHMARK CONTRACT

Dungeon benchmarks MUST model the current Mastery IP rules explicitly.

Authoritative mastery contribution:

`Mastery IP = familyLevel * 0.5 + equippedSpecLevel * 1.0 + sum(otherSpecsInFamily * 0.2)`

The equipped specialization does not also receive its own `+0.2` sibling contribution.

Current T5-T8 dungeon benchmark profiles:
- T5: family 36 / equipped spec 36 / sibling specs 36;
- T6: 46 / 46 / 46;
- T7: 56 / 56 / 56;
- T8: 65 / 65 / 65.

Do not revert dungeon balance tests to a single coupled `masteryLevel` input.

---

# 3. LIVE BOSS HP MULTIPLIERS

Authority: `apps/client/src/data/dungeonContentCatalog.ts`.

Only boss HP is faction/tier-tuned by this table. Trash pressure, elite pressure, incoming-damage profile and World monsters remain controlled by their existing shared systems.

| Tier | Keeper | Heretic | Undead | Morgana |
|---:|---:|---:|---:|---:|
| T4 | 1.00 | 0.72 | 0.67 | 0.62 |
| T5 | 1.00 | 1.12 | 1.08 | 1.00 |
| T6 | 1.00 | 1.18 | 1.14 | 1.12 |
| T7 | 1.00 | 1.82 | 1.42 | 1.40 |
| T8 | 1.00 | 1.82 | 1.44 | 1.36 |

Keeper intentionally stays `1.00` at every Tier.

The higher T7/T8 Heretic multipliers are deliberate DPS gates created after cross-specialization Mastery IP made high-tier same-tier loadouts substantially stronger.

---

# 4. FAVORABLE ARTIFACT BENCHMARK — FINAL READ

Benchmark conditions:
- same-tier artifact weapon;
- enchantment `.3`;
- favorable faction matchup (`+20% damage`);
- faction cape enabled;
- health potions enabled;
- explicit family/spec/sibling Mastery profile for the tested Tier.

Authority benchmark:
`apps/client/src/data/factionArtifactDungeonT5ToT8FavorableClearBenchmark.test.ts`

Final aggregate result:
- T5: `16/20` = 80%; average boss progress 99.6%; minimum 96.8%;
- T6: `20/20` = 100%;
- T7: `20/20` = 100%;
- T8: `19/20` = 95%; average boss progress 99.8%; minimum 97.0%.

The non-clears are accepted because the automatic potion harness is conservative and can miss player-optimal potion timing.

Observed accepted near-clears:
- T5 Clarent -> Morgana: 97.0%;
- T5 Brimstone -> Heretic: 98.4%;
- T5 Ursine -> Morgana: 96.8%;
- T5 Demonfang -> Undead: 99.2%;
- T8 Ursine -> Morgana: 97.0%.

Do NOT buff those weapons or weaken those dungeons solely to force the harness to print 100% when the failure is compatible with potion timing.

---

# 5. BASE-WEAPON LEAK — FINAL READ

Authority benchmark:
`apps/client/src/data/factionArtifactDungeonT5ToT8LeakBenchmark.test.ts`

Same-tier `.3`, faction cape, health potions, explicit Mastery profile.

## T5
- Keeper: `5/5` base clears;
- Heretic: `2/5`;
- Undead: `2/5`;
- Morgana: `2/5`.

## T6
- Keeper: `5/5`;
- Heretic: `3/5`;
- Undead: `0/5`;
- Morgana: `0/5`.

## T7
- Keeper: `5/5`;
- Heretic: `5/5`;
- Undead: `2/5`;
- Morgana: `2/5`.

## T8
- Keeper: `5/5`;
- Heretic: `4/5`;
- Undead: `2/5`;
- Morgana: `3/5`.

Interpretation:
- Keeper satisfies the entry contract at every Tier;
- Undead/Morgana provide meaningful base-weapon gates;
- Heretic remains deliberately more permissive at T7/T8 because further HP inflation begins to threaten favorable artifact clears before producing a clean base-weapon lock;
- do not continue increasing Heretic HP simply to chase `0/5` base clears.

---

# 6. NEUTRAL ARTIFACT LEAK — FINAL READ

Neutral artifact clears are intentionally allowed. Artifact rewards should be somewhat stronger than base weapons even outside their favorable dungeon.

Aggregate neutral artifact clear rate across all four faction dungeons:
- T5: `35/60` = 58.3%;
- T6: `37/60` = 61.7%;
- T7: `41/60` = 68.3%;
- T8: `39/60` = 65.0%.

By faction:

| Tier | Keeper | Heretic | Undead | Morgana |
|---:|---:|---:|---:|---:|
| T5 | 100% | 73.3% | 26.7% | 33.3% |
| T6 | 100% | 73.3% | 40.0% | 33.3% |
| T7 | 100% | 86.7% | 40.0% | 46.7% |
| T8 | 100% | 66.7% | 53.3% | 40.0% |

This dispersion is accepted.

Design rule:
- favorable artifact matchup should be the reliable/optimal route;
- neutral artifact success is allowed;
- base weapons remain viable for Keeper and can occasionally leak deeper;
- faction dungeons are not authored as strict hard locks where every non-favorable weapon must fail.

---

# 7. POTION BENCHMARK LIMITATION

The benchmark uses deterministic automatic potion consumption.

A real player can improve potion timing by delaying a heal for a boss window or aligning cooldown availability between encounters.

Therefore:
- a deterministic auto-potion near-clear around 96-99% boss progress is not automatically a balance failure;
- do not compensate those near-clears with weapon buffs unless the same weapon is also globally weak in World/neutral benchmarks;
- do not compensate them with dungeon nerfs unless multiple favorable weapons fail by meaningful margins.

This rule is especially important for fast weapons that can reach the boss or a damage spike before the harness reaches the next automatic potion window.

---

# 8. WORLD CROSS-CHECK

Artifact dungeon tuning must always be cross-checked against:
`apps/client/src/data/factionArtifactWeaponBenchmark.test.ts`

Dungeon fixes must not create an obvious World progression outlier.

Current accepted philosophy:
- artifact weapons may leak normal World walls that base weapons do not;
- they are rewards obtained after progressing through faction content;
- the critical balance concern is artifact-vs-artifact coherence and absence of catastrophic global outliers, not strict parity with base weapons.

---

# 9. CHANGE CONTROL

This T4-T8 dungeon state is FROZEN as the current live baseline.

Do not change dungeon multipliers because of a single synthetic run.

Re-open dungeon balance only when at least one of these changes materially:
- weapon base stats or ultimates;
- enchantment combat scaling;
- armor/defensive package scaling;
- potion behavior/cooldown;
- faction cape behavior;
- faction `+20%` damage matrix;
- Mastery IP formula or expected Mastery progression;
- dungeon encounter persistence rules.

When reopened, rerun together:
1. favorable artifact dungeon benchmark;
2. base + neutral artifact leak benchmark;
3. artifact World benchmark.

Do not tune against one benchmark in isolation.
