import type { SaveProvider } from "@game/persistence";
import type { ItemInstanceId } from "../inventory/types.js";
import { isValidDurabilityPair, type DurabilityStore } from "./durability-store.js";

interface SavedDurability {
  instanceId: string;
  current: number;
  max: number;
}

interface DurabilitySavePayload {
  durabilities: SavedDurability[];
}

/**
 * Dedicated provider so durability persists without touching the certified
 * inventory/equipment payloads (37_SAVE_SYSTEM). Destroyed items are never
 * saved and can therefore never be restored.
 */
export class DurabilitySaveProvider implements SaveProvider {
  readonly providerId = "durability";

  constructor(private readonly store: DurabilityStore) {}

  save(): unknown {
    const durabilities: SavedDurability[] = [];
    for (const [instanceId, state] of this.store.entries()) {
      durabilities.push({ instanceId, current: state.current, max: state.max });
    }
    return { durabilities } satisfies DurabilitySavePayload;
  }

  load(data: unknown): void {
    const payload = data as DurabilitySavePayload;
    for (const saved of payload.durabilities) {
      if (saved.instanceId.length === 0) {
        throw new Error("Invalid durability save data: empty instanceId");
      }
      if (!isValidDurabilityPair(saved.current, saved.max)) {
        throw new Error(
          `Invalid durability save data: ${saved.instanceId} ` +
            `${String(saved.current)}/${String(saved.max)}`,
        );
      }
      const restored = this.store._restore(
        saved.instanceId as ItemInstanceId,
        saved.current,
        saved.max,
      );
      if (!restored.ok) {
        throw new Error(`Invalid durability save data: duplicate ${saved.instanceId}`);
      }
    }
  }
}
