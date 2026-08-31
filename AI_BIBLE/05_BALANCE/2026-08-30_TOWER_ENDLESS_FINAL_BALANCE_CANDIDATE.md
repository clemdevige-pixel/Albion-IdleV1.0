# Tower Endless — final balance baseline (2026-08-30)

Status: **authored live on `agent/albion-idle-development`; single-baseline refactor pending final benchmark confirmation**.

This file is the source of truth for the Tower Endless balance pass. The implementation must match this document; do not reintroduce benchmark-only tuning layers.

## Design targets

- Tower balance is **Tower-only**. Dungeon authored balance is unchanged.
- Favorable faction matchup should normally clear the relevant block; small anecdotal failures are acceptable.
- Favorable survivors generally target roughly **10–25% HP**, with weapon variance accepted.
- Neutral matchup leaks remain rare/anecdotal, approximately **0–5% globally**.
- Keep small faction difficulty variance without faction walls.
- No per-tier weapon exceptions. Weapon kits remain tier-agnostic and data-driven.

## Canonical Tower pipeline

`Dungeon profile -> floor-role tuning -> Tower baseline -> Endless depth scaling`

There is exactly one authored faction × tier baseline matrix. The former separate normalization and Difficulty 0 calibration layers are retired.

## Tower baseline — authored live

| Faction | T4 | T5 | T6 | T7 | T8 |
|---|---:|---:|---:|---:|---:|
| Keeper | 1.2165 | 1.1172 | 1.07744 | 1.1595 | 1.1781945 |
| Heretic | 1.02573 | 0.8961855 | 0.9994236 | 1.0869768 | 1.1053455 |
| Undead | 1.01385 | 0.990927 | 1.019745 | 1.0494992 | 1.08882675 |
| Morgana | 1.023945 | 1.0105238 | 1.017648 | 1.0204425 | 1.08675 |

These values are the collapsed starting point from the previously validated live normalization × Difficulty 0 calibration. Final runtime acceptance remains the 100 favorable-matchup benchmark after the one-stage refactor because integer rounding happens at a different point.

## Endless depth scaling

- Floors 1–25 use the Tower baseline unchanged.
- After floor 25, each entered five-floor block adds `+1%` to HP, damage, armor and magic resistance.
- No special potion rule or alternate HP/damage scaling model is authored.

## Family policy

### Daggers

**Double Slash has no sustain.** The shared `heal_from_damage` mechanic is removed for the entire dagger family. No specialization-specific sustain exception is allowed.

## Weapon tuning — authored live

### Bow

- **Bow of Badon / Raging Storm**: direct ratio `1.35 -> 1.05`.
- **Whispering Bow / Undead Arrows**:
  - cooldown `22s -> 20s`;
  - remove `+15% damage taken` self-vulnerability;
  - auto-attack bonus-window ratio `0.50 -> 0.60`.

### Fire Staff

- **Wildfire Staff / Magma Sphere**: direct ratio `1.30 -> 1.45`; DoT remains `0.20 x4`.
- **Blazing Staff / Flame Tornado**: per-hit ratio `1.50 -> 1.35` (`3 hits`).
- **Great Fire Staff / Pyroblast**:
  - cooldown `16s -> 14s`;
  - direct ratio `2.00 -> 3.55`;
  - silence unchanged.

### Gloves

- **Ursine Maulers / Hundred Striking Fists**:
  - six-hit opener remains `0.30 x6`;
  - magical finisher `1.65 -> 2.65`.
- **Battle Bracers / Falcon Smash**: direct ratio `2.60 -> 3.90`.

### Sword

- **Galatine Pair / Soulless Stream**:
  - cooldown `16s -> 14s`;
  - direct ratio `2.60 -> 2.90`.

### Daggers

- **Bloodletter / Lunging Stabs**: unchanged after family sustain removal.
- **Demonfang / Blood Ritual**: per-hit ratio `2.00 -> 1.15` (`3 hits`).
- **Deathgivers / Ghost Strike**:
  - cooldown remains `16s`;
  - base ratio remains `1.80`;
  - `Opening` bonus ratio `0.90 -> 2.50` (prepared total `4.30x`);
  - auto-cast rule requires `effect_dagger_opening`, so Ghost Strike waits for Flurry setup;
  - no cooldown-reset exception.
- **Claws / Disembowel**:
  - per-hit ratio `1.40 -> 1.06` (`4 hits`);
  - bleed ratio `0.15 -> 0.10` (`3 ticks`).

## Explicit guards

- Do **not** reintroduce separate Tower normalization + Difficulty 0 calibration layers.
- Do **not** introduce Demonfang tier-specific ratios.
- Do **not** change Dungeon combat profiles to balance Tower.
- Do **not** add specialization-only dagger sustain.
- Do **not** re-add Whispering self-vulnerability.
- Do **not** add a second T8 runtime multiplier.
- Do **not** keep benchmark-only ability multipliers once live values are authored.

## Closure policy

After the single-baseline runtime passes the 100 favorable-matchup Difficulty 0 benchmark and resolver tests, this Tower balance pass is closed. Future changes require a new observed gameplay defect or a deliberate design revision, not micro-tuning against benchmark noise.
