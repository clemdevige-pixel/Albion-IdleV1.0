import type { Rng } from "@game/core";
import type { LootDrop, LootTableLike } from "./types.js";

export class LootGenerator {
  readonly #rng: Rng;

  constructor(rng: Rng) {
    this.#rng = rng;
  }

  generateLoot(lootTable: LootTableLike): readonly LootDrop[] {
    const dropMap = new Map<string, number>();

    for (const itemId of lootTable.guaranteedDrops) {
      dropMap.set(itemId, (dropMap.get(itemId) ?? 0) + 1);
    }

    const totalWeight = lootTable.entries.reduce((sum, e) => sum + e.weight, 0);

    if (totalWeight > 0 && lootTable.entries.length > 0) {
      for (let roll = 0; roll < lootTable.maxRolls; roll++) {
        const pick = this.#rng.nextFloat() * totalWeight;
        let accumulated = 0;

        for (const entry of lootTable.entries) {
          accumulated += entry.weight;
          if (pick < accumulated) {
            const qty =
              entry.minQuantity === entry.maxQuantity
                ? entry.minQuantity
                : this.#rng.nextInt(entry.minQuantity, entry.maxQuantity + 1);
            dropMap.set(entry.itemId, (dropMap.get(entry.itemId) ?? 0) + qty);
            break;
          }
        }
      }
    }

    return [...dropMap.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
  }
}
