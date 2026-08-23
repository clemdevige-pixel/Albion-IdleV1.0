# 44C — FACTION ARTIFACT WEAPON ROSTER

Status: VALIDATED DESIGN BASELINE
Authority: canonical roster for faction artifact weapon variants
Last update: 2026-08-23

---

## 1. PURPOSE

This document defines the canonical Albion Idle roster of faction artifact weapon variants.

It is the design baseline for the future signature-ability design of each artifact weapon.

The roster intentionally adapts Albion Online weapon families to Albion Idle rather than reproducing Albion Online faction attribution one-to-one.

---

## 2. CANONICAL RULES

- Albion Idle currently uses five weapon families in this scope: Sword, Bow, Fire Staff, War Gloves and Dagger.
- Each family keeps its existing Albion Idle base weapon.
- Each family receives exactly four faction artifact variants: Keeper, Morgana, Undead and Heretic.
- A weapon already used as the Albion Idle base weapon cannot also be used as an artifact variant in that family.
- Avalonian weapons are completely excluded from this roster.
- When Albion Online does not provide a suitable historical faction-artifact weapon for a slot, a non-Avalonian weapon from the same Albion Online family may be reassigned to the missing Albion Idle faction slot.
- Faction attribution in this document is therefore an Albion Idle gameplay/content attribution, not necessarily the original Albion Online attribution.
- No new weapon name is invented for this roster.
- Every faction artifact weapon carries its faction affinity and receives the canonical dungeon faction-advantage bonus defined in section 5.

---

## 3. CANONICAL ROSTER

| Albion Idle family | Base weapon | Keeper artifact | Morgana artifact | Undead artifact | Heretic artifact |
|---|---|---|---|---|---|
| Sword | Broadsword | Clarent Blade | Carving Sword | Galatine Pair | Claymore |
| Bow | Longbow | Bow of Badon | Wailing Bow | Whispering Bow | Warbow |
| Fire Staff | Infernal Staff | Wildfire Staff | Blazing Staff | Brimstone Staff | Great Fire Staff |
| War Gloves | Spiked Gauntlets | Ursine Maulers | Ravenstrike Cestus | Hellfire Hands | Battle Bracers |
| Dagger | Dagger Pair | Bloodletter | Demonfang | Deathgivers | Claws |

Total artifact weapon variants in this baseline: **20**.

---

## 4. FAMILY BREAKDOWN

### Sword

Base:
- Broadsword

Faction artifacts:
- Keeper: Clarent Blade
- Morgana: Carving Sword
- Undead: Galatine Pair
- Heretic: Claymore

#### Shared Sword abilities

All Sword specializations keep the two existing shared family abilities:

1. Frappe héroïque
2. Brise-garde

Only the third active ability is specialization-specific.

#### Sword artifact signature abilities

| Weapon | Faction | Signature ability | Effect | Cooldown |
|---|---|---|---|---:|
| Clarent Blade | Keeper | Crescent Slash | 2.00x physical damage | 24 s |
| Carving Sword | Morgana | Fearless Strike | 1.45x physical damage + -20 Armor for 6 s | 28 s |
| Galatine Pair | Undead | Soulless Stream | 2.60x physical damage | 30 s |
| Claymore | Heretic | Charge | 1.65x physical damage + Stun for 1 s | 25 s |

Carving Sword rule:
- Fearless Strike's `-20 Armor / 6 s` debuff is independent from Brise-garde's existing `-12 Armor / 5 s` debuff.
- Both may coexist and therefore produce a raw combined `-32 Armor` while their durations overlap.
- Neither effect refreshes, replaces or merges the other.

#### Sword artifact handling / attack speed

| Weapon | Handling | Attack speed |
|---|---|---:|
| Clarent Blade | 1H | 1.25 |
| Carving Sword | 2H | 1.10 |
| Galatine Pair | 2H | 0.95 |
| Claymore | 2H | 1.10 |

Attack speeds are intentionally authored in 0.05 increments.

#### Sword artifact flat physical damage — T4 to T8

The live weapon model has no hidden 1H/2H multiplier. Flat damage and attack speed are authored explicitly per weapon.

| Weapon | T4 | T5 | T6 | T7 | T8 |
|---|---:|---:|---:|---:|---:|
| Clarent Blade | 89 | 129 | 187 | 271 | 393 |
| Carving Sword | 102 | 148 | 215 | 312 | 452 |
| Galatine Pair | 118 | 171 | 248 | 360 | 522 |
| Claymore | 102 | 148 | 215 | 312 | 452 |

