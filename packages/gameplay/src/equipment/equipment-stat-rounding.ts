import type { StatId } from "../stats/types.js";

/**
 * Authored display-friendly stat quanta are also the real gameplay values.
 * Rounding happens after per-item enchantment scaling and before worn-item
 * modifiers are aggregated on the character.
 */
const EQUIPMENT_STAT_ROUNDING_STEP: Readonly<Record<string, number>> = {
  stat_max_health: 5,
  stat_armor: 1,
  stat_magic_resistance: 1,
  stat_physical_damage: 1,
  stat_magical_damage: 1,
};

export function roundEquipmentStatValue(statId: StatId, value: number): number {
  const step = EQUIPMENT_STAT_ROUNDING_STEP[String(statId)];
  if (step === undefined || step <= 0) return value;
  if (value <= 0) return 0;

  // Stats are non-negative. Math.floor(x + 0.5) gives nearest-value rounding
  // with exact ties resolved upward, matching the authored balance contract.
  return Math.floor(value / step + 0.5) * step;
}
