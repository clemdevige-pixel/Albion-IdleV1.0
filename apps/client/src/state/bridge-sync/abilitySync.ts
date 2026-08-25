import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager, DamageType } from "@game/gameplay";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
  type AbilityMechanic,
  type ClientAbilityDefinition,
} from "../../data/weaponContentCatalog";
import type { CombatAbilityVM, GameBridge } from "../../game/GameBridge";

const SHORTCUTS = ["Q", "W", "E"] as const;

export interface AbilityTooltipStats {
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly abilityPowerPercent: number;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatPercent(ratio: number): string {
  return `${formatNumber(ratio * 100)}%`;
}

function damageTypeLabel(damageType: DamageType): string {
  return damageType === "magical" ? "magiques" : "physiques";
}

function sourceDamageLabel(damageType: DamageType): string {
  return damageType === "magical" ? "Dégâts magiques" : "Dégâts physiques";
}

function sourceDamage(stats: AbilityTooltipStats, damageType: DamageType): number {
  return damageType === "magical" ? stats.magicalDamage : stats.physicalDamage;
}

function abilityPowerMultiplier(stats: AbilityTooltipStats): number {
  return 1 + Math.max(0, stats.abilityPowerPercent) / 100;
}

function statLabel(statId: Extract<AbilityMechanic, { readonly kind: "status" }>["statId"]): string {
  switch (statId) {
    case "stat_armor": return "Armure";
    case "stat_magic_resistance": return "Résistance magique";
    case "stat_auto_attack_damage_taken_bonus": return "dégâts d'auto-attaque subis";
    case "stat_attack_speed": return "vitesse d'attaque";
    case "stat_damage_taken_bonus": return "dégâts subis";
    default: return "statistique";
  }
}

function statusDescription(mechanic: Extract<AbilityMechanic, { readonly kind: "status" }>): string {
  if (mechanic.effectType === "stun") return `Étourdit pendant ${formatNumber(mechanic.duration)} s`;
  if (mechanic.effectType === "silence") return `Réduit au silence pendant ${formatNumber(mechanic.duration)} s`;

  const target = mechanic.target === "self" ? "vous" : "la cible";
  if (mechanic.statId === undefined || mechanic.statDelta === undefined) {
    return `${mechanic.effectType === "buff" ? "Applique un bonus" : "Applique un malus"} à ${target} pendant ${formatNumber(mechanic.duration)} s`;
  }

  const sign = mechanic.statDelta > 0 ? "+" : "";
  const isPercent = mechanic.modifierType === "percent"
    || mechanic.statId === "stat_auto_attack_damage_taken_bonus"
    || mechanic.statId === "stat_damage_taken_bonus";
  const value = mechanic.modifierType === "multiplier"
    ? `×${formatNumber(mechanic.statDelta)}`
    : `${sign}${formatNumber(mechanic.statDelta)}${isPercent ? "%" : ""}`;
  return `${statLabel(mechanic.statId)} ${value} sur ${target} pendant ${formatNumber(mechanic.duration)} s`;
}

function scalingSuffix(outputType: DamageType, scalingType: DamageType): string {
  return outputType === scalingType ? "" : ` (calculés depuis ${sourceDamageLabel(scalingType)})`;
}

function mechanicDescription(
  definition: ClientAbilityDefinition,
  mechanic: AbilityMechanic,
  stats: AbilityTooltipStats,
): string {
  if (mechanic.kind === "damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const hits = Math.max(1, mechanic.hits ?? 1);
    const source = sourceDamage(stats, scalingType);
    const powerMultiplier = abilityPowerMultiplier(stats);
    const totalDamage = source * (1 + mechanic.ratio) * powerMultiplier;
    let text = `Inflige ${formatNumber(totalDamage)} dégâts ${damageTypeLabel(outputType)}${scalingSuffix(outputType, scalingType)}`;
    if (hits > 1) text += ` au total en ${String(hits)} coups (${formatNumber(totalDamage / hits)} par coup)`;
    if (mechanic.bonusHealthBelow !== undefined) {
      const conditionalDamage = source * (1 + mechanic.ratio + mechanic.bonusHealthBelow.bonusRatio) * powerMultiplier;
      text += ` ; sous ${formatPercent(mechanic.bonusHealthBelow.ratio)} PV cible : ${formatNumber(conditionalDamage)} dégâts au total`;
    }
    if (mechanic.bonusEffect !== undefined) {
      const conditionalDamage = source * (1 + mechanic.ratio + mechanic.bonusEffect.bonusRatio) * powerMultiplier;
      text += ` ; si l'effet requis est actif : ${formatNumber(conditionalDamage)} dégâts au total`;
    }
    return text;
  }

  if (mechanic.kind === "bonus_damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const damage = sourceDamage(stats, scalingType) * mechanic.ratio * abilityPowerMultiplier(stats);
    return `Ajoute ${formatNumber(damage)} dégâts ${damageTypeLabel(outputType)}${scalingSuffix(outputType, scalingType)}`;
  }

  if (mechanic.kind === "heal_from_damage") {
    const cap = mechanic.maxHealthRatio === undefined
      ? ""
      : `, plafonné à ${formatPercent(mechanic.maxHealthRatio)} des PV max`;
    return `Soigne ${formatPercent(mechanic.ratio)} des dégâts réellement infligés${cap}`;
  }

  if (mechanic.kind === "dot") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const damagePerTick = sourceDamage(stats, scalingType) * mechanic.ratio * abilityPowerMultiplier(stats);
    const totalDamage = damagePerTick * mechanic.ticks;
    return `Inflige ensuite ${formatNumber(damagePerTick)} dégâts ${damageTypeLabel(outputType)}${scalingSuffix(outputType, scalingType)} toutes les ${formatNumber(mechanic.interval)} s pendant ${String(mechanic.ticks)} ticks (${formatNumber(totalDamage)} dégâts au total)`;
  }

  if (mechanic.kind === "auto_attack_bonus_window") {
    const bonusDamage = sourceDamage(stats, mechanic.scalingDamageType) * mechanic.ratio;
    return `Pendant ${formatNumber(mechanic.duration)} s, chaque auto-attaque gagne ${formatNumber(bonusDamage)} dégâts ${damageTypeLabel(mechanic.damageType)}${scalingSuffix(mechanic.damageType, mechanic.scalingDamageType)}`;
  }

  return statusDescription(mechanic);
}

export function describeAbilityMechanics(
  definition: ClientAbilityDefinition,
  stats: AbilityTooltipStats,
): string {
  const details = definition.mechanics.mechanics.map((mechanic) => mechanicDescription(definition, mechanic, stats));
  return details.length === 0 ? definition.description : `${details.join(". ")}.`;
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
      description: describeAbilityMechanics(definition, tooltipStats),
      icon: definition.icon,
      shortcut: SHORTCUTS[slotIndex] ?? "Q",
      cooldown: definition.cooldown,
      cooldownRemaining: Math.max(0, entry.cooldownRemaining),
      isReady: entry.state === "ready" && bridge.combatState === "combat",
      autoCast: isAutoCastEnabled,
    };
  };

  bridge.updateAbilities({
    primary: toViewModel(0),
    secondary: toViewModel(1),
    ultimate: toViewModel(2),
  });
}
