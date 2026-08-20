# CHR-001 Full-Body Overlay POC

Status: test contract

## Goal

Validate a safer modular character pipeline for Albion Idle without anatomical slicing of CHR-001.

The CHR-001 pose remains a complete immutable full-body image. Equipment and weapons are authored as overlay layers aligned to the exact same frame canvas.

## Scope

POC only covers one pose:

- CHR-001 full-body `idle_00`
- Cloth Mage equipment overlay
- Infernal Staff overlay

No walk, attack or death in this test.

## Source files

All files use the exact same frame dimensions and origin.

```text
assets/character-rigs/CHR-001/poc/fullbody-overlay/
├── base/
│   └── idle_00.png
├── equipment/
│   └── cloth_mage/
│       ├── idle_00_back.png
│       └── idle_00_front.png
├── weapons/
│   └── infernal_staff/
│       ├── idle_00_back.png
│       └── idle_00_front.png
└── poc.json
```

Empty back/front layers are allowed when the visual does not require that depth split.

## Layer contract

Final render order:

```text
1. equipment_back
2. weapon_back
3. CHR-001 full-body base
4. equipment_front
5. weapon_front
```

The CHR-001 base is never cut into body parts.

## Base frame rules

`base/idle_00.png` is immutable.

It must preserve:

- head
- hair
- face
- body proportions
- posture
- feet line
- global scale
- canvas position

The base pose may not be redrawn to accommodate an equipment layer.

## Equipment overlay rules

`cloth_mage` may cover the base visually, but it must follow the existing silhouette and pose.

Allowed:

- robe, tunic, sleeves, boots, mantle, belt and decorative cloth
- back/front split only when required for occlusion

Forbidden:

- changing head or hair
- resizing limbs
- moving shoulders, hands or feet
- changing character width/height
- adding a different body pose under the equipment

## Weapon overlay rules

Infernal Staff must be authored directly for this fixed pose.

The weapon may be split into `back` and `front` layers around the character for correct occlusion.

The character pose remains unchanged to fit the staff during this POC.

## Alignment rules

Every PNG:

- same canvas dimensions
- same origin
- alpha transparent outside the authored pixels
- no automatic crop
- no per-layer scaling
- no runtime repositioning workaround

## POC data

Conceptual configuration:

```json
{
  "id": "chr001_cloth_infernal_idle00",
  "base": "base/idle_00.png",
  "layers": [
    { "id": "cloth_back", "path": "equipment/cloth_mage/idle_00_back.png", "zIndex": 10 },
    { "id": "staff_back", "path": "weapons/infernal_staff/idle_00_back.png", "zIndex": 20 },
    { "id": "base", "path": "base/idle_00.png", "zIndex": 30 },
    { "id": "cloth_front", "path": "equipment/cloth_mage/idle_00_front.png", "zIndex": 40 },
    { "id": "staff_front", "path": "weapons/infernal_staff/idle_00_front.png", "zIndex": 50 }
  ]
}
```

## Validation criteria

The POC passes only if all conditions are true:

1. CHR-001 base pixels are unchanged.
2. Head, hair, body scale and feet line are unchanged.
3. Equipment follows the pose without visible collage seams.
4. Staff occlusion is correct without modifying the body pose.
5. No layer is rescaled or nudged as a manual runtime fix.
6. Composite quality is visually indistinguishable from a traditionally authored final sprite at game scale.
7. Composite output can be packed into the current Phaser spritesheet pipeline without renderer changes.

## Fail-fast rule

If a convincing single-frame composite cannot be produced with this contract, stop the modular-overlay approach before implementing the compiler further.
