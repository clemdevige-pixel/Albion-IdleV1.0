# 44C — FACTION ARTIFACT WEAPON ROSTER

Status: VALIDATED DESIGN BASELINE
Authority: canonical roster, combat design and initial balance targets for faction artifact weapons
Last update: 2026-08-23

---

## 1. PURPOSE

This document defines the canonical Albion Idle faction artifact weapon roster and its combat-design baseline.

The roster adapts Albion Online weapon families to Albion Idle rather than reproducing Albion Online faction attribution one-to-one.

---

## 2. CANONICAL RULES

- Scope: Sword, Bow, Fire Staff, War Gloves and Dagger.
- Each family keeps its existing Albion Idle base weapon.
- Each family receives exactly four faction artifact variants: Keeper, Morgana, Undead and Heretic.
- A base weapon cannot also occupy an artifact slot in the same family.
- Avalonian weapons are categorically excluded from this roster.
- When no suitable historical faction-artifact weapon exists for a slot, a non-Avalonian Albion Online weapon from the same family may be reassigned.
- No new weapon name is invented.
- The first two active abilities remain shared at family level; only the third active/signature ability is specialization-specific.
- Artifact weapons use the same weapon/content/runtime architecture as base weapons. No faction-specific combat subsystem is allowed.
- Every artifact weapon declares only its faction affinity; dungeon advantage is resolved from the global faction matrix in section 8.

---

## 3. CANONICAL ROSTER

| Family | Base weapon | Keeper | Morgana | Undead | Heretic |
|---|---|---|---|---|---|
| Sword | Broadsword | Clarent Blade | Carving Sword | Galatine Pair | Claymore |
| Bow | Longbow | Bow of Badon | Wailing Bow | Whispering Bow | Warbow |
| Fire Staff | Infernal Staff | Wildfire Staff | Blazing Staff | Brimstone Staff | Great Fire Staff |
| War Gloves | Spiked Gauntlets | Ursine Maulers | Ravenstrike Cestus | Hellfire Hands | Battle Bracers |
| Dagger | Dagger Pair | Bloodletter | Demonfang | Deathgivers | Claws |

Total: **20 faction artifact variants**.

---

## 4. SWORD

Shared abilities:
1. Frappe héroïque
2. Brise-garde

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Clarent Blade | Keeper | Crescent Slash | 2.00x physical | 24s | 1H | 1.25 | 89 | 129 | 187 | 271 | 393 |
| Carving Sword | Morgana | Fearless Strike | 1.45x physical + -20 Armor 6s | 28s | 2H | 1.10 | 102 | 148 | 215 | 312 | 452 |
| Galatine Pair | Undead | Soulless Stream | 2.60x physical | 30s | 2H | 0.95 | 118 | 171 | 248 | 360 | 522 |
| Claymore | Heretic | Charge | 1.65x physical + Stun 1s | 25s | 2H | 1.10 | 102 | 148 | 215 | 312 | 452 |

Carving rule:
- Fearless Strike `-20 Armor / 6s` is independent from Brise-garde `-12 Armor / 5s`.
- Both may coexist for a raw `-32 Armor` overlap.
- They do not merge, refresh or replace each other.

Approximate raw T4 AA anchors: Clarent 111.25, Carving 112.20, Galatine 112.10, Claymore 112.20.

---

## 5. BOW

Shared abilities:
1. Tir ajusté
2. Flèche perforante

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Bow of Badon | Keeper | Tempête déchaînée | 1.35x physical + Stun 1.25s | 28s | 2H | 1.00 | 121.8 | 177 | 257 | 373 | 541 |
| Wailing Bow | Morgana | Demon Arrow | 2.20x physical | 26s | 2H | 0.95 | 116 | 168 | 244 | 354 | 513 |
| Whispering Bow | Undead | Undead Arrows | 6s: +20% AS, +0.35x magical bonus per AA, +15% damage received | 22s | 2H | 1.15 | 94 | 136 | 197 | 286 | 415 |
| Warbow | Heretic | Magic Arrow | 2.00x magical, scaling from weapon physical damage | 20s | 2H | 1.10 | 100 | 145 | 210 | 305 | 442 |

