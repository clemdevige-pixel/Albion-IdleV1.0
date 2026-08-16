import type { EntityId } from "@game/core";
import type { EffectManager } from "@game/gameplay";

/**
 * Shared control-state gate for active ability execution.
 *
 * Stun blocks all active actions and silence blocks active abilities. Keeping
 * this rule outside weapon/monster profiles prevents individual combat kits
 * from implementing their own CC exceptions.
 */
export function canUseActiveAbility(
  effectManager: EffectManager,
  entityId: EntityId,
): boolean {
  return !effectManager.isStunned(entityId) && !effectManager.isSilenced(entityId);
}
