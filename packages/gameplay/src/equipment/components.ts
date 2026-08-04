import { defineComponent } from "@game/core";
import type { InventoryEntry } from "../inventory/types.js";
import type { EquipmentSlot } from "./types.js";

export interface EquipmentData {
  /** Worn items keep their inventory entry (instanceId) for persistence. */
  readonly slots: Map<EquipmentSlot, InventoryEntry>;
}

export const EquipmentComponent = defineComponent<EquipmentData>("equipment");