Approximate raw T4 auto-attack DPS anchors:
- Clarent Blade: `89 x 1.25 = 111.25`
- Carving Sword: `102 x 1.10 = 112.20`
- Galatine Pair: `118 x 0.95 = 112.10`
- Claymore: `102 x 1.10 = 112.20`

These values are initial validated design targets. Runtime benchmarking remains authoritative before implementation values are considered final balance locks.

### Bow

Base:
- Longbow

Faction artifacts:
- Keeper: Bow of Badon
- Morgana: Wailing Bow
- Undead: Whispering Bow
- Heretic: Warbow

#### Shared Bow abilities

All Bow specializations keep the two existing shared family abilities:

1. Tir ajusté
2. Flèche perforante

Only the third active ability is specialization-specific.

#### Bow artifact signature abilities

| Weapon | Faction | Signature ability | Effect | Cooldown |
|---|---|---|---|---:|
| Bow of Badon | Keeper | Tempête déchaînée | 1.35x physical damage + Stun for 1.25 s | 28 s |
| Wailing Bow | Morgana | Demon Arrow | 2.20x physical damage | 26 s |
| Whispering Bow | Undead | Undead Arrows | For 6 s: +20% attack speed, +0.35x magical bonus damage on each auto-attack, +15% damage received | 22 s |
| Warbow | Heretic | Magic Arrow | 2.00x magical damage | 20 s |

Whispering Bow rule:
- the `+0.35x` component is a separate additional damage instance on each auto-attack;
- it is not a multiplier applied to the base auto-attack damage;
- the +15% damage received penalty applies for the same 6 s duration.

#### Bow artifact handling / attack speed

All four Bow artifact variants are 2H.

| Weapon | Attack speed |
|---|---:|
| Bow of Badon | 1.00 |
| Wailing Bow | 0.95 |
| Whispering Bow | 1.15 |
| Warbow | 1.10 |

#### Bow artifact flat physical damage — T4 to T8

| Weapon | T4 | T5 | T6 | T7 | T8 |
|---|---:|---:|---:|---:|---:|
| Bow of Badon | 121.8 | 177 | 257 | 373 | 541 |
| Wailing Bow | 116 | 168 | 244 | 354 | 513 |
| Whispering Bow | 94 | 136 | 197 | 286 | 415 |
| Warbow | 100 | 145 | 210 | 305 | 442 |

Approximate raw T4 auto-attack DPS anchors before signature ability effects:
- Bow of Badon: `121.8 x 1.00 = 121.8`
- Wailing Bow: `116 x 0.95 = 110.2`
- Whispering Bow: `94 x 1.15 = 108.1`
- Warbow: `100 x 1.10 = 110.0`

Badon intentionally keeps the highest raw AA anchor because its signature ability is utility-heavy. Whispering and Warbow are held lower because their signature abilities add strong sustained/frequent damage.

### Fire Staff

Base:
- Infernal Staff

Faction artifacts:
- Keeper: Wildfire Staff
- Morgana: Blazing Staff
- Undead: Brimstone Staff
- Heretic: Great Fire Staff

#### Shared Fire Staff abilities

All Fire Staff specializations keep the two existing shared family abilities:

1. Boule de feu
2. Explosion infernale

Only the third active ability is specialization-specific.

#### Fire Staff artifact signature abilities

| Weapon | Faction | Signature ability | Effect | Cooldown |
|---|---|---|---|---:|
| Wildfire Staff | Keeper | Magma Sphere | 1.30x magical damage + DoT 0.20x x4 | 24 s |
| Blazing Staff | Morgana | Flame Tornado | 0.75x magical damage x3 hits | 27 s |
| Brimstone Staff | Undead | Meteor | 2.75x magical damage | 30 s |
| Great Fire Staff | Heretic | Pyroblast | 1.85x magical damage + Silence for 1.5 s | 24 s |

#### Fire Staff artifact handling / attack speed

All four Fire Staff artifact variants are 2H.

| Weapon | Attack speed |
|---|---:|
| Wildfire Staff | 0.95 |
| Blazing Staff | 1.00 |
| Brimstone Staff | 0.80 |
| Great Fire Staff | 0.90 |

#### Fire Staff artifact flat magical damage — T4 to T8

