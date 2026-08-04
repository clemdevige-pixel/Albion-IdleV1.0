import { defineComponent } from "@game/core";
import type { InventoryEntry } from "./types.js";

export interface InventoryData {
  /** Base capacity before the active bag bonus (12_INVENTORY §4). */
  readonly capacity: number;
  readonly slots: Map<number, InventoryEntry>;
  /**
   * The one item occupying the dedicated Bag Slot (12_INVENTORY §3/§5). The
   * Bag Slot belongs to the Inventory System and is not an equipment slot.
   */
  activeBag: InventoryEntry | undefined;
  /** Monotonic counter backing deterministic instance id generation. */
  nextInstanceCounter: number;
}

export const InventoryComponent = defineComponent<InventoryData>("inventory");
