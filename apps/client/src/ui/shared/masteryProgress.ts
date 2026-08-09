import type { MasteryVM } from "../../game/GameBridge";

export function masteryProgressPercent(mastery: MasteryVM): number {
  if (mastery.level >= mastery.maxLevel || mastery.xpToNextLevel <= 0) return 100;
  return Math.max(0, Math.min(100, (mastery.currentXp / mastery.xpToNextLevel) * 100));
}
