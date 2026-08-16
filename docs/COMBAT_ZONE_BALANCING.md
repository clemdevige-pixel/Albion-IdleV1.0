# Combat zone balancing workflow

This document records the workflow validated while calibrating the Yellow T5 band. Future agents should reuse this process for Red/Black/new world bands instead of inventing a parallel balancing layer.

## Source of truth

- Author zone combat curves in `packages/data/src/config/combat-progression.ts`.
- Keep each authored world band independent in `WORLD_COMBAT_PROGRESSION`; never silently reuse another band's curve.
- Validate against the real `CombatRuntime` through `CombatRuntimeBenchmarkHarness`, not only spreadsheet/theoretical DPS.
- Existing progression, equipment, weapon and potion systems must remain the inputs. Do not add zone-specific player buffs to force a target.

## 1. Define the progression contract before tuning numbers

For every zone in the band, write the expected player state at entry and at S10:

- equipment tier and enchantment;
- representative mastery level;
- whether potion use is optional, acceptable, or should not be required;
- intended wall/comfort point.

The Yellow pass used a T5 enchantment ladder across five zones rather than requiring the same enchantment for most bosses. The important rule is distribution: a new enchantment must buy meaningful progression, not become a repeated mandatory tax across several consecutive bosses.

## 2. Start broad, then narrow

Use a broad progression sweep first to locate walls across the full band. Once the intended ladder is visible, stop changing the whole curve and use boundary probes around the failing S10 bosses.

Tune zone endpoints independently where possible. Preserve already validated starts/early segments unless evidence says they are wrong. A late boss problem should not automatically cause an entire zone to be flattened.

## 3. Test a representative weapon set

Do not balance a zone around one weapon. Use several weapon archetypes and compare clear count, time, remaining HP and potion use.

A practical target used during Yellow was roughly 4/5 representative weapons clearing an intended boundary when the loadout is considered appropriate. This is a calibration heuristic, not a permanent universal invariant: weapon roster growth may change the sample and target.

Do not force 5/5 by weakening the zone if one or two weapons are globally underperforming.

## 4. Separate zone balance from weapon balance

When a minority of weapons fails a boundary:

1. compare them with the weapon theoretical/ideal benchmark;
2. inspect real CombatRuntime output;
3. use a previously validated band (Blue) as a control group;
4. only modify the zone if the problem is genuinely zone-specific.

The Yellow investigation demonstrated why this matters: Spiked Gauntlets and Dagger Pair also trailed in the Blue control. Lowering Yellow further would have hidden a cross-weapon balance issue.

## 5. Runtime telemetry beats damage-per-cast

Cooldown-heavy and multi-hit weapons cannot be judged from damage per cast alone. Compare actual DPS contribution over combat duration:

- AA DPS;
- Q DPS;
- W DPS;
- ultimate DPS;
- effect/DoT DPS;
- successful casts and hit counts;
- actual attack cadence when needed.

Use AA-only isolation when kit synergies (armor shred, DoT, buffs/debuffs) make AA totals misleading.

Do not assume multi-hit is penalized by resistance without checking the damage formula. The current mitigation model is proportional, so hit count by itself is not evidence of a resistance problem.

## 6. Potion is a progression variable, not a patch

Potion/no-potion probes are useful around intended boundaries. A potion may legitimately convert a near-clear into a clear when the design contract allows it. It should not be used to excuse a badly placed wall or a globally weak weapon.

## 7. Calibration loop

Recommended loop for a new band:

1. Author progression contract.
2. Add the band's curve and content through existing data-driven structures.
3. Run broad runtime progression sweep.
4. Identify S10/enchantment boundaries.
5. Run targeted boundary probes with representative weapons and potion variants.
6. Make the smallest curve change possible, preferably endpoint-only.
7. Re-run the affected boundary plus neighboring validated checkpoints.
8. If only specific weapons remain outliers, stop zone tuning and run weapon diagnostics/control-band comparison.
9. Validate runtime parity/contracts and the relevant regression suite.
10. Document the final intended progression contract next to the curve.

## Keep vs temporary diagnostics

Permanent tests should protect authored progression contracts, runtime parity and meaningful boundary behavior. Large console-table exploration tests are diagnostic tools: keep them only while actively balancing, or recreate/extend them from the existing benchmark harness when the next large balance pass begins.

The goal is a small durable regression suite, not a historical archive of every exploratory sweep.
