# 32B. HERO WEAPON SPRITESHEET INTEGRATION WORKFLOW

This document is the authoritative workflow for integrating new specialization weapon spritesheets for the Albion Idle hero.

It applies to weapon-specific combat presentation in Phaser and to the matching preview in the Character module.

The goal is one repeatable, data-driven workflow. Do not create per-weapon renderer hacks or parallel animation systems.

---

# 1. Canonical Contract

For each weapon specialization, the canonical combat asset contract is:

```text
ONE authored attack spritesheet
↓
pixel-perfect frame isolation
↓
normalized 6 x 512x640 runtime sheet
↓
HeroRenderCatalog manifest
├─ idle = one fixed authored frame from that attack sheet
├─ attack = full authored attack sequence
├─ walk = shared archetype walk sheet
└─ death = shared archetype death sheet
```

Do not create a separate idle spritesheet when the specialization contract declares a fixed attack frame as idle.

The chosen idle frame is authored per weapon. It may be the first or last frame. Do not assume frame 0 for every future weapon.

---

# 2. Source Asset Rule

Always start from the clean, visually validated source supplied for that weapon.

Never use:

- an already corrupted derivative
- a previously resized derivative when the clean source exists
- a screenshot with flattened transparency as the canonical source
- an old repo asset merely because its filename looks relevant

Before any integration, visually validate the exact source with the developer when there is doubt.

Do not repair source artwork through runtime code.

---

# 3. Pixel-Perfect Frame Isolation

Frames must be isolated from the real transparent pixel content, not from guessed equal-width source columns when authored poses overlap horizontally.

The validated Dagger Pair integration demonstrated why: two neighboring poses may occupy overlapping X ranges even though their alpha components are separate.

Preferred rule:

- identify each character pose by its connected visible-alpha component
- preserve only pixels belonging to that pose
- discard unrelated neighboring components from the frame crop
- do not recolor
- do not rewrite alpha values
- do not distort or stretch

If connected-component separation is not sufficient for a future source, perform explicit pixel-perfect isolation. Do not accept two poses touching or leaking into one frame.

---

# 4. Normalized Runtime Cell Contract

Current canonical hero weapon attack sheet layout:

```text
frameWidth  = 512 px
frameHeight = 640 px
frameCount  = 6
sheetWidth  = 3072 px
sheetHeight = 640 px
```

Each isolated pose is placed into its own transparent 512x640 cell.

Canonical foot baseline:

```text
feet margin = 64 px
feet Y      = 575 in a 640 px cell
```

The source pixels are preserved 1:1 during sheet layout whenever possible. Runtime scaling is owned by the render manifest, not by destructive repeated image resizing.

Do not normalize by total source canvas dimensions. Normalize from the measured visible character reference height.

---

# 5. In-Game Height Contract

The canonical rendered hero target is:

```text
130 px from head to feet in the logical Phaser viewport
```

The authoritative constant is:

```text
HERO_TARGET_HEIGHT_PX = 130
```

in:

```text
apps/client/src/game/render/HeroVisualArchetypeCatalog.ts
```

For each new specialization sheet, measure the standing/reference character height in source pixels and declare that value in the render catalog.

Use the existing helpers:

```text
buildNormalizedHeroDisplay(...)
buildNormalizedHeroOffset(...)
```

Do not introduce a second scale formula.

Do not use Longbow, Badon or another legacy weapon as the size authority. The validated shared Walk/Death presentation and `HERO_TARGET_HEIGHT_PX` are the reference.

---

# 6. Hero Render Manifest Contract

Weapon-specific presentation belongs in:

```text
apps/client/src/game/render/HeroRenderCatalog.ts
```

A specialization using one attack sheet for idle + attack must point both states to the same `textureKey` and `assetPath`.

Example shape:

```text
idle:
  textureKey = specialization attack texture
  assetPath  = specialization attack sheet
  startFrame = chosen idle frame
  endFrame   = chosen idle frame

attack:
  textureKey = same specialization attack texture
  assetPath  = same specialization attack sheet
  startFrame = first authored attack frame
  endFrame   = last authored attack frame
```

A single-frame animation is a static pose. The renderer already supports this contract. Do not create a fake one-frame looping animation workaround.

---

# 7. Shared Walk / Death Contract

Walk and death are not specialization-specific weapon sheets.

They are resolved by weapon family through:

```text
HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY
```

and the shared archetype sheets in:

```text
HeroVisualArchetypeCatalog.ts
```

Current archetypes are:

```text
plate
leather
cloth
```

For example, dagger uses the leather archetype.

Do not create another Walk or Death sheet for a specialization unless the project contract explicitly changes.

---

# 8. Simulated Idle Motion

A fixed visual idle frame is given life by the existing generic actor ambient motion.

The canonical system is:

```text
apps/client/src/game/render/systems/ActorSystem.ts
```

It is shared by heroes and monsters.

Weapon manifests provide only the ambient-motion data:

```text
distance
durationMs
delayMs (optional)
```

Do not implement a second hero-only idle tween system.

World travel temporarily suspends the player's ambient motion and must resume it when travel finishes. The travel flow must use `ActorSystem` ownership rather than leaving a killed tween recorded as active.

If idle movement disappears after travel, audit suspend/resume ownership before changing the asset or manifest.

---

# 9. Character Module Preview Contract

The Character module must show only the selected idle frame, never the whole spritesheet compressed into the preview.

Presentation is resolved through:

```text
apps/client/src/ui/character/characterPresentation.ts
```

Important rule for shared idle/attack sheets:

- `idle.startFrame === idle.endFrame` describes the selected idle frame
- it does NOT mean the physical PNG contains only one frame
- when idle and attack share the same asset, preview framing must derive the physical sheet frame count from the shared attack sheet

