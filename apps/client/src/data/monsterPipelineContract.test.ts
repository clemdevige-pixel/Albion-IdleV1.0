import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { ENCOUNTERS_PER_SEGMENT } from "@game/data";
import {
  AbilityManager,
  AutoAttackManager,
  BiomeRegistry,
  BiomeResolver,
  DamageManager,
  DeathManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  createDefaultStatRegistry,
  getEncounterRewards,
} from "@game/gameplay";
import { MONSTER_LOOT_TABLES } from "./economyContentCatalog";
import {
  MONSTER_ABILITIES,
  MONSTER_CATEGORY_BEHAVIORS,
  buildMonsterRuntimeAbilities,
} from "./monsterAbilityContentCatalog";
import {
  MONSTER_DEFINITIONS,
  ZONE_ENCOUNTER_POOLS,
  applyMonsterRewardModifiers,
  getMonsterDefinition,
} from "./monsterContentCatalog";
import { WORLD_ZONE_IDS, ZONE_DEFINITIONS } from "./worldContentCatalog";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";
import {
  clearActiveMonsterIdentity,
  getMonsterDefinitionIdForEntity,
} from "../runtime/activeMonsterIdentity";
import { spawnEnemyForSegment } from "../runtime/combatEntityFactory";

describe("monster pipeline global contract", () => {
  it("resolves every authored dependency from the monster definition", () => {
    for (const [monsterId, monster] of Object.entries(MONSTER_DEFINITIONS)) {
      expect(monster.id).toBe(monsterId);
      expect(monster.combat.health).toBeGreaterThan(0);
      expect(monster.combat.damage).toBeGreaterThan(0);
      expect(monster.combat.attackSpeed).toBeGreaterThan(0);
      expect(monster.rewards.silverMultiplier).toBeGreaterThan(0);
      expect(monster.rewards.fameMultiplier).toBeGreaterThan(0);
      expect(MONSTER_LOOT_TABLES[monster.rewards.lootTableId]).toBeDefined();
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId)).toBeDefined();

      const behavior = MONSTER_CATEGORY_BEHAVIORS[monster.category];
      expect(monster.abilityIds.length).toBeLessThanOrEqual(behavior.maxActiveAbilities);
      for (const abilityId of monster.abilityIds) {
        expect(MONSTER_ABILITIES[abilityId]).toBeDefined();
      }
      expect(() => buildMonsterRuntimeAbilities(monster.category, monster.abilityIds)).not.toThrow();
    }
  });

  it("keeps world zone spawn metadata aligned with the authoritative normal encounter pools", () => {
    for (const zone of ZONE_DEFINITIONS) {
      const pool = ZONE_ENCOUNTER_POOLS[String(zone.id)];
      expect(pool).toBeDefined();
      const zoneMonsterIds = zone.monsterSpawns
        .map((spawn) => String(spawn.definitionId))
        .sort();
      expect(zoneMonsterIds).toEqual([...(pool?.normal ?? [])].sort());
    }
  });

  it("keeps zone and segment progression as the reward base before monster modifiers", () => {
    const early = getEncounterRewards(0, 0, 0);
    const laterSegment = getEncounterRewards(0, 1, 0);
    const laterZone = getEncounterRewards(1, 0, 0);
    expect(laterSegment.silver).toBeGreaterThan(early.silver);
    expect(laterSegment.fame).toBeGreaterThan(early.fame);
    expect(laterZone.silver).toBeGreaterThan(early.silver);
    expect(laterZone.fame).toBeGreaterThan(early.fame);

    for (const monster of Object.values(MONSTER_DEFINITIONS)) {
      const resolved = applyMonsterRewardModifiers(laterSegment, monster);
      expect(resolved.silver).toBeGreaterThanOrEqual(0);
      expect(resolved.fame).toBeGreaterThanOrEqual(0);
    }
  });

  it("spawns an authored boss with identity, abilities, rewards and renderer all resolvable", () => {
    const world = new World(createRuntimeServices());
    const statsManager = new StatsManager(world, createDefaultStatRegistry());
    const damageManager = new DamageManager(world, statsManager);
    const deathManager = new DeathManager(world, damageManager);
    const targetManager = new TargetManager(world, new TargetValidator(world));
    const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
    const abilityManager = new AbilityManager(world, statsManager);
    const deps = {
      world,
      statsManager,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
    };

    const spawned = spawnEnemyForSegment(
      deps,
      new BiomeResolver(new BiomeRegistry()),
      {
        zoneIndex: 0,
        segmentIndex: 0,
        encounterIndex: ENCOUNTERS_PER_SEGMENT - 1,
        zoneDefId: WORLD_ZONE_IDS.forest,
        zoneName: "Birch Forest",
      },
    );
    const monster = getMonsterDefinition(spawned.monsterDefinitionId);

    expect(monster.category).toBe("boss");
    expect(getMonsterDefinitionIdForEntity(spawned.id)).toBe(monster.id);
    expect(renderManifestRegistry.getStaticActor(spawned.visualManifestId)?.id).toBe(monster.visualManifestId);
    expect(abilityManager.getAbilities(spawned.id).map((entry) => String(entry.abilityId))).toEqual(monster.abilityIds);
    expect(MONSTER_LOOT_TABLES[monster.rewards.lootTableId]).toBeDefined();

    const baseReward = getEncounterRewards(0, 0, ENCOUNTERS_PER_SEGMENT - 1);
    const finalReward = applyMonsterRewardModifiers(baseReward, monster);
    expect(finalReward.silver).toBeGreaterThanOrEqual(baseReward.silver);
    expect(finalReward.fame).toBeGreaterThanOrEqual(baseReward.fame);

    clearActiveMonsterIdentity(spawned.id);
  });
});
