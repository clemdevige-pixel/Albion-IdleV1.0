# 44C — FACTION ARTIFACT WEAPON ROSTER

Status: VALIDATED BALANCE BASELINE V1 — LOCKED
Authority: canonical roster, combat design, crafting contract and V1 balance baseline for faction artifact weapons
Last update: 2026-08-23

---

## 1. PURPOSE

This document defines the canonical Albion Idle faction artifact weapon roster and its combat-design/balance baseline.

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
- Every artifact weapon declares only its faction affinity; dungeon advantage is resolved from the global faction matrix in section 9.
- Artifact weapons are intended to be slightly stronger/more specialized than base weapons even outside their favorable dungeon matchup.
- V1 balance is judged primarily on intra-family artifact spread, not parity with the base weapon.

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

## 4. SWORD — V1 LOCKED

Shared abilities:
1. Frappe héroïque
2. Brise-garde

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Clarent Blade | Keeper | Crescent Slash | 2.00x physical | 24s | 1H | 1.25 | 93 | 135 | 196 | 285 | 413 |
| Carving Sword | Morgana | Fearless Strike | 1.45x physical + -20 Armor 6s | 28s | 2H | 1.10 | 102 | 148 | 215 | 312 | 452 |
| Galatine Pair | Undead | Soulless Stream | 2.60x physical | 30s | 2H | 0.95 | 118 | 171 | 248 | 360 | 522 |
| Claymore | Heretic | Charge | 1.65x physical + Stun 1s | 25s | 2H | 1.10 | 102 | 148 | 215 | 312 | 452 |

Carving rule:
- Fearless Strike `-20 Armor / 6s` is independent from Brise-garde `-12 Armor / 5s`.
- Both may coexist for a raw `-32 Armor` overlap.
- They do not merge, refresh or replace each other.

---

## 5. BOW — V1 LOCKED

Shared abilities:
1. Tir ajusté
2. Flèche perforante

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Bow of Badon | Keeper | Tempête déchaînée | 1.35x physical + Stun 1.25s | 28s | 2H | 1.00 | 121.8 | 177 | 257 | 373 | 541 |
| Wailing Bow | Morgana | Demon Arrow | 2.35x physical | 26s | 2H | 0.95 | 132 | 190 | 276 | 402 | 582 |
| Whispering Bow | Undead | Undead Arrows | 6s: +25% AS, +0.50x magical bonus per AA, +15% damage received | 22s | 2H | 1.15 | 108 | 156 | 226 | 327 | 475 |
| Warbow | Heretic | Magic Arrow | 2.00x magical, scaling from weapon physical damage | 20s | 2H | 1.10 | 110 | 160 | 231 | 336 | 488 |

Whispering rule:
- the `+0.50x` component is a separate magical bonus-damage instance on auto-attacks;
- it is not a multiplier on the base auto-attack;
- attack-speed bonus and vulnerability last the same 6 seconds.

Badon already existed before this expansion and remains the Keeper artifact reference.

---

## 6. FIRE STAFF — V1 LOCKED

Shared abilities:
1. Boule de feu
2. Explosion infernale

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Wildfire Staff | Keeper | Magma Sphere | 1.30x magical + DoT 0.20x x4 | 24s | 2H | 0.95 | 124 | 180 | 260 | 378 | 548 |
| Blazing Staff | Morgana | Flame Tornado | 0.75x magical x3 hits | 27s | 2H | 1.00 | 111 | 161 | 233 | 338 | 490 |
| Brimstone Staff | Undead | Meteor | 2.75x magical | 30s | 2H | 0.80 | 140 | 203 | 294 | 426 | 618 |
| Great Fire Staff | Heretic | Pyroblast | 1.85x magical + Silence 1.5s | 24s | 2H | 0.90 | 129 | 187 | 271 | 393 | 570 |

---

## 7. WAR GLOVES — V1 LOCKED

Shared abilities:
1. Onde percutante
2. Combo fracassant

| Weapon | Faction | Signature | Effect | CD | Hand | AS | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| Ursine Maulers | Keeper | Hundred Striking Fists | 0.30x physical x6 + 0.75x magical final component | 22s | 2H | 1.30 | 98 | 142 | 207 | 300 | 435 |
| Ravenstrike Cestus | Morgana | Earth Crusher | 2.10x magical + Stun 1s, scaling from weapon physical damage | 28s | 2H | 1.00 | 106 | 154 | 223 | 323 | 468 |
| Hellfire Hands | Undead | Infernal Boulder | 0.90x physical + DoT 0.16x x4 | 20s | 2H | 1.15 | 98 | 142 | 206 | 299 | 434 |
| Battle Bracers | Heretic | Falcon Smash | 2.35x physical | 26s | 2H | 1.25 | 95 | 138 | 201 | 291 | 422 |

---

## 8. DAGGER — V1 LOCKED

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
| Bloodletter | Keeper | Lunging Stabs | 1.30x physical; +1.30x below 40% target HP | 24s | 1H | 1.45 | 81 | 118 | 171 | 247 | 359 |
| Demonfang | Morgana | Blood Ritual | 0.72x magical x3 hits, scaling from weapon physical damage | 24s | 1H | 1.25 | 90 | 130 | 188 | 273 | 396 |
| Deathgivers | Undead | Ghost Strike | 1.65x magical +0.90x if `effect_dagger_opening`, scaling from weapon physical damage | 22s | 2H | 1.35 | 84 | 122 | 177 | 257 | 372 |
| Claws | Heretic | Disembowel | 0.32x physical x4 + Stun 1.25s + DoT 0.15x x3 | 26s | 2H | 1.15 | 92 | 134 | 194 | 281 | 408 |

