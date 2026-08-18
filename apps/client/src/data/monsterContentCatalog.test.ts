import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { asZoneDefinitionId } from "@game/gameplay";
import {
  MONSTER_DEFINITIONS,
  ZONE_ENCOUNTER_POOLS,
  getMonsterDefinition,
  resolveMonsterForEncounter,
} from "./monsterContentCatalog";
import {
  MONSTER_CATEGORY_BEHAVIORS,
  buildMonsterRuntimeAbilities,
  getMonsterAbilityDefinition,
} from "./monsterAbilityContentCatalog";
import { WORLD_ZONE_ORDER } from "./worldContentCatalog";

describe("monsterContentCatalog", () => {
  it("keeps every encounter-pool reference resolvable", () => {
    for (const pool of Object.values(ZONE_ENCOUNTER_POOLS)) {
      for (const monsterId of [
        ...pool.dominant.normal,
        pool.dominant.elite,
        ...pool.secondary.normal,
        pool.secondary.elite,
        pool.biomeBoss,
      ]) {
        expect(getMonsterDefinition(monsterId).id).toBe(monsterId);
      }
    }
  });

  it("keeps definition IDs coherent with identity-only combat metadata", () => {
    for (const [key, definition] of Object.entries(MONSTER_DEFINITIONS)) {
      expect(definition.id).toBe(key);
      expect(definition.visualManifestId.length).toBeGreaterThan(0);
      expect(["physical", "magical"]).toContain(definition.combat.damageType);
      expect(definition.rewards.lootTableId.length).toBeGreaterThan(0);
    }
  });

  it("keeps every authored monster ability resolvable and within category capacity", () => {
    for (const definition of Object.values(MONSTER_DEFINITIONS)) {
      expect(definition.abilityIds.length).toBeLessThanOrEqual(
        MONSTER_CATEGORY_BEHAVIORS[definition.category].maxActiveAbilities,
      );
      for (const abilityId of definition.abilityIds) {
        expect(getMonsterAbilityDefinition(abilityId).id).toBe(abilityId);
      }
      expect(() =>
        buildMonsterRuntimeAbilities(definition.category, definition.abilityIds)
      ).not.toThrow();
    }
  });

  it("applies faster authored cooldown cadence to higher monster categories", () => {
    const abilityId = Object.values(MONSTER_DEFINITIONS)
      .flatMap((definition) => definition.abilityIds)[0];

    expect(abilityId).toBeDefined();
    if (abilityId === undefined) return;

    const authored = getMonsterAbilityDefinition(abilityId);
    const bossRuntime = buildMonsterRuntimeAbilities("boss", [abilityId])[0];

    expect(bossRuntime?.cooldown).toBe(
      authored.cooldown * MONSTER_CATEGORY_BEHAVIORS.boss.cooldownMultiplier,
    );
    expect(MONSTER_CATEGORY_BEHAVIORS.boss.cooldownMultiplier).toBeLessThan(
      MONSTER_CATEGORY_BEHAVIORS.normal.cooldownMultiplier,
    );
  });

  it("selects normal encounters from the zone pool deterministically", () => {
    const zone = asZoneDefinitionId("zone_forest_t3");
    const first = resolveMonsterForEncounter(zone, 0, 0);
    const repeated = resolveMonsterForEncounter(zone, 0, 0);
    const next = resolveMonsterForEncounter(zone, 0, 1);

    expect(first.category).toBe("normal");
    expect(repeated.id).toBe(first.id);
    expect(next.category).toBe("normal");
    expect(next.id).not.toBe(first.id);
  });

  it("uses only implemented progression factions in every authored encounter", () => {
    const progressionFactions = new Set(["Undead", "Morgana", "Heretic", "Keeper"]);
    for (const pool of Object.values(ZONE_ENCOUNTER_POOLS)) {
      for (const monsterId of [
        ...pool.dominant.normal,
        pool.dominant.elite,
        ...pool.secondary.normal,
        pool.secondary.elite,
        pool.biomeBoss,
      ]) {
        expect(progressionFactions.has(getMonsterDefinition(monsterId).faction)).toBe(true);
      }
    }
  });

  it("removes legacy prototype wolf, harpy and rune golem definitions", () => {
    expect(Object.keys(MONSTER_DEFINITIONS)).not.toContain("monster_stonefang_wolf");
    expect(Object.keys(MONSTER_DEFINITIONS)).not.toContain("monster_razorwing_harpy");
    expect(Object.keys(MONSTER_DEFINITIONS)).not.toContain("boss_ancient_rune_golem");
  });

  it("selects segment and biome bosses from explicit pool slots", () => {
    const zone = asZoneDefinitionId("zone_swamp_t3");

    const segmentBoss = resolveMonsterForEncounter(
      zone,
      0,
      ENCOUNTERS_PER_SEGMENT - 1,
    );

    const biomeBoss = resolveMonsterForEncounter(
      zone,
      SEGMENTS_PER_ZONE - 1,
      ENCOUNTERS_PER_SEGMENT - 1,
    );

    expect(segmentBoss.tags).toContain("segment_boss");
    expect(biomeBoss.tags).toContain("biome_boss");
  });

  it("uses four normal encounters followed by one deterministic elite", () => {
    const zone = asZoneDefinitionId("zone_forest_t3");

    for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT - 1; encounterIndex += 1) {
      expect(resolveMonsterForEncounter(zone, 4, encounterIndex).category).toBe("normal");
    }

    const firstElite = resolveMonsterForEncounter(zone, 0, ENCOUNTERS_PER_SEGMENT - 1);
    const repeatedElite = resolveMonsterForEncounter(zone, 0, ENCOUNTERS_PER_SEGMENT - 1);
    expect(firstElite.category).toBe("elite");
    expect(repeatedElite.id).toBe(firstElite.id);
  });

  it("introduces the secondary faction progressively without replacing the dominant faction", () => {
    const zone = asZoneDefinitionId("zone_forest_t3");

    const early = resolveMonsterForEncounter(zone, 0, 0);
    const laterSecondary = resolveMonsterForEncounter(zone, 6, 0);
    const laterDominant = resolveMonsterForEncounter(zone, 7, 0);

    expect(early.faction).toBe("Keeper");
    expect(laterSecondary.faction).toBe("Heretic");
    expect(laterDominant.faction).toBe("Keeper");
  });

  it("keeps every zone/segment/encounter assignment stable", () => {
    for (const zoneId of Object.keys(ZONE_ENCOUNTER_POOLS)) {
      const zone = asZoneDefinitionId(zoneId);
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
          const first = resolveMonsterForEncounter(zone, segmentIndex, encounterIndex);
          const repeated = resolveMonsterForEncounter(zone, segmentIndex, encounterIndex);
          expect(repeated.id).toBe(first.id);
        }
      }
    }
  });

  it("reserves segment 10 encounter 5 for the zone boss", () => {
    for (const zoneId of Object.keys(ZONE_ENCOUNTER_POOLS)) {
      const boss = resolveMonsterForEncounter(
        asZoneDefinitionId(zoneId),
        SEGMENTS_PER_ZONE - 1,
        ENCOUNTERS_PER_SEGMENT - 1,
      );
      expect(boss.category).toBe("boss");
    }
  });

  it("has an explicit encounter pool for every current world zone", () => {
    expect(Object.keys(ZONE_ENCOUNTER_POOLS).sort()).toEqual(
      [...WORLD_ZONE_ORDER].map(String).sort(),
    );
  });
});
