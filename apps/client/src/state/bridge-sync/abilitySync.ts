import type { EntityId } from "@game/core";
import type { AbilityId, AbilityManager } from "@game/gameplay";
import {
  CLIENT_ABILITIES,
  resolvePrimaryAbilityId,
} from "../../data/weaponContentCatalog";
import type { GameBridge } from "../../game/GameBridge";

export function syncAbilitiesToBridge(
  bridge: GameBridge,
  abilityManager: AbilityManager,
  heroId: EntityId,
  equippedWeaponId: string | undefined,
  isAutoCastEnabled: boolean,
): void {
  const abilityId = resolvePrimaryAbilityId(equippedWeaponId);
  const definition = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
  const entry = abilityId === undefined
    ? undefined
    : abilityManager.getAbility(heroId, abilityId as AbilityId);
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
