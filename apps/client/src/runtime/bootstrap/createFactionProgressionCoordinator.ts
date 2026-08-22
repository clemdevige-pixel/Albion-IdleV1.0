import type { FactionResearchFoundation } from "./createFactionResearchFoundation.js";

interface ResearchProgressionPort {
  advance(elapsedMs: number): unknown;
  onCompleted(listener: (researchId: string) => void): () => void;
}

interface ExpeditionProgressionPort<TCompletion> {
  advance(elapsedMs: number): unknown;
  onCompleted(listener: (completed: readonly TCompletion[]) => void): () => void;
}

export interface FactionProgressionCoordinatorDependencies<TCompletion> {
  readonly factionResearchFoundation: FactionResearchFoundation;
  readonly researchService: ResearchProgressionPort;
  readonly expeditionService: ExpeditionProgressionPort<TCompletion>;
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
  dependencies.researchService.onCompleted(() => {
    dependencies.factionResearchFoundation.resolveWorldProgress();
  });
  dependencies.expeditionService.onCompleted((completed) => {
    dependencies.onExpeditionCompletion(completed);
  });

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
      dependencies.researchService.advance(elapsedMs);
      dependencies.expeditionService.advance(elapsedMs);
    },
  };
}

export type FactionProgressionCoordinator = ReturnType<
  typeof createFactionProgressionCoordinator
>;