Dagger Pair remains the base stat reference; only its signature ability changed during this pass.

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

## 10. ARTIFACT WEAPON CRAFTING

Validated V1 recipe contract:

`artifact weapon Tn = standard refined-material recipe of the matching weapon family at Tn + 1 matching faction artifact Tn + matching faction runes Tn`

There is **no predecessor weapon requirement**.

The faction artifact quantity is fixed at **1 artifact per weapon craft** for this baseline.

| Weapon tier | Matching faction artifact | Matching faction runes |
|---|---:|---:|
| T4 | 1 | 5 |
| T5 | 1 | 10 |
| T6 | 1 | 20 |
| T7 | 1 | 35 |
| T8 | 1 | 55 |

Rules:
- refined materials are derived from the existing standard base-weapon recipe of the same family and target Tier; they are not duplicated as a second authored material table;
- artifact and Rune faction must match the artifact weapon faction;
- artifact and Rune Tier must match the crafted weapon Tier;
- artifact quantity is always exactly 1;
- Rune quantities are a V1 economy baseline and may be tuned later without changing recipe architecture;
- no Tn-1 weapon is owned, consumed or required by this craft;
- the old temporary Badon craft must not coexist as a second authoritative recipe once the generic artifact weapon recipe is available.

---

## 11. ACQUISITION AND BENCHMARK POLICY

Faction artifact weapons are intended to be obtained **after the corresponding world-zone clear** that unlocks/accesses their acquisition path.

Balance consequence:
- they are post-clear rewards, not tools required to beat the wall that grants access to them;
- benchmark interpretation is therefore more permissive than for base weapons;
- a faction artifact may clear a wall earlier or more comfortably than a base weapon and this is expected within reason;
- artifact weapons should provide a modest general power premium even outside dungeons;
- this intentional reward power does **not** authorize major progression skips, multi-tier bypasses or a weapon that invalidates later progression walls;
- faction matchup `+20%` results must be measured separately from neutral-matchup weapon power.

Benchmark priority:
1. no catastrophic progression skip;
2. healthy intra-family spread between the four artifact variants outside favorable faction matchups;
3. distinct weapon identities are preserved rather than forcing identical DPS;
4. visible but controlled advantage in the favorable dungeon matchup;
5. 1H variants must be evaluated with their legal offhand context;
6. acquisition timing remains part of leak severity assessment.

### V1 balance lock — 2026-08-23

The artifact benchmark pass is accepted as the V1 balance baseline.

Observed acceptance points:
- no catastrophic world-progression candidate was detected;
- Sword, Bow, Fire Staff and War Gloves artifact spreads are accepted for V1;
- Dagger spread was tightened before lock while preserving 1H/offhand, execute, combo and control identities;
- T8 artifact Daggers may clear up to two benchmark checkpoints beyond the base Dagger Pair; this is accepted as a post-clear reward leak, not a blocker;
- favorable dungeon ratios are behaving in the intended controlled range and remain a separate tuning axis;
- future numerical changes require either gameplay evidence or a dedicated benchmark regression, not speculative normalization.

The values in sections 4–8 are therefore **frozen V1 values**.

---

## 12. IMPLEMENTATION CONTRACT

- Artifact variants are regular weapon specializations in the authoritative weapon content catalog.
- No Keeper/Morgana/Undead/Heretic branches are allowed in the combat loop.
- Cross-type ability damage must remain data-authored: output damage type and scaling damage type are separate generic concepts.
- Temporary self buffs/debuffs use the existing effect/stat modifier pipeline.
- Additional auto-attack damage uses generic temporary auto-attack bonus-damage stats, not weapon-name checks.
- The dungeon faction bonus composes with the existing faction-cape post-mitigation resolver; resolvers must not overwrite one another.
- Artifact weapon recipes derive standard refined-material requirements from the existing family recipe and add matching artifact/Rune requirements generically.
- Presentation assets are not invented. Missing artifact presentation remains undefined until real assets are supplied.

---

## 13. DESIGN STATUS

Sword: **V1 BALANCE LOCKED**.
Bow: **V1 BALANCE LOCKED**; Badon pre-existed.
Fire Staff: **V1 BALANCE LOCKED**.
War Gloves: **V1 BALANCE LOCKED**.
Dagger artifacts: **V1 BALANCE LOCKED**.
Dagger Pair signature correction: **implemented; world wall/bridge regression benchmark pending final validation**.
Faction directed advantage: **implemented and benchmarked; dungeon progression impact remains the next dedicated validation pass**.
Artifact weapon craft baseline: **VALIDATED V1**.
Benchmark leak policy: **VALIDATED**.

Next validation order:
1. Dagger Pair world walls/bridges after Assaut croisé change;
2. artifact weapon reaction inside faction dungeon progression;
3. only then reopen numbers if a real regression appears.

---

DOCUMENT TERMINE