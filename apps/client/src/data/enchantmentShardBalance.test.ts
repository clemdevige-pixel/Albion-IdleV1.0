import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { getEnemyCombatProfile } from "@game/gameplay";
import {
  getEnchantmentShardExpectedDrop,
} from "./economyContentCatalog";
import {
  CLIENT_ABILITIES,
  WEAPON_ITEM_DEFINITIONS,
  resolvePrimaryAbilityId,
} from "./weaponContentCatalog";
import { getWeaponAttackSpeed } from "./itemPower";

interface ProjectedShardRates {
  readonly killsPerHour: number;
  readonly shardsPerHour: number;
}

const T4_WEAPON_IDS = Object.keys(WEAPON_ITEM_DEFINITIONS)
  .filter((itemId) => itemId.includes("_t4_"));

function projectT4ShardRates(
  itemId: string,
  zoneIndex: number,
  segmentIndex: number,
): ProjectedShardRates {
  const definition = WEAPON_ITEM_DEFINITIONS[itemId];
  if (definition === undefined) throw new Error(`Missing weapon: ${itemId}`);

  const physicalDamage = definition.stats?.stat_physical_damage ?? 0;
  const magicalDamage = definition.stats?.stat_magical_damage ?? 0;
  const magical = magicalDamage > physicalDamage;
  const weaponPower = magical ? magicalDamage : physicalDamage;
  const attackSpeed = getWeaponAttackSpeed(itemId) ?? 1;
  const primaryAbilityId = resolvePrimaryAbilityId(itemId);
  const primaryAbility = primaryAbilityId === undefined
    ? undefined
    : CLIENT_ABILITIES[primaryAbilityId];
  const baselineHp = getEnemyCombatProfile(0, 0, 0, "blue").hp;

  let secondsPerSegment = 0;
  let expectedShardsPerSegment = 0;

  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    const enemy = getEnemyCombatProfile(
      zoneIndex,
      segmentIndex,
      encounterIndex,
      "blue",
    );
    const resistance = magical ? enemy.magicResistance : enemy.armor;
    const mitigation = 1 - Math.min(80, Math.max(0, resistance)) / 100;
    const autoDamage = Math.max(1, weaponPower * mitigation);
    let projectedDps = autoDamage * attackSpeed;

    if (primaryAbility !== undefined) {
      const abilityPower = primaryAbility.damageType === "magical"
        ? magicalDamage
        : physicalDamage;
      const abilityResistance = primaryAbility.damageType === "magical"
        ? enemy.magicResistance
        : enemy.armor;
      const abilityMitigation =
        1 - Math.min(80, Math.max(0, abilityResistance)) / 100;
      // Mirrors the current CombatRuntime execution path: bonusDamageRatio is
      // the direct multiplier passed to DamageManager.
      const abilityDamage = Math.max(
        1,
        abilityPower * primaryAbility.bonusDamageRatio * abilityMitigation,
      );
      projectedDps += abilityDamage / Math.max(0.5, primaryAbility.cooldown);
    }

    secondsPerSegment += enemy.hp / Math.max(1, projectedDps);
    // Runtime inserts roughly one second of encounter transition overhead.
    secondsPerSegment += 1;

    const isSegmentBoss = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
    expectedShardsPerSegment += getEnchantmentShardExpectedDrop({
      segmentIndex,
      isElite: isSegmentBoss && segmentIndex < 9,
      isBoss: isSegmentBoss,
      enchantmentDropWeight: baselineHp <= 0 ? 1 : enemy.hp / baselineHp,
    });
  }

  const cyclesPerHour = 3600 / Math.max(1, secondsPerSegment);
  return {
    killsPerHour: ENCOUNTERS_PER_SEGMENT * cyclesPerHour,
    shardsPerHour: expectedShardsPerSegment * cyclesPerHour,
  };
}

function averageShardRate(zoneIndex: number, segmentIndex: number): number {
  const values = T4_WEAPON_IDS.map((itemId) =>
    projectT4ShardRates(itemId, zoneIndex, segmentIndex).shardsPerHour
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe("T4 enchantment shard economy", () => {
  it("keeps a good Blue farming segment near the validated 25-30 shards/hour target", () => {
    expect(T4_WEAPON_IDS.length).toBeGreaterThan(0);

    const early = averageShardRate(0, 0);
    const mid = averageShardRate(0, 4);
    const deep = averageShardRate(0, 9);

    expect(early).toBeGreaterThanOrEqual(20);
    expect(early).toBeLessThanOrEqual(28);
    expect(mid).toBeGreaterThanOrEqual(24);
    expect(mid).toBeLessThanOrEqual(31);
    expect(deep).toBeGreaterThanOrEqual(27);
    expect(deep).toBeLessThanOrEqual(34);
  });

  it("does not make the first segment the best expected shard farm", () => {
    for (let zoneIndex = 0; zoneIndex < 5; zoneIndex += 1) {
      const early = averageShardRate(zoneIndex, 0);
      const mid = averageShardRate(zoneIndex, 4);
      const deep = averageShardRate(zoneIndex, 9);

      expect(mid).toBeGreaterThan(early);
      expect(deep).toBeGreaterThan(mid);
    }
  });

  it("keeps weapon choice from creating a large shard-economy spread", () => {
    const values = T4_WEAPON_IDS.map((itemId) =>
      projectT4ShardRates(itemId, 0, 4).shardsPerHour
    );
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);

    expect(maximum / minimum).toBeLessThan(1.12);
  });
});
