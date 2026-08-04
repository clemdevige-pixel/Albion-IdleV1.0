import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import type { LootDrop, LootResult } from "./types.js";

export interface LootTransferItemOutcome {
  readonly itemId: string;
  readonly requested: number;
  readonly added: number;
  readonly remainder: number;
}

export type LootTransferStatus = "complete" | "partial" | "failed";

export interface LootTransferOutcome {
  readonly receiverEntityId: EntityId;
  readonly status: LootTransferStatus;
  readonly items: readonly LootTransferItemOutcome[];
}

/**
 * Bridges the Loot System to the Inventory System (14_LOOT_SYSTEM §16).
 * Transfers go exclusively through InventoryManager.addQuantity so every
 * inventory validation applies; untransferred remainder is reported, never
 * discarded (§16: "Loot generation never discards valid rewards" — Bank
 * overflow is future work per 12_INVENTORY §10).
 */
export class LootTransferService {
  readonly #inventoryManager: InventoryManager;

  constructor(inventoryManager: InventoryManager) {
    this.#inventoryManager = inventoryManager;
  }

  transferLoot(receiverEntityId: EntityId, lootResult: LootResult): LootTransferOutcome {
    const items: LootTransferItemOutcome[] = [];

    for (const drop of [...lootResult.guaranteedDrops, ...lootResult.drops]) {
      items.push(this.#transferDrop(receiverEntityId, drop));
    }

    return {
      receiverEntityId,
      status: this.#statusOf(items),
      items,
    };
  }

  #transferDrop(receiverEntityId: EntityId, drop: LootDrop): LootTransferItemOutcome {
    const result = this.#inventoryManager.addQuantity(receiverEntityId, drop.itemId, drop.quantity);
    if (!result.ok) {
      return {
        itemId: drop.itemId,
        requested: drop.quantity,
        added: 0,
        remainder: drop.quantity,
      };
    }
    return {
      itemId: drop.itemId,
      requested: result.value.requested,
      added: result.value.added,
      remainder: result.value.remainder,
    };
  }

  #statusOf(items: readonly LootTransferItemOutcome[]): LootTransferStatus {
    if (items.every((item) => item.remainder === 0)) {
      return "complete";
    }
    if (items.every((item) => item.added === 0)) {
      return "failed";
    }
    return "partial";
  }
}
