# Tower Endless — final balance candidate (2026-08-30)

Status: **final micro-pass candidate locked for benchmark, not yet live-authored**.

This file exists to prevent loss of decisions made during the Tower Endless balance pass. Do not partially apply it: after the final benchmark is accepted, the live implementation must reproduce the full set below.

## Design targets

- Tower balance is **Tower-only**. Do not change dungeon authored balance.
- Favorable faction matchup: expected to clear the relevant block, generally ending around **10–25% HP** depending on weapon.
- Neutral matchup leaks: rare and anecdotal; target approximately **0–5%** globally.
- Keep small faction difficulty variance, but no large faction wall.
- No per-tier weapon exceptions. Weapon kits remain tier-agnostic/data-driven.

## Tower faction × tier normalization candidate

These multiply the dungeon-derived enemy combat profile only inside Tower:

| Faction | T4 | T5 | T6 | T7 | T8 base |
|---|---:|---:|---:|---:|---:|
| Keeper | 1.50 | 1.40 | 1.48 | 1.50 | 1.13 |
| Heretic | 1.45 | 1.47 | 1.47 | 1.58 | 1.15 |
| Undead | 1.50 | 1.47 | 1.55 | 1.58 | 1.15 |
| Morgana | 1.50 | 1.43 | 1.48 | 1.65 | 1.15 |

Final T8 candidate adds **x1.05** on top of the T8 faction multiplier only.

## Family policy

### Daggers

Remove the shared sustain from **Double Slash** for the entire dagger family:

- remove `heal_from_damage` (currently 12% damage dealt, capped at 1.5% max HP/use)
- do not add specialization-specific sustain exceptions

## Artifact weapon candidate tuning

Values below are the intended authored/live targets after final validation.

### Bow

- **Bow of Badon / Raging Storm**: direct ratio `1.35 -> 1.05`
- **Whispering Bow / Undead Arrows**:
  - remove the `+15% damage taken` self-vulnerability
  - auto-attack bonus-window ratio `0.50 -> 0.60`

### Fire Staff

- **Wildfire Staff / Magma Sphere**: direct ratio `1.30 -> 1.45`; DoT remains `0.20 x4`
- **Blazing Staff / Flame Tornado**: per-hit ratio `1.50 -> 1.35` (`3 hits`)
- **Great Fire Staff / Pyroblast**: direct ratio `2.00 -> 3.55`; silence unchanged

### Gloves

- **Ursine Maulers / Hundred Striking Fists**:
  - six-hit opener remains `0.30 x6`
  - magical finisher `1.65 -> 2.50`
- **Battle Bracers / Falcon Smash**: direct ratio `2.60 -> 3.75`

### Sword

- **Galatine Pair / Soulless Stream**: direct ratio `2.60 -> 2.90`

### Daggers

- **Bloodletter / Lunging Stabs**: unchanged after family sustain removal
- **Demonfang / Blood Ritual**: per-hit ratio `2.00 -> 1.15` (`3 hits`)
- **Deathgivers / Ghost Strike**:
  - base ratio remains `1.80`
  - `Opening` bonus ratio `0.90 -> 2.50`
  - prepared total becomes `4.30x`
  - identity: setup with shared dagger `Opening`, then heavy prepared burst; no cooldown-reset exception
- **Claws / Disembowel**:
  - per-hit ratio `1.40 -> 1.03` (`4 hits`)
  - bleed ratio `0.15 -> 0.10` (`3 ticks`)

## Explicit non-decisions / guards

- Do **not** introduce Demonfang tier-specific ratios.
- Do **not** change dungeon combat profiles to balance Tower.
- Do **not** nerf Bloodletter execution based on the old leak result; its neutral leaks disappeared after family sustain removal.
- Do **not** add specialization-only dagger sustain.
- Do **not** change Ravenstrike / Carving / other high-T8 performers individually in this final micro-pass.
- Do **not** reduce the chosen T8 extra multiplier below or above `x1.05` in this gate.

## Final benchmark gate

Run all artifact weapons across T4–T8 with:

- faction damage bonuses enabled
- anti-faction cape reduction enabled
- monster faction resilience enabled
- faction × tier Tower normalization above
- T8 extra `x1.05`
- every weapon/family change above

Acceptance review must report:

1. favorable clear rate + HP remaining per weapon/tier;
2. favorable failures;
3. neutral leaks per tier and leaking weapons;
4. special attention to T8 and Deathgivers.

Only after this benchmark is accepted should the candidate be authored into live data/runtime.