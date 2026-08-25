# Albion Idle — Monster Pipeline

## Goal

Adding a monster must be content-driven. Runtime systems must not branch on monster names or IDs.

Authoritative flow:

```text
monsterContentCatalog
  -> zone encounter pool
  -> combatEntityFactory
  -> CombatRuntime / MonsterAbilityRuntime
  -> death event
  -> progression reward x monster modifier
  -> monster loot table
  -> visualManifestId
  -> render manifest / EnemyVfxPresentationCatalog
  -> Phaser
```

## Source of authority

`apps/client/src/data/monsterContentCatalog.ts` owns the live monster definition:

- id / name / faction / category / tier
- visualManifestId
- combat modifiers
- reward modifiers + lootTableId
- ordered abilityIds
- tags

`apps/client/src/data/monsterAbilityContentCatalog.ts` owns reusable monster abilities and category behavior profiles.

`apps/client/src/data/economyContentCatalog.ts` owns monster loot tables.

`ZONE_ENCOUNTER_POOLS` in `monsterContentCatalog.ts` owns which monsters can appear in each live zone, including segment boss and biome boss.

`worldContentCatalog.ts` derives its normal monster spawn metadata from those encounter pools and must not author a second bestiary list.

`apps/client/src/game/render/EnemyVfxPresentationCatalog.ts` owns the presentation-only mapping from monster visual manifest IDs to enemy attack VFX styles. Combat and presentation controllers must never infer VFX from monster names or ID substrings.

## Why monsterContentCatalog currently stays in the client

The live monster catalog is intentionally client-owned for the current architecture. Its consumers are all part of the playable client runtime: combat entity creation, rewards, projected rates, world presentation models, research and bestiary bootstrap.

Do not migrate this catalog to `@game/data` only for package symmetry. Such a move is justified only when a real non-client consumer appears (for example an authoritative server/shared simulation) or when the migration removes an actual runtime limitation.

`visualManifestId` currently remains on the live monster definition because `combatEntityFactory` returns the complete spawned-enemy identity consumed by the Bridge. Moving that field today would either introduce a runtime -> render dependency or duplicate monster-to-visual mapping in another client catalog. Revisit this boundary only if the runtime/presentation ownership model changes.

## Standard new-monster checklist

### 1. Define the monster

Add one entry to `MONSTER_IDS` and `MONSTER_DEFINITIONS` in `monsterContentCatalog.ts`.

Choose:

- `category`: normal / veteran / elite / boss
- `combat`: modifiers applied on top of zone/segment combat scaling
- `rewards`: modifiers applied on top of zone/segment reward scaling
- `lootTableId`
- `abilityIds`
- `visualManifestId`

Never replace zone/segment scaling with fixed monster stats or fixed rewards.

### 2. Put it in an encounter pool

Add the monster ID to the intended `ZONE_ENCOUNTER_POOLS` entry.

- normal encounters -> `normal`
- segment boss -> `segmentBoss`
- biome boss -> `biomeBoss`

No change to `CombatRuntime` is required.

### 3. Add abilities only when needed

If the monster needs an active ability, add it to `monsterAbilityContentCatalog.ts` and reference its ID from the monster definition.

The category profile controls maximum active ability count and cooldown cadence.

No monster-name condition is allowed in `MonsterAbilityRuntime` or `CombatRuntime`.

### 4. Add / select loot table

Add a table to `MONSTER_LOOT_TABLES` in `economyContentCatalog.ts`, then reference it through `lootTableId`.

Silver and Fame are still calculated from progression first:

```text
final reward = zone/segment/encounter reward x monster multiplier
```

### 5. Add the visual

Add the monster asset under `apps/client/public/assets/monsters/` and create a `static_actor` render manifest under:

`apps/client/src/game/render/manifests/`

Register that manifest in `defaultRenderManifestRegistry.ts` and use the manifest ID as `visualManifestId` in the monster definition.

For every `static_actor`, **the authored display height is authoritative**. `PhaserStaticActorRenderer` derives display width automatically from the native texture dimensions through `resolveAspectPreservingDisplaySize`. This prevents sprites from ever being stretched or squashed by a bad manifest width.

Authoring rule:

```text
native asset ratio -> choose target height -> renderer derives width automatically
```

Do not compensate for proportions by editing the source image. Use manifest height for scale and manifest offset/origin for placement.

Phaser must not receive monster-name conditions.

### 6. Author the attack VFX

Add the monster's `visualManifestId` to `EnemyVfxPresentationCatalog.ts` with an explicit `EnemyVfxStyle`.

The catalog is presentation-only. Do not add monster-name or manifest-substring branching to `CombatPresentationController` or `VfxSystem`.

`EnemyVfxPresentationCatalog.test.ts` requires exact coverage of the current monster definitions, so a newly authored monster without a VFX mapping must fail validation.

### 7. Validation

`monsterPipelineContract.test.ts` must stay green. It verifies that:

- every monster dependency resolves;
- ability capacity matches category rules;
- loot tables resolve;
- renderer manifests resolve;
- world zone metadata matches live encounter pools;
- progression scaling remains the reward base;
- a real authored boss can spawn with identity + abilities + rewards + renderer resolution.

`contentEngineBoundary.contract.test.ts` additionally prevents concrete weapon/monster content IDs from leaking into GameScene and core presentation systems.

`EnemyVfxPresentationCatalog.test.ts` locks exact VFX coverage for all current monster visual manifests.

`aspectRatio.test.ts` locks the static-actor sizing rule so future renderer changes cannot silently reintroduce sprite deformation.

Run client tests, typecheck and build before validating the monster.

## Architecture note — legacy gameplay monster modules

`packages/gameplay/src/monsters`, `monster-spawn`, `monster-ai` and `monster-integration` remain reusable engine foundations, but they are **not the authoritative lifecycle of the current playable client**.

The current live lifecycle is `CombatRuntime + combatEntityFactory + MonsterAbilityRuntime + combatRewardAdapter`.

Do not migrate to the older package lifecycle only for architectural symmetry. A future migration should happen only if it removes real limitations such as multi-enemy encounters, richer AI state or persistent spawn lifecycle.
