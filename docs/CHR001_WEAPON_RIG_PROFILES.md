# CHR-001 Weapon Rig Profiles

Status: POC contract

## Goal

Industrialize CHR-001 weapon/armor sprite production without regenerating the character body for each weapon.

CHR-001 remains the immutable character source. Weapons and equipment are layered on top of authored animation poses through reusable holding and attack profiles.

## Core rules

1. CHR-001 body proportions, head, hair, feet line and global scale never change between weapon variants.
2. A new weapon reuses an existing holding profile and attack profile by default.
3. A new profile is created only when a weapon cannot physically fit an existing interaction model.
4. Holding profile and attack profile are separate concepts.
5. Final spritesheets are deterministic composites of authored layers; they are not regenerated frame-by-frame.

## Holding profiles

- `one_hand_melee`: one primary hand, secondary hand free/offhand.
- `two_hand_blade`: two hands on a long hilt/handle, melee blade posture.
- `two_hand_heavy`: two hands with wider grip for high-mass weapons such as great hammers/greataxes.
- `one_hand_polearm`: one primary hand controls a long shaft.
- `two_hand_polearm`: two separated grips on a long shaft.
- `dual_wield`: one independent weapon per hand.
- `fist_weapon`: weapon is attached/aligned directly to the hands.
- `bow`: one hand holds the bow, one hand draws/releases the string.
- `crossbow_one_hand`: compact crossbow held primarily with one hand.
- `crossbow_two_hand`: horizontal crossbow supported by two hands.
- `staff_one_hand`: staff/sceptre controlled primarily by one hand.
- `staff_two_hand`: long staff with two grip points.
- `floating_focus`: weapon/focus is not physically gripped.
- `levitating_two_hand`: object is controlled between/in front of both hands without conventional grips.
- `transform_body`: weapon usage changes the character body/silhouette itself.

## Attack profiles

Initial reusable profiles:

- `slash_1h`
- `slash_2h`
- `heavy_swing`
- `polearm_thrust`
- `dual_slash`
- `fist_combo`
- `bow_shot`
- `crossbow_shot`
- `staff_cast`
- `floating_cast`
- `transform_attack`

## Rig anchors

Minimum anchor vocabulary:

- `hand_r`
- `hand_l`
- `grip_primary`
- `grip_secondary`
- `weapon_pivot`
- `back`
- `quiver`
- `floating_front`

Every authored animation frame may define frame-specific coordinates for these anchors.

## Current/known weapon mapping

| Weapon | Holding profile | Attack profile |
| --- | --- | --- |
| Broadsword | `one_hand_melee` | `slash_1h` |
| Claymore | `two_hand_blade` | `slash_2h` |
| Carving Sword | `two_hand_blade` | `slash_2h` |
| Dual Swords | `dual_wield` | `dual_slash` |
| Battle Axe | `one_hand_melee` | `heavy_swing` |
| Greataxe | `two_hand_heavy` | `heavy_swing` |
| Halberd Axe | `two_hand_polearm` | `heavy_swing` |
| Bear Paws | `dual_wield` | `dual_slash` |
| Spear | `one_hand_polearm` | `polearm_thrust` |
| Pike | `two_hand_polearm` | `polearm_thrust` |
| Glaive | `two_hand_polearm` | `polearm_thrust` |
| Trinity Spear | `two_hand_polearm` | `polearm_thrust` |
| Longbow | `bow` | `bow_shot` |
| Badon | `bow` | `bow_shot` |
| War Bow | `bow` | `bow_shot` |
| Whispering Bow | `bow` | `bow_shot` |
| Composite Bow | `bow` | `bow_shot` |
| Light Crossbow | `crossbow_one_hand` | `crossbow_shot` |
| Heavy Crossbow | `crossbow_two_hand` | `crossbow_shot` |
| Repeating Crossbow | `crossbow_two_hand` | `crossbow_shot` |
| Siege Crossbow | `crossbow_two_hand` | `crossbow_shot` |
| Fire Staff | `staff_one_hand` | `staff_cast` |
| Infernal Staff | `staff_two_hand` | `staff_cast` |
| Wildfire Staff | `staff_one_hand` | `staff_cast` |
| Dual Daggers | `dual_wield` | `dual_slash` |
| Spiked Gauntlets | `fist_weapon` | `fist_combo` |
| Permafrost Prism | `floating_focus` | `floating_cast` |
| Locus | `levitating_two_hand` | `staff_cast` |
| Rootbound | `transform_body` | `transform_attack` |

## POC scope

The first technical validation uses two deliberately different weapons:

### Broadsword

- holding: `one_hand_melee`
- attack: `slash_1h`
- validates one-hand melee attachment and weapon layering.

### Infernal Staff

- holding: `staff_two_hand`
- attack: `staff_cast`
- validates two-hand grips, long weapon bounds and caster posture.

POC only needs `idle` + `attack` initially. `walk` and `death` are added after the composition/anchor contract is proven.

## POC success criteria

1. Same immutable CHR-001 body source used by both weapons.
2. Identical character scale and body proportions across generated variants.
3. No hand/weapon drift between frames.
4. No weapon clipping caused by missing layer ordering rules.
5. Deterministic repeatable output from the compiler.
6. Output remains compatible with the current Phaser actor-manifest pipeline.
