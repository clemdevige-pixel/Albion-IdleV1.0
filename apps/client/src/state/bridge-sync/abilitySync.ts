import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager } from "@game/gameplay";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "../../data/weaponContentCatalog";
import type { GameBridge } from "../../game/GameBridge";

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

  const definition = resolveUnlockedWeaponAbilities(
    equippedWeaponId,
    specializationMasteryLevel,
  )[0];
  const entry = definition === undefined
    ? undefined
    : abilityManager.getAbility(heroId, definition.id as AbilityId);

  bridge.updateAbilities({
    primary: definition === undefined || entry === undefined
      ? null
      : {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          shortcut: "Q",
          cooldown: definition.cooldown,
          cooldownRemaining: Math.max(0, entry.cooldownRemaining),
          isReady: entry.state === "ready" && bridge.combatState === "combat",
          autoCast: isAutoCastEnabled,
        },
  });
}