| Weapon | T4 | T5 | T6 | T7 | T8 |
|---|---:|---:|---:|---:|---:|
| Wildfire Staff | 118 | 171 | 248 | 360 | 522 |
| Blazing Staff | 111 | 161 | 233 | 338 | 490 |
| Brimstone Staff | 140 | 203 | 294 | 426 | 618 |
| Great Fire Staff | 124 | 180 | 261 | 378 | 548 |

Approximate raw T4 auto-attack DPS anchors before signature ability effects:
- Wildfire Staff: `118 x 0.95 = 112.1`
- Blazing Staff: `111 x 1.00 = 111.0`
- Brimstone Staff: `140 x 0.80 = 112.0`
- Great Fire Staff: `124 x 0.90 = 111.6`

Infernal Staff remains the live family reference at `126 x 0.90 = 113.4` raw T4 AA DPS. Artifact variants intentionally stay in the same baseline corridor before signature-ability and faction-advantage effects.

### War Gloves

Base:
- Spiked Gauntlets

Faction artifacts:
- Keeper: Ursine Maulers
- Morgana: Ravenstrike Cestus
- Undead: Hellfire Hands
- Heretic: Battle Bracers

### Dagger

Base:
- Dagger Pair

Faction artifacts:
- Keeper: Bloodletter
- Morgana: Demonfang
- Undead: Deathgivers
- Heretic: Claws

---

## 5. DUNGEON FACTION ADVANTAGE

Faction artifact weapons receive a dungeon-only damage bonus against their designated adverse faction.

Canonical bonus:
- `+20% damage dealt` against the adverse faction;
- applies to all damage dealt by the equipped artifact weapon loadout while fighting enemies of that faction in faction Dungeons;
- no bonus against the weapon's own faction or either neutral/non-adverse faction;
- no penalty is applied when fighting the weapon's own faction;
- base/non-artifact weapons do not receive this bonus.

Canonical directed advantage loop:

`Keeper -> Morgana -> Undead -> Heretic -> Keeper`

There are no symmetric rivalries. Each artifact faction has exactly one faction it counters and exactly one faction that counters it.

### Advantage matrix

Rows = equipped artifact weapon faction. Columns = enemy Dungeon faction.

| Artifact faction | Keeper enemies | Morgana enemies | Undead enemies | Heretic enemies |
|---|---:|---:|---:|---:|
| Keeper | +0% | **+20%** | +0% | +0% |
| Morgana | +0% | +0% | **+20%** | +0% |
| Undead | +0% | +0% | +0% | **+20%** |
| Heretic | **+20%** | +0% | +0% | +0% |

This matrix is global to artifact weapons and must be authored as faction relationship data, not duplicated per weapon definition.

Weapon definitions only need to declare their artifact faction affinity. Dungeon combat then resolves the faction-advantage modifier from the shared matrix.

---

## 6. EXPLICIT EXCLUSION — AVALONIAN WEAPONS

Avalonian weapons are outside this artifact roster and must not be used as substitutes for missing faction slots.

This rule includes, among others, the Avalon weapon variants that could otherwise belong to these five families.

The exclusion is categorical for this roster; future Avalon content, if ever designed, must be handled as a separate content family/system decision rather than folded into Keeper / Morgana / Undead / Heretic artifact slots.

---

## 7. DESIGN STATUS

Sword family:
- artifact roster: VALIDATED;
- shared abilities: existing / retained;
- artifact signature abilities: VALIDATED DESIGN;
- handling / attack speed: VALIDATED DESIGN;
- T4-T8 flat damage curves: VALIDATED DESIGN TARGETS;
- runtime implementation / benchmark: pending.

Bow family:
- artifact roster: VALIDATED;
- shared abilities: existing / retained;
- Badon: existing implementation retained;
- Wailing / Whispering / Warbow signature abilities: VALIDATED DESIGN;
- handling / attack speed: VALIDATED DESIGN;
- T4-T8 flat damage curves: VALIDATED DESIGN TARGETS;
- runtime implementation / benchmark: pending.

Fire Staff family:
- artifact roster: VALIDATED;
- shared abilities: existing / retained;
- artifact signature abilities: VALIDATED DESIGN;
- handling / attack speed: VALIDATED DESIGN;
- T4-T8 flat damage curves: VALIDATED DESIGN TARGETS;
- runtime implementation / benchmark: pending.

Faction advantage:
- +20% dungeon damage bonus: VALIDATED DESIGN;
- directed loop: Keeper -> Morgana -> Undead -> Heretic -> Keeper;
- implementation must be shared/data-driven, not weapon-specific.

War Gloves and Dagger artifact abilities/stats remain to be designed.

---

DOCUMENT TERMINE
