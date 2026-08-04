import type { EntityId } from "@game/core";
import type { LootGenerator } from "./loot-generator.js";
import type { LootResult, LootTableLike } from "./types.js";

export class LootManager {
  readonly #lootGenerator: LootGenerator;
  readonly #cache = new Map<EntityId, LootResult>();

  constructor(lootGenerator: LootGenerator) {
    this.#lootGenerator = lootGenerator;
  }

  /**
   * Resolves loot per AI_BIBLE 14_LOOT_SYSTEM. The hybrid loot model (§4)
   * performs one independent roll per provided table — typically the monster
   * loot table plus the global loot pool — and the final loot is the union of
   * all rolls.
   */
  generateLoot(
    entityId: EntityId,
    lootTable: LootTableLike,
    ...additionalTables: readonly LootTableLike[]
  ): LootResult {
    const guaranteedSet = new Set<string>();
    const merged = new Map<string, number>();

    for (const table of [lootTable, ...additionalTables]) {
      for (const id of table.guaranteedDrops) guaranteedSet.add(id);
      for (const drop of this.#lootGenerator.generateLoot(table)) {
        merged.set(drop.itemId, (merged.get(drop.itemId) ?? 0) + drop.quantity);
      }
    }

    const allDrops = [...merged.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
    const guaranteedDrops = allDrops.filter((d) => guaranteedSet.has(d.itemId));
    const drops = allDrops.filter((d) => !guaranteedSet.has(d.itemId));

    const result: LootResult = { entityId, drops, guaranteedDrops };
    this.#cache.set(entityId, result);
    return result;
  }

  getLoot(entityId: EntityId): LootResult | undefined {
    return this.#cache.get(entityId);
  }
}
