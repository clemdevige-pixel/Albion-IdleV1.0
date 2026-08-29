import type { ExpeditionCompletion } from "@game/gameplay";
import { getExpeditionDefinition } from "../../data/expeditionContentCatalog.js";
import { isDevSandboxMode } from "../devSandbox.js";
import type { ExpeditionRewardSummary } from "./createExpeditionFoundation.js";

export interface ExpeditionRecapItemModel {
  readonly expeditionId: string;
  readonly displayName: string;
  readonly durationMs: number;
  readonly reward: ExpeditionRewardSummary;
}

export interface ExpeditionRecapModel {
  readonly id: number;
  readonly items: readonly ExpeditionRecapItemModel[];
}

type RecapCompletion = ExpeditionCompletion<ExpeditionRewardSummary>;
type Listener = () => void;

const DEV_RECAP_DURATION_MS = 2 * 60 * 60 * 1000;
const DEV_RECAP_COMPLETIONS: readonly RecapCompletion[] = [
  {
    slotIndex: 0,
    expeditionId: "expedition_silver_t4",
    typeId: "silver",
    durationMs: DEV_RECAP_DURATION_MS,
    rewardSummary: {
      kind: "silver",
      silverCredited: 80_000,
      shardItemId: "item_resource_enchantment_shard_t4",
      shardsCredited: 92,
      quality: "reussie",
    },
  },
  {
    slotIndex: 1,
    expeditionId: "expedition_faction_t4",
    typeId: "faction",
    durationMs: DEV_RECAP_DURATION_MS,
    rewardSummary: {
      kind: "faction_rune",
      itemId: "item_resource_rune_faction_t4",
      runesCredited: 16,
      fragmentItemId: "item_resource_dungeon_key_fragment_t4",
      fragmentsCredited: 48,
      keyItemId: "item_resource_dungeon_key_t4",
      completeKeysCredited: 2,
      quality: "reussie",
    },
  },
];

/** Presentation-only store. Gameplay already granted every reward before this runs. */
export function createExpeditionRecapFoundation() {
  let recap: ExpeditionRecapModel | null = null;
  let nextId = 1;
  const listeners = new Set<Listener>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const toRecapItems = (completions: readonly RecapCompletion[]): readonly ExpeditionRecapItemModel[] => (
    completions.map((completion) => {
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
    })
  );

  const present = (completions: readonly RecapCompletion[]): void => {
    if (completions.length === 0) return;
    const items = toRecapItems(completions);
    recap = recap === null
      ? { id: nextId, items }
      : { ...recap, items: [...recap.items, ...items] };
    if (recap.id === nextId) nextId += 1;
    notify();
  };

  if (isDevSandboxMode()) {
    present(DEV_RECAP_COMPLETIONS);
  }

  return {
    subscribe(this: void, listener: Listener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    getSnapshot(this: void): ExpeditionRecapModel | null {
      return recap;
    },

    present(this: void, completions: readonly RecapCompletion[]): void {
      present(completions);
    },

    dismiss(this: void): void {
      if (recap === null) return;
      recap = null;
      notify();
    },
  };
}

export type ExpeditionRecapFoundation = ReturnType<typeof createExpeditionRecapFoundation>;
