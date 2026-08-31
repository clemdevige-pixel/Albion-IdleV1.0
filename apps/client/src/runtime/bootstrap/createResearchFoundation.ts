import type { EntityId } from "@game/core";
import {
  ResearchService,
  type CurrencyService,
  type InventoryEntry,
  type InventoryManager,
  type RelicService,
  type ResearchCostDefinition,
  type ResearchDefinition,
  type ResearchPaymentPort,
  type ResearchRequirementPort,
  type WalletId,
} from "@game/gameplay";
import {
  RESEARCH_DEFINITIONS,
  RESEARCH_IDS,
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";
import {
  DUNGEON_RELIC_ID,
  RELIC_DEFINITIONS,
} from "../../data/relicContentCatalog.js";
import { isDevSandboxMode } from "../devSandbox.js";

export interface ResearchFoundationDependencies {
  readonly relicService: RelicService;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryManager: InventoryManager;
  readonly productionStorageId: EntityId;
  readonly getAcademyTier: () => number;
  readonly isWorldProgressionComplete: () => boolean;
}

interface RemovedResearchItem {
  readonly ownerId: EntityId;
  readonly position: number;
  readonly entry: InventoryEntry;
}

function hasDiscoveredEnchantmentShard(inventoryManager: InventoryManager): boolean {
  for (const inventoryId of inventoryManager.listInventories()) {
    if (
      inventoryManager.listSlots(inventoryId).some((slot) => (
        slot.entry?.itemId.startsWith("item_resource_enchantment_shard_t") === true
      ))
    ) return true;
  }
  return false;
}

/** Client composition only. Research domain stays economy/content agnostic. */
export function createResearchFoundation(dependencies: ResearchFoundationDependencies) {
  const researchServiceRef: {
    current: ResearchService<ResearchContentRequirement> | undefined;
  } = { current: undefined };

  const requirementPort: ResearchRequirementPort<ResearchContentRequirement> = {
    isRequirementMet(requirement) {
      switch (requirement.type) {
        case "relic_charged":
          return dependencies.relicService.getProgress(requirement.relicId)?.state === "charged"
            || dependencies.relicService.isExamined(requirement.relicId);
        case "academy_tier":
          return dependencies.getAcademyTier() >= requirement.minimumTier;
        case "research_unlock":
          return researchServiceRef.current?.hasUnlock(requirement.unlockId) ?? false;
        case "enchantment_shard_discovered":
          return hasDiscoveredEnchantmentShard(dependencies.inventoryManager);
        case "world_progression_complete":
          return dependencies.isWorldProgressionComplete();
      }
    },
  };
  const paymentPort: ResearchPaymentPort<ResearchContentRequirement> = {
    tryConsumeResearchCost(cost, definition) {
      return tryConsumeResearchCost(dependencies, cost, definition);
    },
  };
  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort,
    paymentPort,
  });
  researchServiceRef.current = researchService;

  for (const definition of RESEARCH_DEFINITIONS) {
    const result = researchService.registerResearch(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Research definition: ${definition.id} (${result.reason})`);
    }
  }

  if (isDevSandboxMode()) {
    researchService.load({
      version: 1,
      completedResearchIds: RESEARCH_DEFINITIONS.map((definition) => definition.id),
      activeResearch: null,
    });
  }

  const reconcileResearchEffects = (): void => {
    if (!researchService.hasUnlock(RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed)) return;
    if (dependencies.relicService.isExamined(DUNGEON_RELIC_ID)) return;
    const progress = dependencies.relicService.getProgress(DUNGEON_RELIC_ID);
    if (progress?.state !== "charged") return;
    dependencies.relicService.examineRelic(DUNGEON_RELIC_ID);
  };

  researchService.onCompleted((researchId) => {
    if (researchId === RESEARCH_IDS.dungeonRelicAnalysis) reconcileResearchEffects();
  });

  return {
    researchService,
    reconcileResearchEffects,
  };
}

function tryConsumeResearchCost(
  dependencies: ResearchFoundationDependencies,
  cost: ResearchCostDefinition,
  definition: ResearchDefinition<ResearchContentRequirement>,
): boolean {
  const balance = dependencies.currencyService.getBalance(
    dependencies.walletId,
    "currency_silver",
  );
  if (!balance.ok || balance.value < cost.silver) return false;

  for (const material of cost.materials) {
    if (
      dependencies.inventoryManager.getTotalQuantity(
        dependencies.productionStorageId,
        material.itemId,
      ) < material.quantity
    ) return false;
  }

  const consumableRelics = resolveConsumableRelics(dependencies, definition);
  if (consumableRelics === undefined) return false;

  const removedRelics: RemovedResearchItem[] = [];
  for (const relic of consumableRelics) {
    const removed = dependencies.inventoryManager.removeEntryAt(relic.ownerId, relic.position);
    if (!removed.ok || removed.value.instanceId !== relic.entry.instanceId) {
      rollbackRemovedResearchItems(dependencies.inventoryManager, removedRelics);
      return false;
    }
    removedRelics.push({ ...relic, entry: removed.value });
  }

  if (cost.silver > 0) {
    const debit = dependencies.currencyService.debit(
      dependencies.walletId,
      "currency_silver",
      cost.silver,
    );
    if (!debit.ok) {
      rollbackRemovedResearchItems(dependencies.inventoryManager, removedRelics);
      return false;
    }
  }

  const paidMaterials: ResearchCostDefinition["materials"][number][] = [];
  for (const material of cost.materials) {
    const removed = dependencies.inventoryManager.removeQuantity(
      dependencies.productionStorageId,
      material.itemId,
      material.quantity,
    );
    if (!removed.ok) {
      rollbackResearchCost(dependencies, cost.silver, paidMaterials, removedRelics);
      return false;
    }
    paidMaterials.push(material);
  }

  return true;
}

function resolveConsumableRelics(
  dependencies: ResearchFoundationDependencies,
  definition: ResearchDefinition<ResearchContentRequirement>,
): readonly RemovedResearchItem[] | undefined {
  const relicIds = [...new Set(definition.requirements.flatMap((requirement) => (
    requirement.type === "relic_charged" && requirement.consumeOnStart === true
      ? [requirement.relicId]
      : []
  )))];
  const resolved: RemovedResearchItem[] = [];

  for (const relicId of relicIds) {
    const relicDefinition = RELIC_DEFINITIONS.find((candidate) => candidate.id === relicId);
    if (relicDefinition === undefined) return undefined;

    let match: RemovedResearchItem | undefined;
    for (const ownerId of dependencies.inventoryManager.listInventories()) {
      const slot = dependencies.inventoryManager.findEntriesByItemId(
        ownerId,
        relicDefinition.inventoryItemId,
      )[0];
      if (slot?.entry === undefined) continue;
      match = { ownerId, position: slot.position, entry: slot.entry };
      break;
    }
    if (match === undefined) return undefined;
    resolved.push(match);
  }

  return resolved;
}

function rollbackResearchCost(
  dependencies: ResearchFoundationDependencies,
  silver: number,
  paidMaterials: readonly ResearchCostDefinition["materials"][number][],
  removedItems: readonly RemovedResearchItem[] = [],
): void {
  if (silver > 0) {
    const refund = dependencies.currencyService.credit(
      dependencies.walletId,
      "currency_silver",
      silver,
    );
    if (!refund.ok) throw new Error("Research Silver rollback failed");
  }

  for (const material of paidMaterials) {
    const restored = dependencies.inventoryManager.addQuantity(
      dependencies.productionStorageId,
      material.itemId,
      material.quantity,
      { itemId: material.itemId, stackable: true, maxStack: 999 },
    );
    if (!restored.ok || restored.value.remainder !== 0) {
      throw new Error(`Research material rollback failed for ${material.itemId}`);
    }
  }

  rollbackRemovedResearchItems(dependencies.inventoryManager, removedItems);
}

function rollbackRemovedResearchItems(
  inventoryManager: InventoryManager,
  removedItems: readonly RemovedResearchItem[],
): void {
  for (const removed of [...removedItems].reverse()) {
    const preferred = inventoryManager.getSlot(removed.ownerId, removed.position);
    const restored = preferred.ok && preferred.value.entry === undefined
      ? inventoryManager.insertEntry(removed.ownerId, removed.entry, removed.position)
      : inventoryManager.insertEntry(removed.ownerId, removed.entry);
    if (!restored.ok) {
      throw new Error(`Research item rollback failed for ${removed.entry.itemId}`);
    }
  }
}

export type ResearchFoundation = ReturnType<typeof createResearchFoundation>;
