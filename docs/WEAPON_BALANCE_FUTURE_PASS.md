# Weapon balance pass — CLOSED 2026-08-23

Status: CLOSED / HISTORICAL POINTER

The roster-wide weapon balance pass that this document previously deferred has now been completed.

Current authoritative balance index:

`AI_BIBLE/05_BALANCE/2026-08-23_GLOBAL_BALANCE_BASELINE.md`

Current faction-dungeon authority:

`AI_BIBLE/05_BALANCE/2026-08-23_FACTION_DUNGEON_BALANCE_BASELINE.md`

## Final base-weapon role read

The live base roster is now interpreted by role rather than by one universal DPS ranking:

- Broadsword: General Progression / Boss secondary;
- Longbow: Fame Farm / General Progression secondary;
- Infernal Staff: Boss / Dungeon secondary;
- Spiked Gauntlets: Fame Farm / Dungeon secondary;
- Dagger Pair: Boss / Dungeon secondary.

The Dagger Pair received the final targeted correction on its specialization signature only:

- `Assaut croisé` direct ratio: `1.45 -> 1.85`;
- `Opening` conditional bonus ratio: `0.55 -> 0.95`;
- cooldown unchanged at `15s`;
- shared Dagger abilities, attack speed and flat weapon damage unchanged.

Final post-change boss-only control on Frostpeak Mountain:

- Dagger Pair: `192.5 DPS`, `21.0s`, `22.1% HP` remaining;
- Infernal Staff: `192.5 DPS`, `21.0s`, `14.6% HP` remaining;
- Longbow: `188.0 DPS`, `21.5s`, `14.6% HP` remaining.

The world wall benchmark remained stable at `2/9` clears for Dagger Pair after the correction. The change therefore restores its intended boss/combo identity without creating a new world progression leak.

## Permanent authoring rule

Do not restart isolated weapon micro-tuning from one headline DPS value.

Future weapon changes must be evaluated against:

1. the weapon's authored role in `AI_BIBLE/20_DATA/23A_WEAPON_BALANCE_PROFILES.txt`;
2. real runtime boss/role telemetry;
3. world progression guardrails;
4. faction-dungeon favorable/leak guardrails when the changed weapon participates in dungeon balance.

Temporary calibration sweeps used to derive the 2026-08-23 baseline have been removed once superseded by the canonical global-balance suite.

## Re-open criteria

Re-open weapon balance only when a dependent system materially changes, including:

- weapon roster or shared family abilities;
- Mastery/IP scaling;
- enchantment scaling;
- armor/defensive scaling;
- potion/cape behavior;
- world boss-gate curves;
- dungeon faction matchup rules.

Until then, the 2026-08-23 state is the live baseline.
