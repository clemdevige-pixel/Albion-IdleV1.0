# Albion Idle — Global Balance Baseline — 2026-08-23

Status: VALIDATED LIVE BASELINE / CROSS-SYSTEM INDEX
Branch: `agent/albion-idle-development`

## Purpose

This document is the current balance index after the 2026-08-23 artifact-weapon, Mastery-IP and faction-dungeon pass.

For systems not changed by this pass, the detailed 2026-08-20 and 2026-08-21 balance baselines remain valid historical references.

For faction dungeons, this document SUPERSEDES section 9 of `2026-08-20_GLOBAL_BALANCE_BASELINE.md`.

Authoritative current dungeon baseline:
`AI_BIBLE/05_BALANCE/2026-08-23_FACTION_DUNGEON_BALANCE_BASELINE.md`

---

# 1. CURRENT LIVE DELTAS SINCE 2026-08-20/21

## 1.1 Mastery IP

Weapon Mastery now includes cross-specialization IP inside the same weapon family:

`Mastery IP = family * 0.5 + equipped specialization * 1.0 + sum(other family specializations * 0.2)`

Rules:
- the equipped specialization does not double-dip its own `+0.2`;
- cross-specialization contribution never crosses weapon-family boundaries;
- the runtime, displayed IP and balance harness use the same authoritative formula;
- benchmark harnesses must seed family, equipped specialization and sibling specialization separately.

Authority:
- `AI_BIBLE/10_SYSTEMS/29_MASTERY_SYSTEM.txt`
- live item-power calculation in client/runtime.

## 1.2 Artifact weapon role

Faction artifact weapons are now live balance participants across T4-T8.

Validated philosophy:
- artifact weapons are allowed to be somewhat stronger than base weapons outside dungeons;
- they are not required to preserve every base-weapon World wall;
- artifact-vs-artifact coherence is the primary balance concern;
- catastrophic World outliers remain invalid.

## 1.3 Faction dungeon matchup

The faction artifact system uses a favorable `+20% damage dealt` matchup.

Dungeon balance must be evaluated with this bonus active for the canonical favorable pairing and inactive for neutral pairings.

Keeper remains the same-tier entry dungeon. Heretic, Undead and Morgana provide progressively more selective faction-return content.

---

# 2. CURRENT FACTION DUNGEON BOSS HP TABLE

Authority: `apps/client/src/data/dungeonContentCatalog.ts`.

| Tier | Keeper | Heretic | Undead | Morgana |
|---:|---:|---:|---:|---:|
| T4 | 1.00 | 0.72 | 0.67 | 0.62 |
| T5 | 1.00 | 1.12 | 1.08 | 1.00 |
| T6 | 1.00 | 1.18 | 1.14 | 1.12 |
| T7 | 1.00 | 1.82 | 1.42 | 1.40 |
| T8 | 1.00 | 1.82 | 1.44 | 1.36 |

Only boss HP is adjusted by this table. The shared encounter pressure model remains data-driven and unchanged.

---

# 3. CURRENT T5-T8 DUNGEON VALIDATION

Benchmark Mastery profiles:
- T5: 36 / 36 / 36;
- T6: 46 / 46 / 46;
- T7: 56 / 56 / 56;
- T8: 65 / 65 / 65;

Order = family / equipped spec / sibling specs.

Prepared favorable artifact `.3` + cape + potion:
- T5: 16/20; all misses at 96.8-99.2% boss progress;
- T6: 20/20;
- T7: 20/20;
- T8: 19/20; only miss at 97.0% boss progress.

These near-clears are accepted because the deterministic auto-potion harness is conservative relative to player-controlled potion timing.

Base same-tier `.3` + cape + potion:
- Keeper remains 5/5 at T5, T6, T7 and T8;
- non-Keeper base leaks exist and are accepted;
- do not tune toward universal 0/5 non-Keeper base clears when doing so threatens favorable artifact viability.

Neutral artifact aggregate clears:
- T5: 58.3%;
- T6: 61.7%;
- T7: 68.3%;
- T8: 65.0%.

Neutral leaks are expected by design and are not a regression by themselves.

Detailed evidence and per-faction tables:
`AI_BIBLE/05_BALANCE/2026-08-23_FACTION_DUNGEON_BALANCE_BASELINE.md`

---

# 4. BALANCE CHANGE CONTROL

The faction dungeon T4-T8 state is frozen until a dependent system materially changes.

Any future dungeon retune must rerun all three evidence sets together:
- favorable artifact dungeon benchmark;
- base + neutral artifact leak benchmark;
- artifact World benchmark.

Do not tune one boss, weapon or faction from one isolated synthetic result.

The automatic potion harness is explicitly a conservative diagnostic. Player timing can outperform it.

---

# 5. HISTORICAL BASELINES

Still valid for unchanged systems:
- `AI_BIBLE/05_BALANCE/2026-08-20_GLOBAL_BALANCE_BASELINE.md`
- `AI_BIBLE/05_BALANCE/2026-08-21_COMBAT_PROGRESSION_BASELINE.md`

Superseded portion:
- dungeon section of the 2026-08-20 global baseline.

Current dungeon authority:
- `AI_BIBLE/05_BALANCE/2026-08-23_FACTION_DUNGEON_BALANCE_BASELINE.md`.
