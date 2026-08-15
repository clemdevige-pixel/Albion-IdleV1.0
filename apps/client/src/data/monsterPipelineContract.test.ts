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
  getEnemyCombatProfile,
} from "@game/gameplay";
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
  it("keeps monster definitions limited to identity and authored content", () => {
    for (const [monsterId, monster] of Object.entries(MONSTER_DEFINITIONS)) {
      expect(monster.id).toBe(monsterId);
      expect(["physical", "magical"]).toContain(monster.combat.damageType);
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId)).toBeDefined();

      const behavior = MONSTER_CATEGORY_BEHAVIORS[monster.category];
      expect(monster.abilityIds.length).toBeLessThanOrEqual(behavior.maxActiveAbilities);

      for (const abilityId of monster.abilityIds) {
        expect(MONSTER_ABILITIES[abilityId]).toBeDefined();
      }

      expect(() =>
        buildMonsterRuntimeAbilities(monster.category, monster.abilityIds)
      ).not.toThrow();
    }
  });

  it("keeps world zone spawn metadata aligned with the authoritative normal encounter pools", () => {
    for (const zone of ZONE_DEFINITIONS) {
      const pool = ZONE_ENCOUNTER_POOLS[String(zone.id)];
      expect(pool).toBeDefined();

      const zoneMonsterIds = zone.monsterSpawns
        .map((spawn) => String(spawn.definitionId))
        .sort();

      expect(zoneMonsterIds).toEqual([
        ...(pool?.dominant.normal ?? []),
        ...(pool?.secondary.normal ?? []),
      ].sort());
    }
  });

  it("uses zone, segment and encounter as the canonical combat and reward progression", () => {
    const earlyCombat = getEnemyCombatProfile(0, 0, 0);
    const laterCombat = getEnemyCombatProfile(0, 1, 0);

    expect(laterCombat.hp).toBeGreaterThan(earlyCombat.hp);
    expect(laterCombat.damage).toBeGreaterThan(earlyCombat.damage);
    expect(earlyCombat.attackSpeed).toBeGreaterThan(0);

    const earlyReward = getEncounterRewards(0, 0, 0);
    const laterSegment = getEncounterRewards(0, 1, 0);
    const laterZone = getEncounterRewards(1, 0, 0);

    expect(laterSegment.silver).toBeGreaterThan(earlyReward.silver);
    expect(laterSegment.fame).toBeGreaterThan(earlyReward.fame);
    expect(laterZone.silver).toBeGreaterThan(earlyReward.silver);
    expect(laterZone.fame).toBeGreaterThan(earlyReward.fame);

    for (const monster of Object.values(MONSTER_DEFINITIONS)) {
      expect(applyMonsterRewardModifiers(laterSegment, monster)).toEqual(laterSegment);
    }
  });

  it("spawns an authored boss with canonical stats and authored identity", () => {
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

    const encounterIndex = ENCOUNTERS_PER_SEGMENT - 1;

    const spawned = spawnEnemyForSegment(
      deps,
      new BiomeResolver(new BiomeRegistry()),
      {
        zoneIndex: 0,
        segmentIndex: 0,
        encounterIndex,
        zoneDefId: WORLD_ZONE_IDS.forest,
        zoneName: "Birch Forest",
      },
    );

    const monster = getMonsterDefinition(spawned.monsterDefinitionId);
    const canonicalProfile = getEnemyCombatProfile(0, 0, encounterIndex);

    expect(monster.category).toBe("elite");
    expect(spawned.maxHealth).toBe(canonicalProfile.hp);
    expect(getMonsterDefinitionIdForEntity(spawned.id)).toBe(monster.id);

    expect(
      renderManifestRegistry.getStaticActor(spawned.visualManifestId)?.id,
    ).toBe(monster.visualManifestId);

    expect(
      abilityManager.getAbilities(spawned.id).map((entry) => String(entry.abilityId)),
    ).toEqual(monster.abilityIds);

    const baseReward = getEncounterRewards(0, 0, encounterIndex);
    expect(applyMonsterRewardModifiers(baseReward, monster)).toEqual(baseReward);

    clearActiveMonsterIdentity(spawned.id);
  });
});
