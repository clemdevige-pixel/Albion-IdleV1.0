# Combat zone balancing workflow

This document records the current combat-zone balancing workflow. Future agents should reuse this process instead of inventing parallel tuning layers.

Latest validated combat-progression snapshot:
`AI_BIBLE/05_BALANCE/2026-08-21_COMBAT_PROGRESSION_BASELINE.md`

## Source of truth

- Author zone combat curves in `packages/data/src/config/combat-progression.ts`.
- Keep each authored world band independent in `WORLD_COMBAT_PROGRESSION`.
- Validate against the real `CombatRuntime` through `CombatRuntimeBenchmarkHarness`.
- Existing progression, equipment, weapon and potion systems remain the inputs.
- Never add zone-specific player buffs or runtime/UI exceptions to force a target.

## 1. Separate the three progression questions

Do not collapse every wall into one PASS/FAIL rule.

### A. Enchantment progression

Every same-tier enchantment `.0 -> .1 -> .2 -> .3` must create a visible combat improvement.

Preferred signal is a deeper AFK wall. If the wall is unchanged, improved combat quality is valid evidence: faster clear, more HP remaining, fewer potions, further encounter reached, more damage dealt or longer survival.

A completely invisible enchantment is not acceptable.

Canonical command:
`pnpm.cmd benchmark:enchantment-walls`

### B. Intermediate zones / steps 1-4

These are progression and farm space, not universal gear gates.

Different weapons may reach different depths. Potion may push farther than AFK. Some local `wall -> later clear` anomalies are tolerated as diagnostic debt.

Do not weaken or strengthen a whole band merely to force identical segment walls between weapons.

Canonical exhaustive telemetry:
`pnpm.cmd benchmark:global-enchantment-walls`

### C. Final step-5 S10 gate

This is strict.

For each representative weapon at the end of T4/T5/T6/T7:
- `Tn.2 + potion` must fail;
- `Tn.3` without potion must fail;
- `Tn.3 + potion` must clear.

Canonical command:
`pnpm.cmd benchmark:final-gates`

The final gate is allowed to spike above the following zone entry. The next band returns to the normal progression envelope.

## 2. Tier-transition plateau

After the final gate is cleared, the previous tier `.3` state must retain useful entry access to the next band.

Exact equal depth across weapons is not required. Treat this as transition telemetry unless a specific authored contract promotes it to a blocker.

Canonical command:
`pnpm.cmd benchmark:tier-transitions`

## 3. Test a representative weapon set

Current representative set:
- Broadsword + explicit Reinforced Shield package;
- Longbow;
- Infernal Staff;
- Spiked Gauntlets;
- Dagger Pair.

Do not balance a zone around one weapon. Weapon identity is intentionally asymmetric.

When only one profile breaks a strict contract, diagnose that weapon/package before changing the zone.

## 4. Runtime telemetry beats theoretical DPS

Use theoretical DPS/EHP tools to explain runtime results, not replace them.

Useful runtime telemetry includes:
- clear/fail;
- last clear / first wall;
- encounter reached;
- time;
- HP remaining;
- potion use;
- damage dealt/received;
- AA / ability / effect contributions when diagnosing weapon identity.

## 5. Potion semantics

Potion is a progression variable, not a patch.

- AFK/no-potion remains the farm baseline.
- Potion may legitimately extend intermediate push depth.
- Potion is mandatory in the strict final-gate reference state `Tn.3 + potion`.
- Never excuse a completely invisible enchantment or a broken final gate by saying potion exists.

## 6. Calibration loop

Recommended loop:

1. Define which of the three contracts is being tested: enchantment visibility, intermediate telemetry, or final gate.
2. Run the broad global wall matrix when locating the problem.
3. Use the semantic enchantment benchmark for same-tier upgrades.
4. Use the final-gate benchmark for step-5 S10 only.
5. Diagnose weapon/package differences before changing the whole zone when the failure is isolated.
6. Tune the smallest authored data lever.
7. Re-run the relevant semantic benchmark plus neighboring telemetry.
8. Run typecheck and the durable regression suite.
9. Document the final contract, not the rejected candidate history.

## 7. Keep vs temporary diagnostics

Permanent tools/tests protect semantics:
- live runtime parity;
- visible enchantment progression;
- strict final S10 gates;
- tier bridge/plateau behavior;
- equipment-stat application/rounding;
- weapon/package construction;
- potion behavior;
- deterministic authored data integrity.

Candidate sweeps, sensitivity tables, one-weapon wall probes and rejected formula experiments are temporary diagnostics. Delete them once a live semantic regression replaces them.

The goal is a small durable regression suite, not an archive of every tuning experiment.
