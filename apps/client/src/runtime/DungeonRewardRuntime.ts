import type { EntityId } from "@game/core";
import type { DungeonRuntime, InventoryManager } from "@game/gameplay";
import { getDungeonLootDefinition } from "../data/dungeonLootContentCatalog.js";
import { applyPercentBonusRounded } from "./CombatRewardRuntime.js";

export interface DungeonRewardDrop {
  readonly itemId: string;
  readonly kind: "artifact_fragment" | "artifact" | "enchantment_shard";
  readonly quantity: number;
}

export interface DungeonEncounterRewardResult {
  readonly dungeonDefinitionId: string;
  readonly encounterId: string;
  readonly drops: readonly DungeonRewardDrop[];
  /** Granted once, on the final authored encounter victory. */
  readonly completionSilver: number;
}

/** Resolves only dungeon-specific rewards; wallet credit remains owned by CombatRewardRuntime. */
export class DungeonRewardRuntime {
  constructor(
    private readonly dungeonRuntime: DungeonRuntime,
    private readonly inventoryManager: InventoryManager,
    private readonly heroId: EntityId,
    private readonly random: () => number = Math.random,
  ) {}

  processCurrentEncounterVictory(
    getFactionYieldBonusPercent: (factionId: string) => number = () => 0,
  ): DungeonEncounterRewardResult | undefined {
    const run = this.dungeonRuntime.activeRun;
    const encounter = this.dungeonRuntime.getActiveEncounter();
    if (run === undefined || run.status !== "active" || encounter === undefined) return undefined;

    const dungeonDefinition = this.dungeonRuntime.getDefinition(run.definitionId);
    if (dungeonDefinition === undefined) {
      throw new Error(`Unknown active dungeon definition: ${run.definitionId}`);
    }

    const lootDefinition = getDungeonLootDefinition(dungeonDefinition.lootTableId);
    const factionYieldBonusPercent = getFactionYieldBonusPercent(lootDefinition.faction);
    const encounterLoot = lootDefinition.encounters[encounter.kind];
    const drops: DungeonRewardDrop[] = [];

    const artifactFragmentQuantity = applyPercentBonusRounded(
      encounterLoot.artifactFragmentQuantity,
      factionYieldBonusPercent,
    );
    if (artifactFragmentQuantity > 0) {
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        lootDefinition.artifactFragmentItemId,
        artifactFragmentQuantity,
      );
      if (added.ok && added.value.added > 0) {
        drops.push({
          itemId: lootDefinition.artifactFragmentItemId,
          kind: "artifact_fragment",
          quantity: added.value.added,
        });
      }
    }

    const enchantmentShardQuantity = applyPercentBonusRounded(
      encounterLoot.enchantmentShardQuantity,
      factionYieldBonusPercent,
    );
    if (enchantmentShardQuantity > 0) {
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        lootDefinition.enchantmentShardItemId,
        enchantmentShardQuantity,
      );
      if (added.ok && added.value.added > 0) {
        drops.push({
          itemId: lootDefinition.enchantmentShardItemId,
          kind: "enchantment_shard",
          quantity: added.value.added,
        });
      }
    }

    const artifactDropChance = encounterLoot.artifactDropChance
      * (1 + Math.max(0, factionYieldBonusPercent) / 100);
    if (artifactDropChance > 0 && this.random() < Math.min(1, artifactDropChance)) {
      const added = this.inventoryManager.addQuantity(this.heroId, lootDefinition.artifactItemId, 1);
      if (added.ok && added.value.added > 0) {
        drops.push({ itemId: lootDefinition.artifactItemId, kind: "artifact", quantity: added.value.added });
      }
    }

    const finalEncounter = dungeonDefinition.encounters[dungeonDefinition.encounters.length - 1];
    return {
      dungeonDefinitionId: run.definitionId,
      encounterId: encounter.id,
      drops,
      completionSilver: finalEncounter?.id === encounter.id
        ? applyPercentBonusRounded(lootDefinition.completionSilver, factionYieldBonusPercent)
        : 0,
    };
  }
}