Whispering rule:
- the `+0.35x` component is a separate magical bonus-damage instance on auto-attacks;
- it is not a multiplier on the base auto-attack;
- attack-speed bonus and vulnerability last the same 6 seconds.

Badon already existed before this expansion and remains the Keeper artifact reference.

Approximate raw T4 AA anchors before signature effects: Badon 121.8, Wailing 110.2, Whispering 108.1, Warbow 110.0.

---

## 6. FIRE STAFF

Shared abilities:
1. Boule de feu
2. Explosion infernale

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Wildfire Staff | Keeper | Magma Sphere | 1.30x magical + DoT 0.20x x4 | 24s | 2H | 0.95 | 118 | 171 | 248 | 360 | 522 |
| Blazing Staff | Morgana | Flame Tornado | 0.75x magical x3 hits | 27s | 2H | 1.00 | 111 | 161 | 233 | 338 | 490 |
| Brimstone Staff | Undead | Meteor | 2.75x magical | 30s | 2H | 0.80 | 140 | 203 | 294 | 426 | 618 |
| Great Fire Staff | Heretic | Pyroblast | 1.85x magical + Silence 1.5s | 24s | 2H | 0.90 | 124 | 180 | 261 | 378 | 548 |

Infernal Staff remains the base-family reference at `126 x 0.90 = 113.4` raw T4 AA DPS.
Approximate artifact T4 anchors: Wildfire 112.1, Blazing 111.0, Brimstone 112.0, Great Fire 111.6.

---

## 7. WAR GLOVES

Shared abilities:
1. Onde percutante
2. Combo fracassant

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Ursine Maulers | Keeper | Hundred Striking Fists | 0.28x physical x6 + 0.70x magical final component | 22s | 2H | 1.30 | 84 | 122 | 177 | 257 | 373 |
| Ravenstrike Cestus | Morgana | Earth Crusher | 2.10x magical + Stun 1s, scaling from weapon physical damage | 28s | 2H | 1.00 | 110 | 160 | 232 | 336 | 487 |
| Hellfire Hands | Undead | Infernal Boulder | 0.90x physical + DoT 0.16x x4 | 20s | 2H | 1.15 | 98 | 142 | 206 | 299 | 434 |
| Battle Bracers | Heretic | Falcon Smash | 2.35x physical | 26s | 2H | 1.25 | 88 | 128 | 186 | 270 | 392 |

Spiked Gauntlets remain the base-family reference at approximately `92.4 x 1.204 = 111.2` raw T4 AA DPS.
Approximate artifact T4 anchors: Ursine 109.2, Ravenstrike 110.0, Hellfire 112.7, Battle Bracers 110.0.

---

## 8. DAGGER

Shared abilities:
1. Double entaille
2. Rafale de lames

### Base specialization correction

Dagger Pair no longer owns the family execute identity.

Its signature becomes **Assaut croisé**:
- `1.35x physical x2 hits`;
- `+0.45x` total bonus when `effect_dagger_opening` from Rafale de lames is active;
- cooldown `15s`;
- no target-health threshold.

The execute identity moves to Bloodletter, where it is more coherent with the Albion weapon identity.

### Artifact variants

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Bloodletter | Keeper | Lunging Stabs | 1.30x physical; +1.30x below 40% target HP | 24s | 1H | 1.45 | 75 | 109 | 158 | 229 | 332 |
| Demonfang | Morgana | Blood Ritual | 0.72x magical x3 hits, scaling from weapon physical damage | 24s | 1H | 1.25 | 87 | 126 | 183 | 265 | 384 |
| Deathgivers | Undead | Ghost Strike | 1.65x magical +0.90x if `effect_dagger_opening`, scaling from weapon physical damage | 22s | 2H | 1.35 | 81 | 117 | 170 | 247 | 358 |
| Claws | Heretic | Disembowel | 0.32x physical x4 + Stun 1.25s + DoT 0.15x x3 | 26s | 2H | 1.15 | 95 | 138 | 200 | 290 | 421 |

