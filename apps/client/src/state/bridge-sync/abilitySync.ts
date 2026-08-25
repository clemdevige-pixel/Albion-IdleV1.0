import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager, DamageType } from "@game/gameplay";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
  type AbilityMechanic,
  type ClientAbilityDefinition,
} from "../../data/weaponContentCatalog";
import type {
  CombatAbilityDetailVM,
  CombatAbilityVM,
  GameBridge,
} from "../../game/GameBridge";

const SHORTCUTS = ["Q", "W", "E"] as const;
const TOOLTIP_AMOUNT_PRECISION = 100;

export interface AbilityTooltipStats {
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly abilityPowerPercent: number;
}

function normalizeTooltipAmount(value: number): number {
  return Math.round(value * TOOLTIP_AMOUNT_PRECISION) / TOOLTIP_AMOUNT_PRECISION;
}

function sourceDamage(stats: AbilityTooltipStats, damageType: DamageType): number {
  return damageType === "magical" ? stats.magicalDamage : stats.physicalDamage;
}

function abilityPowerMultiplier(stats: AbilityTooltipStats): number {
  return 1 + Math.max(0, stats.abilityPowerPercent) / 100;
}

function buildConditionalAmounts(
  mechanic: Extract<AbilityMechanic, { readonly kind: "damage" }>,
  source: number,
  powerMultiplier: number,
): Extract<CombatAbilityDetailVM, { readonly kind: "damage" }>["conditionalAmounts"] {
  const values: Array<
    | { readonly kind: "health_below"; readonly thresholdRatio: number; readonly amount: number }
    | { readonly kind: "effect_active"; readonly effectId: string; readonly amount: number }
  > = [];

  if (mechanic.bonusHealthBelow !== undefined) {
    values.push({
      kind: "health_below",
      thresholdRatio: mechanic.bonusHealthBelow.ratio,
      amount: normalizeTooltipAmount(source * (1 + mechanic.ratio + mechanic.bonusHealthBelow.bonusRatio) * powerMultiplier),
    });
  }

  if (mechanic.bonusEffect !== undefined) {
    values.push({
      kind: "effect_active",
      effectId: mechanic.bonusEffect.effectId,
      amount: normalizeTooltipAmount(source * (1 + mechanic.ratio + mechanic.bonusEffect.bonusRatio) * powerMultiplier),
    });
  }

  return values;
}

function buildAbilityDetail(
  definition: ClientAbilityDefinition,
  mechanic: AbilityMechanic,
  stats: AbilityTooltipStats,
): CombatAbilityDetailVM {
  if (mechanic.kind === "damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const source = sourceDamage(stats, scalingType);
    const powerMultiplier = abilityPowerMultiplier(stats);
    const amount = normalizeTooltipAmount(source * (1 + mechanic.ratio) * powerMultiplier);
    const hits = Math.max(1, mechanic.hits ?? 1);
    return {
      kind: "damage",
      amount,
      damageType: outputType,
      hits,
      amountPerHit: normalizeTooltipAmount(amount / hits),
      conditionalAmounts: buildConditionalAmounts(mechanic, source, powerMultiplier),
    };
  }

  if (mechanic.kind === "bonus_damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    return {
      kind: "bonus_damage",
      amount: normalizeTooltipAmount(sourceDamage(stats, scalingType) * mechanic.ratio * abilityPowerMultiplier(stats)),
      damageType: outputType,
    };
  }

  if (mechanic.kind === "heal_from_damage") {
    return {
      kind: "heal_from_damage",
      ratio: mechanic.ratio,
      ...(mechanic.maxHealthRatio === undefined ? {} : { maxHealthRatio: mechanic.maxHealthRatio }),
    };
  }

  if (mechanic.kind === "dot") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const amountPerTick = normalizeTooltipAmount(sourceDamage(stats, scalingType) * mechanic.ratio * abilityPowerMultiplier(stats));
    return {
      kind: "dot",
      amountPerTick,
      totalAmount: normalizeTooltipAmount(amountPerTick * mechanic.ticks),
      interval: mechanic.interval,
      ticks: mechanic.ticks,
      damageType: outputType,
    };
  }

  if (mechanic.kind === "auto_attack_bonus_window") {
    return {
      kind: "auto_attack_bonus_window",
      amountPerAttack: normalizeTooltipAmount(sourceDamage(stats, mechanic.scalingDamageType) * mechanic.ratio),
      duration: mechanic.duration,
      damageType: mechanic.damageType,
    };
  }

  return {
    kind: "status",
    target: mechanic.target ?? "enemy",
    effectType: mechanic.effectType,
    duration: mechanic.duration,
    ...(mechanic.statId === undefined ? {} : { statId: mechanic.statId }),
    ...(mechanic.statDelta === undefined ? {} : { statDelta: mechanic.statDelta }),
    ...(mechanic.modifierType === undefined ? {} : { modifierType: mechanic.modifierType }),
  };
}

export function buildAbilityDetails(
  definition: ClientAbilityDefinition,
  stats: AbilityTooltipStats,
): readonly CombatAbilityDetailVM[] {
  return definition.mechanics.mechanics.map((mechanic) => buildAbilityDetail(definition, mechanic, stats));
}

function getComputedStat(bridge: GameBridge, statId: string): number {
  return bridge.stats.stats.find((stat) => stat.id === statId)?.computed ?? 0;
}

function getAbilityTooltipStats(bridge: GameBridge): AbilityTooltipStats {
  return {
    physicalDamage: getComputedStat(bridge, "stat_physical_damage"),
    magicalDamage: getComputedStat(bridge, "stat_magical_damage"),
    abilityPowerPercent: getComputedStat(bridge, "stat_ability_power"),
  };
}

export function syncAbilitiesToBridge(
  bridge: GameBridge,
  abilityManager: AbilityManager,
  heroId: EntityId,
  equippedWeaponId: string | undefined,
  isAutoCastEnabled: boolean,
): void {
  const masteryRoute = equippedWeaponId === undefined
    ? undefined
    : resolveWeaponMastery(equippedWeaponId);
  const specializationMasteryLevel = masteryRoute === undefined
    ? 0
    : bridge.progression.masteries.find(
        (mastery) => mastery.id === String(masteryRoute.weaponId),
      )?.level ?? 0;

  const definitions = resolveUnlockedWeaponAbilities(
    equippedWeaponId,
    specializationMasteryLevel,
  ).slice(0, 3);
  const tooltipStats = getAbilityTooltipStats(bridge);

  const toViewModel = (slotIndex: number): CombatAbilityVM | null => {
    const definition = definitions[slotIndex];
    if (definition === undefined) return null;
    const entry = abilityManager.getAbility(heroId, definition.id as AbilityId);
    if (entry === undefined) return null;

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      shortcut: SHORTCUTS[slotIndex] ?? "Q",
      cooldown: definition.cooldown,
      cooldownRemaining: Math.max(0, entry.cooldownRemaining),
      isReady: entry.state === "ready" && bridge.combatState === "combat",
      autoCast: isAutoCastEnabled,
      details: buildAbilityDetails(definition, tooltipStats),
    };
  };

  bridge.updateAbilities({
    primary: toViewModel(0),
    secondary: toViewModel(1),
    ultimate: toViewModel(2),
  });
}
