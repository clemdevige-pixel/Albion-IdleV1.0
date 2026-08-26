import type { EntityId } from "@game/core";
import type { DungeonRuntime } from "@game/gameplay";
import { getDungeonLootDefinition } from "../data/dungeonLootContentCatalog.js";
import { applyPercentBonusRounded, rollExpectedQuantity } from "./CombatRewardRuntime.js";
import type { PlayerInventoryManager } from "./PlayerInventoryManager.js";

export interface DungeonRewardDrop {
  readonly itemId: string;
  readonly kind: "artifact_fragment" | "artifact" | "enchantment_shard" | "faction_rune";
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
    private readonly inventoryManager: PlayerInventoryManager,
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

    const artifactFragmentQuantity = applyExpectedLootYield(
      encounterLoot.artifactFragmentQuantity,
      factionYieldBonusPercent,
      this.random,
    );
    if (
      artifactFragmentQuantity > 0
      && this.inventoryManager.addAccessibleQuantity(
        this.heroId,
        lootDefinition.artifactFragmentItemId,
        artifactFragmentQuantity,
      )
    ) {
      drops.push({
        itemId: lootDefinition.artifactFragmentItemId,
        kind: "artifact_fragment",
        quantity: artifactFragmentQuantity,
      });
    }

    const enchantmentShardQuantity = applyExpectedLootYield(
      encounterLoot.enchantmentShardQuantity,
      factionYieldBonusPercent,
      this.random,
    );
    if (
      enchantmentShardQuantity > 0
      && this.inventoryManager.addAccessibleQuantity(
        this.heroId,
        lootDefinition.enchantmentShardItemId,
        enchantmentShardQuantity,
      )
    ) {
      drops.push({
        itemId: lootDefinition.enchantmentShardItemId,
        kind: "enchantment_shard",
        quantity: enchantmentShardQuantity,
      });
    }

    const artifactDropChance = encounterLoot.artifactDropChance
      * (1 + Math.max(0, factionYieldBonusPercent) / 100);
    if (
      artifactDropChance > 0
      && this.random() < Math.min(1, artifactDropChance)
      && this.inventoryManager.addAccessibleQuantity(this.heroId, lootDefinition.artifactItemId, 1)
    ) {
      drops.push({ itemId: lootDefinition.artifactItemId, kind: "artifact", quantity: 1 });
    }

    const finalEncounter = dungeonDefinition.encounters[dungeonDefinition.encounters.length - 1];
    const isCompletion = finalEncounter?.id === encounter.id;
    if (isCompletion) {
      const factionRuneQuantity = applyExpectedLootYield(
        lootDefinition.completionFactionRuneQuantity,
        factionYieldBonusPercent,
        this.random,
      );
      if (
        factionRuneQuantity > 0
        && this.inventoryManager.addAccessibleQuantity(
          this.heroId,
          lootDefinition.factionRuneItemId,
          factionRuneQuantity,
        )
      ) {
        drops.push({
          itemId: lootDefinition.factionRuneItemId,
          kind: "faction_rune",
          quantity: factionRuneQuantity,
        });
      }
    }

    return {
      dungeonDefinitionId: run.definitionId,
      encounterId: encounter.id,
      drops,
      completionSilver: isCompletion
        ? applyPercentBonusRounded(lootDefinition.completionSilver, factionYieldBonusPercent)
        : 0,
    };
  }
}

function applyExpectedLootYield(
  baseQuantity: number,
  bonusPercent: number,
  random: () => number,
): number {
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) return 0;
  const base = Math.max(0, Math.round(baseQuantity));
  if (!Number.isFinite(bonusPercent) || bonusPercent <= 0) return base;
  return base + rollExpectedQuantity(baseQuantity * bonusPercent / 100, random);
}
