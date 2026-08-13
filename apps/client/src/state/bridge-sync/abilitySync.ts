import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager } from "@game/gameplay";
import {
  CLIENT_ABILITIES,
  resolveUnlockedWeaponAbilities,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  type ClientAbilityDefinition,
  type WeaponFamilyId,
} from "../../data/weaponContentCatalog";
import type { CombatAbilityVM, GameBridge } from "../../game/GameBridge";

const SHORTCUTS = ["Q", "W", "E"] as const;

const FAMILY_SHARED_ABILITY_IDS: Readonly<Record<WeaponFamilyId, readonly [string, string]>> = {
  sword: ["ability_sword_heroic_strike", "ability_sword_guard_breaker"],
  bow: ["ability_bow_aimed_shot", "ability_bow_piercing_arrow"],
  fire_staff: ["ability_fire_fireball", "ability_fire_infernal_burst"],
  gloves: ["ability_gloves_shockwave", "ability_gloves_breaking_combo"],
  dagger: ["ability_dagger_double_slash", "ability_dagger_flurry"],
};

const SPECIALIZATION_SIGNATURE_ABILITY_IDS: Readonly<Record<string, string>> = {
  mastery_broadsword: "ability_sword_execution",
  mastery_longbow: "ability_bow_deadeye",
  mastery_badon: "ability_bow_badon_raging_storm",
  mastery_infernal_staff: "ability_fire_cataclysm",
  mastery_spiked_gauntlets: "ability_gloves_seismic_impact",
  mastery_dagger_pair: "ability_dagger_assassination",
};

export function resolveComposedUnlockedWeaponAbilities(
  itemId: string | undefined,
  specializationMasteryLevel: number,
): readonly ClientAbilityDefinition[] {
  if (itemId === undefined) return [];
  const familyId = resolveWeaponFamilyId(itemId);
  const masteryRoute = resolveWeaponMastery(itemId);
  if (familyId === undefined || masteryRoute === undefined) {
    return resolveUnlockedWeaponAbilities(itemId, specializationMasteryLevel);
  }

  const sharedIds = FAMILY_SHARED_ABILITY_IDS[familyId];
  const signatureId = SPECIALIZATION_SIGNATURE_ABILITY_IDS[String(masteryRoute.weaponId)];
  if (signatureId === undefined) {
    return resolveUnlockedWeaponAbilities(itemId, specializationMasteryLevel);
  }

  const slots = [
    { level: 1, id: sharedIds[0] },
    { level: 10, id: sharedIds[1] },
    { level: 30, id: signatureId },
  ];

  return slots
    .filter(({ level }) => specializationMasteryLevel >= level)
    .map(({ id }) => CLIENT_ABILITIES[id])
    .filter((ability): ability is ClientAbilityDefinition => ability !== undefined);
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

  const definitions = resolveComposedUnlockedWeaponAbilities(
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
      description: definition.description,
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