Dagger Pair remains the base stat reference at `81.2 x 1.392 ≈ 113.0` raw T4 AA DPS.
Approximate artifact T4 anchors: Bloodletter 108.8, Demonfang 108.8, Deathgivers 109.4, Claws 109.3.

---

## 9. DUNGEON FACTION ADVANTAGE

Faction artifact weapons receive a dungeon-only bonus:

`+20% damage dealt` against their designated countered faction.

Canonical directed loop:

`Keeper -> Morgana -> Undead -> Heretic -> Keeper`

| Artifact faction | Keeper enemies | Morgana enemies | Undead enemies | Heretic enemies |
|---|---:|---:|---:|---:|
| Keeper | +0% | **+20%** | +0% | +0% |
| Morgana | +0% | +0% | **+20%** | +0% |
| Undead | +0% | +0% | +0% | **+20%** |
| Heretic | **+20%** | +0% | +0% | +0% |

Rules:
- applies only during faction Dungeon combat;
- applies to all damage generated by the equipped artifact weapon loadout: auto-attacks, abilities, DoTs and authored bonus-damage components;
- no bonus against own faction or the two non-countered factions;
- no penalty against any faction;
- base/non-artifact weapons receive no faction damage bonus;
- the matrix is global relationship data, never duplicated in individual weapon logic.

---

## 10. ACQUISITION AND BENCHMARK POLICY

Faction artifact weapons are intended to be obtained **after the corresponding world-zone clear** that unlocks/accesses their acquisition path.

Balance consequence:
- they are post-clear rewards, not tools required to beat the wall that grants access to them;
- benchmark interpretation is therefore more permissive than for base weapons;
- a faction artifact may clear a wall slightly earlier or more comfortably than a base weapon without being classified as a balance leak;
- this intentional reward power does **not** authorize major progression skips, multi-tier bypasses or a weapon that invalidates later progression walls;
- faction matchup `+20%` results must be measured separately from neutral-matchup weapon power.

Benchmark priority:
1. no catastrophic progression skip;
2. healthy intra-family spread outside the favorable faction matchup;
3. visible but controlled advantage in the favorable dungeon matchup;
4. 1H variants must be evaluated with their legal offhand context;
5. acquisition timing remains part of leak severity assessment.

---

## 11. IMPLEMENTATION CONTRACT

- Artifact variants are regular weapon specializations in the authoritative weapon content catalog.
- No Keeper/Morgana/Undead/Heretic branches are allowed in the combat loop.
- Cross-type ability damage must remain data-authored: output damage type and scaling damage type are separate generic concepts.
- Temporary self buffs/debuffs use the existing effect/stat modifier pipeline.
- Additional auto-attack damage uses generic temporary auto-attack bonus-damage stats, not weapon-name checks.
- The dungeon faction bonus composes with the existing faction-cape post-mitigation resolver; resolvers must not overwrite one another.
- Presentation assets are not invented. Missing artifact presentation remains undefined until real assets are supplied.

---

## 12. DESIGN STATUS

Sword: VALIDATED DESIGN / runtime integration in progress.
Bow: VALIDATED DESIGN / runtime integration in progress; Badon pre-existed.
Fire Staff: VALIDATED DESIGN / runtime integration in progress.
War Gloves: VALIDATED DESIGN / runtime integration in progress.
Dagger: VALIDATED DESIGN, including Dagger Pair signature correction / runtime integration in progress.
Faction directed advantage: VALIDATED DESIGN / runtime integration in progress.
Benchmark leak policy: VALIDATED.

Runtime benchmarks remain authoritative before final balance lock.

---

DOCUMENT TERMINE
