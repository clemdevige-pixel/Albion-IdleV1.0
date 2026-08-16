# Future weapon balance pass

Deferred intentionally until the weapon roster is larger.

## Current known debt

The Yellow investigation found that Spiked Gauntlets and Dagger Pair underperform Longbow/Infernal in real CombatRuntime output. A Blue Frostpeak control showed that the gap already exists before Yellow, so it must not be compensated by weakening future zone curves.

A small global Q correction was already made during this investigation:

- Spiked Q coefficient: `0.776 -> 1.08`.
- Dagger Q coefficient: `0.435 -> 0.50`.

Do not continue micro-tuning these weapons in isolation unless a gameplay-breaking regression appears. Revisit them in the roster-wide pass.

## What the future pass must compare

For every weapon and relevant tier/mastery breakpoint, compare the complete package rather than one headline DPS number:

- AA damage/hit and real attacks/second;
- Q/W/ultimate DPS over actual combat duration;
- cooldowns and successful casts;
- multi-hit hit counts;
- DoT/effect contribution;
- buffs/debuffs and indirect value (for example armor shred);
- opener/burst windows and sustained DPS;
- survivability/utility where the weapon identity provides it;
- performance across representative enemy resistance/HP profiles;
- progression across tier, enchantment and mastery unlocks.

## Existing tools to reuse

Prefer the existing architecture and extend it rather than adding new simulators:

- `apps/client/src/data/weaponIdealBenchmark.ts` for theoretical/ideal weapon package analysis;
- `apps/client/src/runtime/CombatRuntimeBenchmarkHarness.ts` for real runtime combat;
- weapon package/contract tests for structural invariants;
- validated world-band checkpoints as control groups.

For detailed investigations, telemetry can split actual runtime damage into AA/Q/W/ULT/effect and compare AA-only versus full-kit behavior. Keep such telemetry as an on-demand diagnostic rather than permanent duplicated production logic.

## Important lessons

- Damage per cast is not a balance metric when cooldowns differ; use DPS over real combat time.
- Total AA damage can mislead when fight durations differ; compare DPS and cadence.
- Multi-hit is not inherently disadvantaged by the current proportional mitigation formula.
- Kit synergies can change apparent AA performance; isolate AA-only when needed.
- A theoretical benchmark is a screening tool, not proof of runtime parity.
- Never fix an outlier weapon by weakening a world band before checking a validated control band.

## Exit criteria for the future pass

The pass should happen when the roster is broad enough to define archetype targets. Establish acceptable bands for sustained DPS, burst, utility and survivability, then calibrate weapons horizontally. After weapon changes, re-run representative Blue/Yellow/future-band progression checkpoints to ensure world balance still holds.
