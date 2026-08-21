import type { FactionResearchFoundation } from "./createFactionResearchFoundation.js";

interface ResearchAdvancePort {
  advance(elapsedMs: number): {
    readonly completedResearchId: string | undefined;
  };
}

interface ExpeditionAdvancePort {
  advance(elapsedMs: number): {
    readonly completed: readonly unknown[];
  };
}

export interface FactionProgressionCoordinatorDependencies {
  readonly factionResearchFoundation: FactionResearchFoundation;
  readonly researchService: ResearchAdvancePort;
  readonly expeditionService: ExpeditionAdvancePort;
  readonly onExpeditionCompletion: () => void;
}

/**
 * Sequences cross-domain events for the faction/research feature.
 * Individual domains keep their own state and rules; this coordinator only
 * defines event ordering so GameContext remains a pure composition root.
 */
export function createFactionProgressionCoordinator(
  dependencies: FactionProgressionCoordinatorDependencies,
) {
  return {
    recordMonsterKill(monsterId: string): void {
      dependencies.factionResearchFoundation.recordMonsterKill(monsterId);
    },

    onWorldProgress(): void {
      dependencies.factionResearchFoundation.resolveWorldProgress();
    },

    reconcile(): void {
      dependencies.factionResearchFoundation.resolveWorldProgress();
    },

    advance(elapsedMs: number): void {
      const researchAdvance = dependencies.researchService.advance(elapsedMs);
      if (researchAdvance.completedResearchId !== undefined) {
        dependencies.factionResearchFoundation.resolveWorldProgress();
      }

      const expeditionAdvance = dependencies.expeditionService.advance(elapsedMs);
      if (expeditionAdvance.completed.length > 0) {
        dependencies.onExpeditionCompletion();
      }
    },
  };
}

export type FactionProgressionCoordinator = ReturnType<
  typeof createFactionProgressionCoordinator
>;
