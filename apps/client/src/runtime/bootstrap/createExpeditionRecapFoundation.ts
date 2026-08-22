import type { ExpeditionCompletion } from "@game/gameplay";
import { getExpeditionDefinition } from "../../data/expeditionContentCatalog.js";
import type { ExpeditionRewardSummary } from "./createExpeditionFoundation.js";

export interface ExpeditionRecapItemModel {
  readonly expeditionId: string;
  readonly displayName: string;
  readonly durationMs: number;
  readonly reward:
    | { readonly kind: "silver"; readonly silverCredited: number }
    | {
      readonly kind: "faction_rune";
      readonly baseRunes: number;
      readonly masteryBonusPercent: number;
      readonly finalRunes: number;
    };
}

export interface ExpeditionRecapModel {
  readonly id: number;
  readonly items: readonly ExpeditionRecapItemModel[];
}

type RecapCompletion = ExpeditionCompletion<ExpeditionRewardSummary>;
type Listener = () => void;

/** Presentation-only store. Gameplay already granted every reward before this runs. */
export function createExpeditionRecapFoundation() {
  let recap: ExpeditionRecapModel | null = null;
  let nextId = 1;
  const listeners = new Set<Listener>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(this: void, listener: Listener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    getSnapshot(this: void): ExpeditionRecapModel | null {
      return recap;
    },

    present(this: void, completions: readonly RecapCompletion[]): void {
      if (completions.length === 0) return;
      recap = {
        id: nextId,
        items: completions.map((completion) => {
          const definition = getExpeditionDefinition(completion.expeditionId);
          if (definition === undefined) {
            throw new Error(`Unknown Expedition recap definition: ${completion.expeditionId}`);
          }
          return {
            expeditionId: completion.expeditionId,
            displayName: definition.displayName,
            durationMs: completion.durationMs,
            reward: completion.rewardSummary,
          };
        }),
      };
      nextId += 1;
      notify();
    },

    dismiss(this: void): void {
      if (recap === null) return;
      recap = null;
      notify();
    },
  };
}

export type ExpeditionRecapFoundation = ReturnType<typeof createExpeditionRecapFoundation>;
