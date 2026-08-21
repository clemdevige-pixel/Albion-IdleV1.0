import type {
  ExperienceService,
  FactionId,
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
  const resolveMasteryId = (factionId: string) => resolveFactionMasteryId(factionId as FactionId);

  return {
    awardRawFactionFame(factionId: string, rawFame: number): void {
      if (!Number.isInteger(rawFame) || rawFame <= 0) return;
      const masteryId = resolveMasteryId(factionId);
      if (masteryId === undefined) return;

      if (!dependencies.masteryService.isMasteryUnlocked(masteryId)) {
        dependencies.masteryService.discoverMastery(masteryId);
      }
      dependencies.experienceService.addExperience(masteryId, rawFame, "combat");
    },

    getYieldBonusPercent(factionId: string): number {
      const masteryId = resolveMasteryId(factionId);
      if (masteryId === undefined) return 0;
      const level = dependencies.masteryService.getMasteryState(masteryId)?.level ?? 0;
      return getFactionMasteryYieldBonusPercent(level);
    },
  };
}

export type FactionMasteryFoundation = ReturnType<typeof createFactionMasteryFoundation>;
