/**
 * Combat automation balance policy.
 *
 * Auto-cast may accept a small amount of overkill, but it should preserve a
 * cooldown when the spell would waste substantially more damage than the
 * target has health remaining. Manual casts are never constrained by this.
 */
export const AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO = 1.5;

/**
 * Setup-gated payoff abilities have a narrower availability window, so auto
 * combat may tolerate more overkill to complete the authored combo. The cap is
 * still finite: a payoff must not be dumped into a target that is effectively
 * already dead.
 */
export const AUTO_CAST_SETUP_PAYOFF_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO = 4;

export function isExcessiveAutoCastOverkill(
  estimatedImmediateDamage: number,
  remainingHealth: number,
  maximumDamageToRemainingHpRatio: number = AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO,
): boolean {
  if (remainingHealth <= 0) return true;
  return estimatedImmediateDamage
    > remainingHealth * maximumDamageToRemainingHpRatio;
}
