/**
 * Combat automation balance policy.
 *
 * Auto-cast may accept a small amount of overkill, but it should preserve a
 * cooldown when the spell would waste substantially more damage than the
 * target has health remaining. Manual casts are never constrained by this.
 */
export const AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO = 1.5;
