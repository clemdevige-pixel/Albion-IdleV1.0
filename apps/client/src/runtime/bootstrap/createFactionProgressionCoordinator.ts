import type { RelicKillEvent } from "@game/gameplay";
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
  readonly reconcileResearchEffects?: () => void;
  readonly onResearchCompletion?: (researchId: string) => void;
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
  dependencies.researchService.onCompleted((researchId) => {
    dependencies.reconcileResearchEffects?.();
    dependencies.factionResearchFoundation.resolveWorldProgress();
    dependencies.onResearchCompletion?.(researchId);
  });
  dependencies.expeditionService.onCompleted((completed) => {
    // Rewards are already authoritative when this fires. Defer presentation
    // and projection side effects until the current runtime tick has unwound,
    // so an expedition recap cannot re-enter an active combat tick.
    queueMicrotask(() => {
      dependencies.onExpeditionCompletion(completed);
    });
  });

  return {
    recordMonsterKill(this: void, kill: RelicKillEvent): void {
      dependencies.factionResearchFoundation.recordMonsterKill(kill);
    },

    onWorldProgress(this: void): void {
      dependencies.reconcileResearchEffects?.();
      dependencies.factionResearchFoundation.resolveWorldProgress();
    },

    reconcile(this: void): void {
      dependencies.reconcileResearchEffects?.();
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
