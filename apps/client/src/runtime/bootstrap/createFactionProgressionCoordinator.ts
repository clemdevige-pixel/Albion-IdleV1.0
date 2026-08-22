import type { FactionResearchFoundation } from "./createFactionResearchFoundation.js";

interface ResearchAdvancePort {
  advance(elapsedMs: number): {
    readonly completedResearchId: string | undefined;
  };
}

interface ExpeditionAdvancePort<TCompletion> {
  advance(elapsedMs: number): {
    readonly completed: readonly TCompletion[];
  };
}

export interface FactionProgressionCoordinatorDependencies<TCompletion> {
  readonly factionResearchFoundation: FactionResearchFoundation;
  readonly researchService: ResearchAdvancePort;
  readonly expeditionService: ExpeditionAdvancePort<TCompletion>;
  readonly onExpeditionCompletion: (completed: readonly TCompletion[]) => void;
}

/**
 * Sequences cross-domain events for the faction/research feature.
 * Individual domains keep their own state and rules; this coordinator only
 * defines event ordering so GameContext remains a pure composition root.
 */
export function createFactionProgressionCoordinator<TCompletion>(
  dependencies: FactionProgressionCoordinatorDependencies<TCompletion>,
) {
  return {
    recordMonsterKill(this: void, monsterId: string): void {
      dependencies.factionResearchFoundation.recordMonsterKill(monsterId);
    },

    onWorldProgress(this: void): void {
      dependencies.factionResearchFoundation.resolveWorldProgress();
    },

    reconcile(this: void): void {
      dependencies.factionResearchFoundation.resolveWorldProgress();
    },

    advance(this: void, elapsedMs: number): void {
      const researchAdvance = dependencies.researchService.advance(elapsedMs);
      if (researchAdvance.completedResearchId !== undefined) {
        dependencies.factionResearchFoundation.resolveWorldProgress();
      }

      const expeditionAdvance = dependencies.expeditionService.advance(elapsedMs);
      if (expeditionAdvance.completed.length > 0) {
        dependencies.onExpeditionCompletion(expeditionAdvance.completed);
      }
    },
  };
}

export type FactionProgressionCoordinator = ReturnType<
  typeof createFactionProgressionCoordinator
>;
