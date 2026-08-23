import { ENCOUNTERS_PER_SEGMENT, type WorldBandId } from "@game/data";
import { getEnemyCombatProfile, getEncounterRewards, type ZoneDefinitionId } from "@game/gameplay";
import {
  BASE_COMBAT_DROP_RATES,
  BOSS_SPECIAL_DROP_MULTIPLIER,
  getDungeonKeyProgressionWeight,
  getEnchantmentShardExpectedDrop,
  getEnchantmentShardProgressionWeight,
} from "../data/economyContentCatalog.js";
import {
  getFactionMasteryYieldBonusPercent,
  resolveFactionMasteryId,
} from "../data/factionMasteryContentCatalog.js";
import { resolveMonsterForEncounter } from "../data/monsterContentCatalog.js";
import {
  CLIENT_ABILITIES,
  resolvePrimaryAbilityId,
  resolveWeaponMastery,
} from "../data/weaponContentCatalog.js";
import { applyPercentBonusRounded } from "./CombatRewardRuntime.js";

export interface ProjectedMasteryEntry {
  readonly id: string;
  readonly level: number;
}

export interface CalculateProjectedRateInput {
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly attackSpeed: number;
  readonly equippedWeaponId?: string | undefined;
  readonly primaryAbilityAutoCast: boolean;
  readonly currentZoneIndex: number;
  readonly currentZoneDefId?: ZoneDefinitionId | undefined;
  readonly currentWorldBandId?: WorldBandId | undefined;
  readonly currentSegment: number;
  readonly masteries?: readonly ProjectedMasteryEntry[] | undefined;
}

export interface ProjectedSegmentRates {
  readonly silverPerHour: number;
  readonly famePerHour: number;
  readonly enchantmentShardsPerHour: number;
  readonly keyFragmentsPerHour: number;
}

export function calculateProjectedSegmentRates(
  input: CalculateProjectedRateInput,
): ProjectedSegmentRates {
  const {
    physicalDamage,
    magicalDamage,
    attackSpeed: rawAttackSpeed,
    equippedWeaponId,
    primaryAbilityAutoCast,
    currentZoneIndex,
    currentZoneDefId,
    currentWorldBandId = "blue",
    currentSegment,
    masteries = [],
  } = input;

  const attackSpeed = Math.max(0.001, rawAttackSpeed);
  const autoAttackIsMagical = magicalDamage > physicalDamage;
  const autoAttackPower = autoAttackIsMagical ? magicalDamage : physicalDamage;

  const abilityId = resolvePrimaryAbilityId(equippedWeaponId);
  const ability = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
  const canEarnFame = resolveWeaponMastery(equippedWeaponId ?? "") !== undefined;
  const enchantmentDropWeight = getEnchantmentShardProgressionWeight(
    currentWorldBandId,
    currentZoneIndex,
    currentSegment,
  );
  const dungeonKeyDropWeight = getDungeonKeyProgressionWeight(
    currentWorldBandId,
    currentZoneIndex,
    currentSegment,
  );

  let projectedSeconds = 0;
  let projectedSilver = 0;
  let projectedFame = 0;
  let projectedEnchantmentShards = 0;
  let projectedKeyFragments = 0;

  for (
    let encounterIndex = 0;
    encounterIndex < ENCOUNTERS_PER_SEGMENT;
    encounterIndex += 1
  ) {
    const enemy = getEnemyCombatProfile(
      currentZoneIndex,
      currentSegment,
      encounterIndex,
      currentWorldBandId,
    );
    const autoResistance = autoAttackIsMagical
      ? enemy.magicResistance
      : enemy.armor;
    const autoDamage = Math.max(
      1,
      autoAttackPower
        * (1 - Math.min(80, Math.max(0, autoResistance)) / 100),
    );
    let projectedDps = autoDamage * attackSpeed;

    if (primaryAbilityAutoCast && ability !== undefined) {
      const abilityPower = ability.damageType === "magical"
        ? magicalDamage
        : physicalDamage;
      const abilityResistance = ability.damageType === "magical"
        ? enemy.magicResistance
        : enemy.armor;
      const abilityDamage = Math.max(
        1,
        abilityPower
          * (1 + ability.bonusDamageRatio)
          * (1 - Math.min(80, Math.max(0, abilityResistance)) / 100),
      );
      projectedDps += abilityDamage / Math.max(0.5, ability.cooldown);
    }

    projectedSeconds += enemy.hp / Math.max(1, projectedDps);
    projectedSeconds += 1;

    const factionYieldBonusPercent = currentZoneDefId === undefined
      ? 0
      : getProjectedFactionYieldBonusPercent(
          currentZoneDefId,
          currentSegment,
          encounterIndex,
          masteries,
        );
    const yieldMultiplier = 1 + factionYieldBonusPercent / 100;
    const rewards = getEncounterRewards(
      currentZoneIndex,
      currentSegment,
      encounterIndex,
      currentWorldBandId,
    );
    projectedSilver += applyPercentBonusRounded(rewards.silver, factionYieldBonusPercent);
    if (canEarnFame) {
      projectedFame += applyPercentBonusRounded(rewards.fame, factionYieldBonusPercent);
    }

    const isSpecialEncounter = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
    const isBoss = isSpecialEncounter && currentSegment === 9;
    const isElite = isSpecialEncounter && currentSegment < 9;

    projectedEnchantmentShards += getEnchantmentShardExpectedDrop({
      segmentIndex: currentSegment,
      isElite,
      isBoss,
      enchantmentDropWeight,
    }) * yieldMultiplier;
    projectedKeyFragments += BASE_COMBAT_DROP_RATES.keyFragment
      * dungeonKeyDropWeight
      * (isBoss ? BOSS_SPECIAL_DROP_MULTIPLIER : 1)
      * yieldMultiplier;
  }

  const cyclesPerHour = 3600 / Math.max(1, projectedSeconds);

  return {
    silverPerHour: projectedSilver * cyclesPerHour,
    famePerHour: projectedFame * cyclesPerHour,
    enchantmentShardsPerHour: projectedEnchantmentShards * cyclesPerHour,
    keyFragmentsPerHour: projectedKeyFragments * cyclesPerHour,
  };
}

function getProjectedFactionYieldBonusPercent(
  zoneDefId: ZoneDefinitionId,
  segmentIndex: number,
  encounterIndex: number,
  masteries: readonly ProjectedMasteryEntry[],
): number {
  const monster = resolveMonsterForEncounter(zoneDefId, segmentIndex, encounterIndex);
  const masteryId = resolveFactionMasteryId(monster.faction);
  if (masteryId === undefined) return 0;
  const level = masteries.find((mastery) => mastery.id === masteryId)?.level ?? 0;
  return getFactionMasteryYieldBonusPercent(level);
}
