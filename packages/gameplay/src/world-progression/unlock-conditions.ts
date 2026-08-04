import type { UnlockCondition, UnlockEvaluationContext } from "./world-progression-types.js";

/**
 * Evaluate a single unlock condition against the given context.
 * Returns `true` when the condition is satisfied.
 */
export function evaluateCondition(
  condition: UnlockCondition,
  context: UnlockEvaluationContext,
): boolean {
  switch (condition.type) {
    case "tier_reached":
      return (
        condition.requiredTier !== undefined &&
        context.currentTier >= condition.requiredTier
      );

    case "zone_completed":
      return (
        condition.targetZoneDefId !== undefined &&
        context.completedZones.has(condition.targetZoneDefId)
      );

    case "fame_reached":
      return (
        condition.requiredFame !== undefined &&
        context.currentFame >= condition.requiredFame
      );

    case "manual":
      // Manual unlocks are never satisfied by evaluation — they require
      // an explicit call to unlock.
      return false;
  }
}
