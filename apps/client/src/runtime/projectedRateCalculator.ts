import { ENCOUNTERS_PER_SEGMENT, type WorldBandId } from "@game/data";
import { getEnemyCombatProfile, getEncounterRewards } from "@game/gameplay";
import {
  CLIENT_ABILITIES,
  resolvePrimaryAbilityId,
  resolveWeaponMastery,
} from "../data/weaponContentCatalog.js";

export interface CalculateProjectedRateInput {
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly attackSpeed: number;
  readonly equippedWeaponId?: string | undefined;
  readonly primaryAbilityAutoCast: boolean;
  readonly currentZoneIndex: number;
  readonly currentWorldBandId?: WorldBandId | undefined;
  readonly currentSegment: number;
}

export interface ProjectedSegmentRates {
  readonly silverPerHour: number;
  readonly famePerHour: number;
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
    currentWorldBandId = "blue",
    currentSegment,
  } = input;

  const attackSpeed = Math.max(0.001, rawAttackSpeed);
  const autoAttackIsMagical = magicalDamage > physicalDamage;
  const autoAttackPower = autoAttackIsMagical ? magicalDamage : physicalDamage;

  const abilityId = resolvePrimaryAbilityId(equippedWeaponId);
  const ability = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
  const canEarnFame = resolveWeaponMastery(equippedWeaponId ?? "") !== undefined;

  let projectedSeconds = 0;
  let projectedSilver = 0;
  let projectedFame = 0;

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

    const rewards = getEncounterRewards(
      currentZoneIndex,
      currentSegment,
      encounterIndex,
      currentWorldBandId,
    );
    projectedSilver += rewards.silver;
    if (canEarnFame) projectedFame += rewards.fame;
  }

  const cyclesPerHour = 3600 / Math.max(1, projectedSeconds);

  return {
    silverPerHour: projectedSilver * cyclesPerHour,
    famePerHour: projectedFame * cyclesPerHour,
  };
}
