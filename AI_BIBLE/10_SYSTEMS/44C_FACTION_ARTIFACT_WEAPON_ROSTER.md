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

The artifact Sword curves below preserve the current live weapon AA-DPS corridor at T4, then follow approximately the existing ~1.45 damage growth per tier.

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

### Fire Staff

Base:
- Infernal Staff

Faction artifacts:
- Keeper: Wildfire Staff
- Morgana: Blazing Staff
- Undead: Brimstone Staff
- Heretic: Great Fire Staff

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

## 5. EXPLICIT EXCLUSION — AVALONIAN WEAPONS

Avalonian weapons are outside this artifact roster and must not be used as substitutes for missing faction slots.

This rule includes, among others, the Avalon weapon variants that could otherwise belong to these five families.

The exclusion is categorical for this roster; future Avalon content, if ever designed, must be handled as a separate content family/system decision rather than folded into Keeper / Morgana / Undead / Heretic artifact slots.

---

## 6. DESIGN STATUS

Sword family:
- artifact roster: VALIDATED;
- shared abilities: existing / retained;
- artifact signature abilities: VALIDATED DESIGN;
- handling / attack speed: VALIDATED DESIGN;
- T4-T8 flat damage curves: VALIDATED DESIGN TARGETS;
- runtime implementation / benchmark: pending.

Bow, Fire Staff, War Gloves and Dagger artifact abilities/stats remain to be designed.

---

DOCUMENT TERMINE
