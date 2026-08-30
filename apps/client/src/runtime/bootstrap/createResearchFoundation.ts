import type { EntityId } from "@game/core";
import {
  ResearchService,
  type CurrencyService,
  type InventoryManager,
  type RelicService,
  type ResearchCostDefinition,
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
import { DUNGEON_RELIC_ID } from "../../data/relicContentCatalog.js";
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
  const paymentPort: ResearchPaymentPort = {
    tryConsumeResearchCost(cost) {
      return tryConsumeResearchCost(dependencies, cost);
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

  if (cost.silver > 0) {
    const debit = dependencies.currencyService.debit(
      dependencies.walletId,
      "currency_silver",
      cost.silver,
    );
    if (!debit.ok) return false;
  }

  const paidMaterials: ResearchCostDefinition["materials"][number][] = [];
  for (const material of cost.materials) {
    const removed = dependencies.inventoryManager.removeQuantity(
      dependencies.productionStorageId,
      material.itemId,
      material.quantity,
    );
    if (!removed.ok) {
      rollbackResearchCost(dependencies, cost.silver, paidMaterials);
      return false;
    }
    paidMaterials.push(material);
  }

  return true;
}

function rollbackResearchCost(
  dependencies: ResearchFoundationDependencies,
  silver: number,
  paidMaterials: readonly ResearchCostDefinition["materials"][number][],
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
}

export type ResearchFoundation = ReturnType<typeof createResearchFoundation>;
