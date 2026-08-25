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

function mechanicDescription(
  definition: ClientAbilityDefinition,
  mechanic: AbilityMechanic,
): string {
  if (mechanic.kind === "damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    const hits = Math.max(1, mechanic.hits ?? 1);
    const totalRatio = 1 + mechanic.ratio;
    let text = `Inflige ${formatPercent(totalRatio)} de ${sourceDamageLabel(scalingType)} en dégâts ${damageTypeLabel(outputType)}`;
    if (hits > 1) text += ` au total en ${String(hits)} coups (${formatPercent(totalRatio / hits)} par coup)`;
    if (mechanic.bonusHealthBelow !== undefined) {
      text += ` ; sous ${formatPercent(mechanic.bonusHealthBelow.ratio)} PV cible : ${formatPercent(totalRatio + mechanic.bonusHealthBelow.bonusRatio)} au total`;
    }
    if (mechanic.bonusEffect !== undefined) {
      text += ` ; si l'effet requis est actif : ${formatPercent(totalRatio + mechanic.bonusEffect.bonusRatio)} au total`;
    }
    return text;
  }

  if (mechanic.kind === "bonus_damage") {
    const outputType = mechanic.damageType ?? definition.damageType;
    const scalingType = mechanic.scalingDamageType ?? outputType;
    return `Ajoute ${formatPercent(mechanic.ratio)} de ${sourceDamageLabel(scalingType)} en dégâts ${damageTypeLabel(outputType)}`;
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
    const totalRatio = mechanic.ratio * mechanic.ticks;
    return `Inflige ensuite ${formatPercent(mechanic.ratio)} de ${sourceDamageLabel(scalingType)} en dégâts ${damageTypeLabel(outputType)} toutes les ${formatNumber(mechanic.interval)} s pendant ${String(mechanic.ticks)} ticks (${formatPercent(totalRatio)} au total)`;
  }

  if (mechanic.kind === "auto_attack_bonus_window") {
    return `Pendant ${formatNumber(mechanic.duration)} s, chaque auto-attaque gagne ${formatPercent(mechanic.ratio)} de ${sourceDamageLabel(mechanic.scalingDamageType)} en dégâts ${damageTypeLabel(mechanic.damageType)}`;
  }

  return statusDescription(mechanic);
}

export function describeAbilityMechanics(definition: ClientAbilityDefinition): string {
  const details = definition.mechanics.mechanics.map((mechanic) => mechanicDescription(definition, mechanic));
  return details.length === 0 ? definition.description : `${details.join(". ")}.`;
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

  const toViewModel = (slotIndex: number): CombatAbilityVM | null => {
    const definition = definitions[slotIndex];
    if (definition === undefined) return null;
    const entry = abilityManager.getAbility(heroId, definition.id as AbilityId);
    if (entry === undefined) return null;

    return {
      id: definition.id,
      name: definition.name,
      description: describeAbilityMechanics(definition),
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
