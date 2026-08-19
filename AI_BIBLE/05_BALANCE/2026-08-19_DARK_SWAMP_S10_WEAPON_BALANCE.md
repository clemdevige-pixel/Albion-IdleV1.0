# Albion Idle — Dark Swamp S10 — Weapon balance validation

Date: 2026-08-19
Status: VALIDATED / FREEZE
Branch: agent/albion-idle-development

## Goal

Dark Swamp Segment 10 is the first deliberate progression wall used to validate the T3 combat curve.

Validation contract used here:
- T3 equipment;
- weapon specialization mastery 10;
- Segment 10 must NOT be cleared naturally by the Full T3 benchmark;
- Segment 10 must be clearable with healing potions;
- weapons should retain distinct profiles without forcing identical TTK or remaining HP.

## Weapon model rule

Weapon abilities follow this content model:
- weapon family defines Spell 1 and Spell 2;
- weapon specialization defines Spell 3;
- Spell 3 unlocks at specialization mastery 30 and therefore must NOT be used to solve the Dark Swamp S10 wall tested at mastery 10.

This rule is important for future balancing: an early-game wall must be adjusted through content actually available at that point.

## Changes validated

### Broadsword T3

T3 physical base damage is now 48.

The adjustment is intentionally T3-specific. Shared Sword family abilities and higher weapon tiers were not changed to solve this wall.

### Dagger family — Spell 2

`Rafale de lames` / `effect_dagger_opening`:
- direct spell damage remains unchanged;
- Opening lasts 4 seconds;
- target takes +10% damage from auto-attacks while Opening is active.

A temporary +20% test was rejected: it improved TTK but did not provide the intended survival margin on S10. Final value is frozen at +10%.

The effect is implemented through the generic data-driven stat `stat_auto_attack_damage_taken_bonus`; do not replace this with a Dagger-specific runtime exception.

### Dagger Pair — Spell 3

`Assassinat` is independent from Opening:
- base damage ratio: 2.20 (220%);
- below 50% target HP: +1.30 bonus ratio, for 3.50 total (350%).

This specialization spell is not part of the mastery-10 S10 wall solution because it unlocks later.

### Dagger Pair T3

T3 physical base damage changed from 34 to 38.

Higher Dagger Pair tiers remain unchanged by this balancing pass.

## Final benchmark — Dark Swamp S10

### Full T3, mastery 10, without potion

No tested weapon clears S10:
- Broadsword: last clear S8, wall S9;
- Longbow: last clear S9, wall S10;
- Infernal Staff: last clear S9, wall S10;
- Spiked Gauntlets: last clear S9, wall S10;
- Dagger Pair: last clear S9, wall S10.

Dagger Pair finishes S9 at 9.7% HP in the benchmark and still fails S10.

### Full T3, mastery 10, with potion

| Weapon | S10 | HP remaining | Time | Potions |
| --- | --- | ---: | ---: | ---: |
| Broadsword | Clear | 28.9% | 41.5 s | 2 |
| Longbow | Clear | 21.5% | 31.5 s | 1 |
| Infernal Staff | Clear | 31.1% | 40.0 s | 2 |
| Spiked Gauntlets | Clear | 25.5% | 38.5 s | 2 |
| Dagger Pair | Clear | 34.6% | 37.0 s | 2 |

Dagger Pair S10 encounter 5:
- starts at 63.4% HP;
- ends at 34.6% HP;
- 10.5 s;
- 1 potion used;
- 886 damage dealt;
- 311.5 damage received.

## Validation

The intended wall is preserved: Full T3/mastery 10 does not naturally clear S10, while the potion setup clears it for all five tested weapons.

The final Dagger tuning gives meaningful survival space on the potion clear without removing the natural S10 wall.

Final Dagger T3 contract:
- base physical damage: 38;
- Opening: +10% auto-attack damage taken for 4 s;
- S3 Assassination: 220%, 350% below 50% HP;
- freeze these values until a later global balance pass provides evidence that they need reopening.

## Benchmark command

From repository root:

```powershell
pnpm.cmd exec tsx --tsconfig tsconfig.base.json scripts/runtime-dark-swamp-wall.ts
```

Do not run this script as plain `pnpm.cmd exec tsx scripts/runtime-dark-swamp-wall.ts`: root TS path aliases such as `@game/gameplay` require `tsconfig.base.json` in this execution path.
