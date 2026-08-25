import {
  AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
  AUTO_CAST_SETUP_PAYOFF_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
} from "@game/data";

export {
  AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
  AUTO_CAST_SETUP_PAYOFF_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
};

/**
 * Combat automation policy.
 *
 * Auto-cast may accept a small amount of overkill, but it should preserve a
 * cooldown when the spell would waste substantially more damage than the
 * target has health remaining. Manual casts are never constrained by this.
 */
export function isExcessiveAutoCastOverkill(
  estimatedImmediateDamage: number,
  remainingHealth: number,
  maximumDamageToRemainingHpRatio: number = AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
): boolean {
  if (remainingHealth <= 0) return true;
  return estimatedImmediateDamage
    > remainingHealth * maximumDamageToRemainingHpRatio;
}
