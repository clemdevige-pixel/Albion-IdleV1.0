# Faction Rune World Drop Baseline — 2026-08-24

Status: VALIDATED TESTER BASELINE / LIVE VALUES MAY CHANGE AFTER TESTER FEEDBACK
Authority: numeric balance reference for the common Faction Rune world-drop channel

## 1. Unlock

The world-drop channel is unavailable until `Localisation des Sanctuaires` completes.

Canonical capability:

- `faction_rune:world_drop`

Only Keeper / Heretic / Undead / Morgana monsters are eligible.

Blue T3 zones do not produce T4 Faction Runes. The Blue-band Rune channel starts at Golden Steppe T4.

## 2. Common Rune

World combat grants the matching-tier common Rune:

- T4 -> `item_resource_rune_faction_t4`
- T5 -> `item_resource_rune_faction_t5`
- T6 -> `item_resource_rune_faction_t6`
- T7 -> `item_resource_rune_faction_t7`
- T8 -> `item_resource_rune_faction_t8`

Each successful proc grants exactly 1 Rune.

## 3. Design target

The world channel is an active complement to the Faction Expedition, not a replacement for it.

Tester-baseline target at Faction Mastery 0 on the deepest currently farmable reference point:

| Tier | Target world Rune/h |
|---|---:|
| T4 | ~6/h |
| T5 | ~10/h |
| T6 | ~18/h |
| T7 | ~30/h |
| T8 | ~45/h |

Faction Expedition target discussed alongside this baseline:

| Tier | Expedition Rune/h target |
|---|---:|
| T4 | 8/h |
| T5 | 14/h |
| T6 | 25/h |
| T7 | 40/h |
| T8 | 60/h |

The Expedition remains passive and predictable. World farming is active and progression-sensitive.

## 4. Final displayed world rates

Rates are authored as FINAL per-kill probabilities. They are not hidden multipliers.

The runtime interpolates only between the authored `start` and `end` final rates of a zone across S1 -> S10. The Bestiary displays the same resulting probability source used by runtime rolls.

### T4 / Blue

The first three Blue zones are T3 and have 0% Rune chance.

| Zone | S1 | S10 |
|---|---:|---:|
| Birch Forest | 0% | 0% |
| Dark Swamp | 0% | 0% |
| Stone Highlands | 0% | 0% |
| Golden Steppe | 0.50% | 0.85% |
| Frostpeak Mountain | 0.85% | 1.15% |

### T5 / Yellow

| Zone | S1 | S10 |
|---|---:|---:|
| Amberwood Forest | 0.75% | 0.90% |
| Gloamfen Marsh | 0.95% | 1.20% |
| Stormwatch Highlands | 1.25% | 1.50% |
| Sunscar Steppe | 1.55% | 1.80% |
| Ironveil Peaks | 1.85% | 2.10% |

### T6 / Orange

| Zone | S1 | S10 |
|---|---:|---:|
| Cinderwood Forest | 1.80% | 2.20% |
| Rotfen Marsh | 2.30% | 2.70% |
| Thundercrag Highlands | 2.80% | 2.90% |
| Emberwind Steppe | 3.10% | 3.60% |
| Ashenpeak Mountain | 3.80% | 4.30% |

### T7 / Red

| Zone | S1 | S10 |
|---|---:|---:|
| Bloodwood Forest | 3.00% | 3.80% |
| Dreadfen Marsh | 4.00% | 4.80% |
| Redspire Highlands | 5.00% | 5.60% |
| Crimson Steppe | 5.80% | 6.90% |
| Doompeak Mountain | 7.20% | 8.30% |

### T8 / Black

| Zone | S1 | S10 |
|---|---:|---:|
| Blackwood Forest | 4.75% | 6.00% |
| Shadowfen Marsh | 6.40% | 7.80% |
| Obsidian Highlands | 8.20% | 9.80% |
| Duskfall Steppe | 10.20% | 13.60% |
| Blackspire Mountain | 13.60% | 13.60% |

Blackspire is not yet farmable by the T8.3 calibration profile. The tester baseline therefore does NOT invent a higher Blackspire cap. Retune after tester/progression evidence.

## 5. Faction Mastery interaction

Faction Mastery remains:

- +0.5% yield per level;
- maximum level 100;
- +50% yield at level 100.

For the Rune world channel, mastery increases expected Rune yield on top of the displayed base rate.

Examples:

- displayed 10.00%, mastery 0 -> 10.00% effective EV;
- displayed 10.00%, mastery 50 (+25%) -> 12.50% effective EV;
- displayed 10.00%, mastery 100 (+50%) -> 15.00% effective EV.

The Bestiary labels the authored value as `Taux de base` so it remains clear that mastery can improve it.

## 6. Calibration source

The baseline was calibrated from the live combat benchmark using:

- matching tier Tn.3 gear;
- the existing tier mastery profile;
- all five base weapon families;
- multi-zone / multi-depth measurements;
- 5 encounters per world segment.

Reference deepest-farmable observed kills/h:

| Tier | Reference | Kills/h | Target proc |
|---|---|---:|---:|
| T4 | Frostpeak Mountain S9 | 523.3 | ~1.15% |
| T5 | Ironveil Peaks S9 | 475.9 | ~2.10% |
| T6 | Ashenpeak Mountain S9 | 416.9 | ~4.32% |
| T7 | Doompeak Mountain S9 | 361.5 | ~8.30% |
| T8 | Duskfall Steppe S9 | 330.8 | ~13.60% |

The authored rates intentionally make deeper progression more rewarding despite lower kills/hour.

## 7. Tester policy

These numbers are NOT permanent balance law.

They are the V1 tester baseline and may be changed after observing:

- real player kills/hour;
- progression depth chosen for farming;
- Rune stock accumulation;
- cape / artifact-weapon craft and enchant demand;
- Faction Mastery distribution;
- relative Expedition vs world contribution.

Numeric retuning must remain data-only and must not require runtime changes.