Do not hardcode Dagger Pair or any weapon ID inside `CharacterModule.tsx` or CSS to fix preview framing.

Keep the React component generic.

---

# 10. Asset Integrity Tests

Every newly integrated specialization sheet must have a physical asset regression test.

At minimum validate:

- expected sheet width
- expected sheet height
- expected frame count
- meaningful visible pixels in every frame
- meaningful opaque pixels in every frame
- healthy max/average alpha
- no empty authored frame
- expected bottom baseline bounds

Tests must point to the current runtime asset, not a superseded version.

The Dagger Pair incident showed that a PNG can load successfully in Phaser while still being visually unusable. Asset tests must therefore validate real pixel content, not only manifest metadata.

Do not weaken the test to make a malformed asset pass. Fix the source or normalized asset.

---

# 11. Render Contract Tests

Each specialization integration must also validate the manifest contract.

At minimum verify:

- all intended item tiers route to the canonical actor manifest
- idle and attack use the intended texture/path
- idle uses the intended single frame
- attack covers the intended sequence
- frame width/height match the physical normalized sheet
- shared walk resolves to the expected archetype
- shared death resolves to the expected archetype
- normalized display reaches `HERO_TARGET_HEIGHT_PX`
- idle and attack share display/offset when they share the same sheet

Do not leave tests pinned to obsolete filenames or obsolete frame dimensions after replacing an asset.

---

# 12. Runtime Validation Order

When a sprite is missing, do not immediately change Phaser code.

Validate in this order:

1. item -> actor manifest routing
2. texture key and asset path
3. physical PNG dimensions
4. physical frame content / alpha
5. frame width and frame height
6. idle/attack frame range
7. display size and offset
8. sprite/container visible + alpha + render flags
9. travel/ambient-motion ownership
10. only then investigate renderer behavior

Use a known-good A/B render probe only as a temporary diagnostic when needed, and remove it once the cause is isolated.

Never leave debug probes or console diagnostics in the final integration.

---

# 13. Required Manual Validation

Before declaring a specialization integrated, verify all of the following in game:

- idle pose displays in combat scene
- idle ambient motion is visible
- ambient motion resumes after world travel
- walk uses the correct shared archetype
- attack plays every intended frame in order
- character remains approximately 130 px head-to-feet
- feet remain on the expected ground baseline
- death uses the correct shared archetype
- Character module shows one correct idle pose, not the full sheet
- no clipping or neighboring-frame contamination is visible

A green CI is necessary but not sufficient for visual acceptance.

---

# 14. Local Integration Workflow

For each new specialization asset:

```text
1. Start from the developer-validated clean source.
2. Isolate all authored attack poses pixel-perfect.
3. Normalize to 6 x 512x640 cells with the 64 px foot baseline margin.
4. Measure the standing/reference source character height.
5. Deposit the normalized PNG under apps/client/public/assets/characters/.
6. Add/update the specialization definition in HeroRenderCatalog.ts.
7. Select the explicit idle frame (first or last as authored).
8. Reuse shared Walk/Death by weapon family.
9. Update Character preview presentation if the physical-sheet contract requires it.
10. Add/update physical asset + render contract tests.
11. Run validation.
12. Manually verify combat idle/walk/attack/death + Character module.
13. Remove obsolete asset references and temporary diagnostics.
```

Minimum Windows validation from repository root:

```powershell
pnpm.cmd lint; pnpm.cmd typecheck; pnpm.cmd test; pnpm.cmd build; pnpm.cmd validate:assets
```

Also run the standard project validation required by `AGENTS.md` when the change affects architecture/data contracts.

---

# 15. Agent Rules

Any future agent integrating a hero weapon spritesheet must:

- read `AGENTS.md` first
- read this document before modifying the render pipeline
- preserve the existing `HeroRenderCatalog` / `HeroVisualArchetypeCatalog` architecture
- use `HERO_TARGET_HEIGHT_PX` as the rendered-size authority
- reuse shared Walk/Death archetypes
- reuse `ActorSystem` for simulated idle motion
- never create a separate idle sheet when a fixed attack frame is the approved idle source
- never add a weapon-specific React/CSS rendering hack
- never invent a second scale/baseline system
- never silently process a visually unvalidated or corrupted source
- keep physical asset tests aligned with the active runtime PNG
- remove superseded references and diagnostics after validation

If a binary PNG exists only on the developer's machine, the agent must say so explicitly. It must not claim that the asset itself has been pushed until Git confirms it.

---

# 16. Validated Reference Integration

The first validated implementation of this workflow is Dagger Pair.

Its important lessons are part of the contract, not Dagger-specific exceptions:

- clean source required
- overlapping authored X ranges require pixel-perfect component isolation
- 512x640 normalized cells
- 64 px foot baseline margin
- 130 px rendered target
- one attack sheet reused for idle + attack
- static idle frame
- leather shared Walk/Death
- generic ActorSystem ambient motion
- Character preview must understand the physical shared sheet
- physical PNG alpha/content must be tested

Do not copy Dagger Pair constants such as its measured source character height into another weapon. Measure each new source.

---

# 17. Summary

```text
Validated clean source
↓
Pixel-perfect pose isolation
↓
6 x 512x640 normalized sheet, feet at y=575
↓
Measure source standing height
↓
Manifest scales to HERO_TARGET_HEIGHT_PX = 130
↓
Idle = explicit fixed frame
Attack = full attack sheet
Walk/Death = shared archetype
↓
ActorSystem ambient idle
↓
Character preview uses correct physical frame layout
↓
Asset tests + manifest tests + CI
↓
Manual combat/Character validation
```

This is the mandatory hero weapon spritesheet integration workflow for Albion Idle.
