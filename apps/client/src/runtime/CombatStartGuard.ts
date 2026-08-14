export type CombatStartBlockReason = "weapon_required";

let generation = 0;
let reason: CombatStartBlockReason | undefined;

export function markCombatStartBlocked(nextReason: CombatStartBlockReason): void {
  generation += 1;
  reason = nextReason;
}

export function getCombatStartBlockGeneration(): number {
  return generation;
}

export function getCombatStartBlockReason(): CombatStartBlockReason | undefined {
  return reason;
}
