import type { ProgressionOrchestrator } from "@game/gameplay";
import {
  MASTERY_DEFINITIONS,
  getMasteryDisplayName,
} from "../../data/progressionContentCatalog.js";
import type { GameBridge, MasteryVM, WorldVM } from "../../game/GameBridge";

export function buildMasteryViewModels(
  state: ReturnType<ProgressionOrchestrator["getFullProgressionState"]>,
): MasteryVM[] {
  return [...state.masteries.values()].map((mastery) => {
    const definition = MASTERY_DEFINITIONS.find((entry) => entry.id === mastery.masteryId);
    const requirements = definition?.experiencePerLevel ?? [];
    const fallbackRequirement = requirements[requirements.length - 1] ?? 0;
    return {
      id: mastery.masteryId,
      displayName: getMasteryDisplayName(mastery.masteryId),
      category: definition?.category ?? "unknown",
      isUnlocked: mastery.isUnlocked,
      level: mastery.level,
      currentXp: mastery.currentXp,
      xpToNextLevel: mastery.level >= (definition?.maxLevel ?? 0)
        ? 0
        : (requirements[mastery.level] ?? fallbackRequirement),
      totalLifetimeXp: mastery.totalLifetimeXp,
      maxLevel: definition?.maxLevel ?? 0,
    };
  });
}

export function syncProgressionToBridge(
  bridge: GameBridge,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  bridge.updateProgression({ totalFame, overflowPool, masteries });
}

export function syncWorldToBridge(bridge: GameBridge, world: WorldVM): void {
  bridge.updateWorld(world);
}
