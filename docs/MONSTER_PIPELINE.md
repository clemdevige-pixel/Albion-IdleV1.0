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
  -> render manifest / Phaser
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

## Standard new-monster checklist

### 1. Define the monster

Add one entry to `MONSTER_IDS` and `MONSTER_DEFINITIONS` in `monsterContentCatalog.ts`.

Choose:

- `category`: normal / veteran / elite / boss
- `combat`: multipliers applied on top of zone/segment combat scaling
- `rewards`: multipliers applied on top of zone/segment reward scaling
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

Add the monster PNG under `apps/client/public/assets/monsters/` and create a `static_actor` render manifest under:

`apps/client/src/game/render/manifests/`

Register that manifest in `defaultRenderManifestRegistry.ts` and use the manifest ID as `visualManifestId` in the monster definition.

Phaser must not receive monster-name conditions.

### 6. Validation

`monsterPipelineContract.test.ts` must stay green. It verifies that:

- every monster dependency resolves;
- ability capacity matches category rules;
- loot tables resolve;
- renderer manifests resolve;
- world zone metadata matches live encounter pools;
- progression scaling remains the reward base;
- a real authored boss can spawn with identity + abilities + rewards + renderer resolution.

Run client tests, typecheck and build before validating the monster.

## Architecture note — legacy gameplay monster modules

`packages/gameplay/src/monsters`, `monster-spawn`, `monster-ai` and `monster-integration` remain reusable engine foundations, but they are **not the authoritative lifecycle of the current playable client**.

The current live lifecycle is `CombatRuntime + combatEntityFactory + MonsterAbilityRuntime + combatRewardAdapter`.

Do not migrate to the older package lifecycle only for architectural symmetry. A future migration should happen only if it removes real limitations such as multi-enemy encounters, richer AI state or persistent spawn lifecycle.
