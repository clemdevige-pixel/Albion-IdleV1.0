# CHR-001 POC Asset Source Spec

Status: POC source contract
Scope: Broadsword + Infernal Staff, Idle + Attack only

## Objective

Prove that the same immutable CHR-001 body can be composited with different equipment and weapons while preserving the current in-game visual quality and the existing Phaser render-manifest pipeline.

## Master canvas

- Frame size: 512 x 512 px
- Transparent alpha background
- Same foot baseline in every frame
- Same CHR-001 head, hair, body proportions and global scale
- 6 frames per authored sequence for this POC
- Every source layer uses the exact same frame grid as its matching animation

## Source layout

```text
assets/character-rigs/CHR-001/
├── base/
│   ├── idle/
│   │   ├── body_back.png
│   │   └── body_front.png
│   ├── slash_1h/
│   │   ├── body_back.png
│   │   └── body_front.png
│   └── staff_cast/
│       ├── body_back.png
│       └── body_front.png
├── equipment/
│   ├── plate/
│   │   ├── idle_back.png
│   │   ├── idle_front.png
│   │   ├── slash_1h_back.png
│   │   └── slash_1h_front.png
│   └── cloth/
│       ├── idle_back.png
│       ├── idle_front.png
│       ├── staff_cast_back.png
│       └── staff_cast_front.png
└── weapons/
    ├── broadsword/
    │   ├── idle_back.png
    │   ├── idle_front.png
    │   ├── slash_1h_back.png
    │   └── slash_1h_front.png
    └── infernal_staff/
        ├── idle_back.png
        ├── idle_front.png
        ├── staff_cast_back.png
        └── staff_cast_front.png
```

A back/front pair is only required when pixels genuinely need to pass behind and in front of the body. If an asset is entirely on one side of the character, only that layer is authored.

## POC build targets

### Broadsword

Composition:

```text
CHR-001 slash_1h body
+ plate equipment
+ broadsword
= hero_broadsword attack sheet
```

Idle uses the same logic with the shared CHR-001 idle pose.

### Infernal Staff

Composition:

```text
CHR-001 staff_cast body
+ cloth equipment
+ infernal_staff
= hero_fire_staff attack sheet
```

Idle uses the shared CHR-001 idle pose with cloth + infernal staff.

## Layer order

Default order, low to high:

1. weapon/equipment back
2. body back
3. equipment middle when needed
4. body front
5. equipment front
6. weapon front

The compiler must use authored zIndex values; this list is the default visual convention, not hard-coded runtime behavior.

## Anchors required by the POC

### Shared idle

- `hand_r`
- `hand_l`
- `weapon_pivot`

### Broadsword / slash_1h

- `hand_r`
- `weapon_pivot`

### Infernal Staff / staff_cast

- `hand_r`
- `hand_l`
- `grip_primary`
- `grip_secondary`
- `weapon_pivot`

Anchors are frame-specific and stored as rig data, never inferred at runtime.

## What must be authored graphically

For the POC, the minimum real graphical work is:

1. CHR-001 immutable body: idle, slash_1h, staff_cast.
2. Plate overlays: idle + slash_1h.
3. Cloth overlays: idle + staff_cast.
4. Broadsword overlays: idle + slash_1h.
5. Infernal Staff overlays: idle + staff_cast.

This is intentionally smaller than authoring two complete independent characters.

## What is generated automatically

Once those sources and anchors exist, tooling generates:

- final Broadsword idle sheet
- final Broadsword attack sheet
- final Infernal Staff idle sheet
- final Infernal Staff attack sheet
- compatible actor render-manifest data/output metadata

## Acceptance criteria

- CHR-001 body pixels are identical wherever the same pose profile is reused.
- No scale, head, hair or baseline drift between variants.
- Hands remain visually connected to the weapon in all frames.
- No visible cutout/collage seams at game scale.
- Generated output remains 512 x 512 per frame and compatible with the current Phaser actor pipeline.
- Running the compiler twice from unchanged sources produces byte-identical outputs where encoding permits, otherwise pixel-identical outputs.
