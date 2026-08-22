import type {
  ExperienceService,
  MasteryService,
} from "@game/gameplay";
import {
  getFactionMasteryYieldBonusPercent,
  resolveFactionMasteryId,
} from "../../data/factionMasteryContentCatalog.js";

export interface FactionMasteryFoundationDependencies {
  readonly masteryService: MasteryService;
  readonly experienceService: ExperienceService;
}

/**
 * Application adapter between authored faction identities and the generic
 * Mastery/Experience services. No faction progression state is duplicated.
 */
export function createFactionMasteryFoundation(
  dependencies: FactionMasteryFoundationDependencies,
) {
  const getYieldBonusPercent = (factionId: string): number => {
    const masteryId = resolveFactionMasteryId(factionId);
    if (masteryId === undefined) return 0;
    const level = dependencies.masteryService.getMasteryState(masteryId)?.level ?? 0;
    return getFactionMasteryYieldBonusPercent(level);
  };

  return {
    awardRawFactionFame(this: void, factionId: string, rawFame: number): number {
      const currentYieldBonusPercent = getYieldBonusPercent(factionId);
      if (!Number.isInteger(rawFame) || rawFame <= 0) return currentYieldBonusPercent;
      const masteryId = resolveFactionMasteryId(factionId);
      if (masteryId === undefined) return 0;

      if (!dependencies.masteryService.isMasteryUnlocked(masteryId)) {
        dependencies.masteryService.discoverMastery(masteryId);
      }
      dependencies.experienceService.addExperience(masteryId, rawFame, "combat");
      return currentYieldBonusPercent;
    },

    getYieldBonusPercent(this: void, factionId: string): number {
      return getYieldBonusPercent(factionId);
    },
  };
}

export type FactionMasteryFoundation = ReturnType<typeof createFactionMasteryFoundation>;
