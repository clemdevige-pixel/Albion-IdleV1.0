# Tower Endless — final balance baseline (2026-08-30)

Status: **authored live on `agent/albion-idle-development`; final live validation pending**.

This file is the source of truth for the Tower Endless balance pass. The implementation must match this document; do not reintroduce benchmark-only tuning layers.

## Design targets

- Tower balance is **Tower-only**. Dungeon authored balance is unchanged.
- Favorable faction matchup should normally clear the relevant block; small anecdotal failures are acceptable.
- Favorable survivors generally target roughly **10–25% HP**, with weapon variance accepted.
- Neutral matchup leaks remain rare/anecdotal, approximately **0–5% globally**.
- Keep small faction difficulty variance without faction walls.
- No per-tier weapon exceptions. Weapon kits remain tier-agnostic and data-driven.

## Tower faction × tier normalization — authored live

The final T8 +5% calibration is baked directly into the T8 values below. There is no second runtime multiplier.

| Faction | T4 | T5 | T6 | T7 | T8 |
|---|---:|---:|---:|---:|---:|
| Keeper | 1.50 | 1.40 | 1.48 | 1.50 | 1.1865 |
| Heretic | 1.45 | 1.47 | 1.47 | 1.58 | 1.2075 |
| Undead | 1.50 | 1.47 | 1.55 | 1.58 | 1.2075 |
| Morgana | 1.50 | 1.43 | 1.48 | 1.65 | 1.2075 |

These multipliers apply only to Dungeon-derived profiles inside Tower.

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

- Do **not** introduce Demonfang tier-specific ratios.
- Do **not** change Dungeon combat profiles to balance Tower.
- Do **not** add specialization-only dagger sustain.
- Do **not** re-add Whispering self-vulnerability.
- Do **not** add a second T8 runtime multiplier; T8 is already baked into the Tower matrix.
- Do **not** keep benchmark-only ability multipliers once the live values above are authored.

## Closure policy

The balance pass is no longer tuned by repeated 5% micro-iterations. Final validation uses the authored live values above. A very small number of favorable failures near the end of a block may be accepted as deterministic encounter variance if global targets remain healthy. Material systematic failures or neutral leakage are defects; isolated ~95–100% progression failures are not automatically grounds for another tuning cycle.
