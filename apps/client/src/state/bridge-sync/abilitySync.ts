import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager } from "@game/gameplay";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "../../data/weaponContentCatalog";
import type { CombatAbilityVM, GameBridge } from "../../game/GameBridge";

const SHORTCUTS = ["Q", "W", "E"] as const;

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
