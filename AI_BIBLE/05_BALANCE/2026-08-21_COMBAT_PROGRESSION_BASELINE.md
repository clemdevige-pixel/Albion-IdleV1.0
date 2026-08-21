# Albion Idle — Combat Progression Baseline — 2026-08-21

Status: VALIDATED LIVE COMBAT PROGRESSION BASELINE
Branch: `agent/albion-idle-development`

## Purpose

This document records the validated world/enchantment combat progression contract after the T4-T8 wall consolidation pass.

It is a design/regression snapshot, not a gameplay configuration source. Numeric authority remains in authored data and the live CombatRuntime.

## 1. Representative set

The current representative normal weapon set is:
- Broadsword (+ explicit Reinforced Shield package because it is one-handed)
- Longbow
- Infernal Staff
- Spiked Gauntlets
- Dagger Pair

Weapon identities are intentionally asymmetric. Ordinary progression does not require equal wall depth across weapons.

## 2. Enchantment progression contract

Enchantments `.0 -> .1 -> .2 -> .3` must always create a visible combat improvement.

Preferred signal:
1. the AFK/no-potion wall moves deeper;
2. otherwise the same probe combat becomes measurably better without potion;
3. otherwise active/potion combat becomes measurably better.

Accepted quality signals at an unchanged wall include:
- faster clear;
- more HP remaining;
- fewer potions used;
- further encounter reached on a failed run;
- more damage dealt / longer survival on a failed run.

A flat wall is therefore acceptable when the underlying combat quality clearly improves. A completely invisible enchantment is not acceptable.

Validated result on 2026-08-21:
- 45 same-tier authored enchantment checkpoints checked;
- 45/45 show visible progression;
- 0 invisible enchantments.

Authority benchmark:
`pnpm.cmd benchmark:enchantment-walls`

## 3. Intermediate world walls

Steps 1-4 are progression/farm space, not hard certification gates.

Rules:
- different weapons may wall at different segments;
- potion may push materially farther than AFK;
- some cross-segment leaks are acceptable;
- a later clear after an earlier failed segment is diagnostic debt, not an authored exception and must not be encoded as special-case gameplay logic;
- intermediate walls should remain readable enough for the player to feel gear/enchantment progression, but exact +1 segment movement is not required at every upgrade.

The exhaustive 2026-08-21 matrix measured:
- 440 weapon/zone/enchantment wall profiles;
- 330 consecutive enchantment deltas;
- 21 local non-monotonic `wall -> later clear` diagnostics.

Those 21 diagnostics are accepted for this baseline because they do not bypass an end-of-tier certification gate. They remain useful signals for future curve cleanup.

Authority benchmark:
`pnpm.cmd benchmark:global-enchantment-walls`

## 4. Strict end-of-tier S10 contract

The final S10 of step 5 is the only strict universal gear gate in the current T4-T7 tier transitions.

For every representative weapon:
- full `Tn.2 + potion` = FAIL;
- full `Tn.3` without potion = FAIL;
- full `Tn.3 + potion` = CLEAR.

Validated result on 2026-08-21:
- 20/20 gate rows PASS;
- 0 failures.

This gate must never be bypassed by tuning ordinary step 1-4 leaks.

Authority benchmark:
`pnpm.cmd benchmark:final-gates`

## 5. Tier transition plateau

After clearing the previous tier gate, the next band is allowed to return to a normal farming envelope instead of inheriting the boss spike.

The previous tier `.3` setup should retain useful entry access, but exact identical depth across weapons is not required.

Transition plateaus are diagnostic except where a separate authored progression contract explicitly promotes one to a blocker.

Authority benchmark:
`pnpm.cmd benchmark:tier-transitions`

## 6. Canonical benchmark set

Keep these four tools as the durable world/enchantment balance suite:

1. `benchmark:global-enchantment-walls`
   - exhaustive T4-T8 wall matrix;
   - all representative weapons;
   - all authored zones covered by the tier;
   - `.0/.1/.2/.3`;
   - AFK + potion.

2. `benchmark:enchantment-walls`
   - semantic visible-progression regression for same-tier enchantments.

3. `benchmark:final-gates`
   - strict step-5 S10 certification regression.

4. `benchmark:tier-transitions`
   - next-band plateau/bridge diagnostic.

Candidate sweeps and rejected equipment-curve experiments are temporary diagnostics and must not be kept once the live semantic regression exists.

## 7. Source-of-truth rule

- Difficulty truth = live `CombatRuntimeBenchmarkHarness` + authored world data.
- Equipment truth = authoritative equipment/weapon catalogs + enchantment gameplay balance.
- Ordinary walls are telemetry.
- Visible enchantment progression is a semantic requirement.
- Step-5 S10 final gates are strict blockers.
- Never fix one weapon/zone with a renderer/UI/runtime special case.
