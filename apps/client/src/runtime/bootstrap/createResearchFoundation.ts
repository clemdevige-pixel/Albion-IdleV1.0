import type { EntityId } from "@game/core";
import {
  ResearchService,
  type CurrencyService,
  type InventoryManager,
  type RelicService,
  type ResearchCostDefinition,
  type WalletId,
} from "@game/gameplay";
import {
  RESEARCH_DEFINITIONS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";

export interface ResearchFoundationDependencies {
  readonly relicService: RelicService;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryManager: InventoryManager;
  readonly productionStorageId: EntityId;
}

/** Client composition only. Research domain stays economy/content agnostic. */
export function createResearchFoundation(dependencies: ResearchFoundationDependencies) {
  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort: {
      isRequirementMet(requirement) {
        switch (requirement.type) {
          case "relic_reconstructed":
            return dependencies.relicService.isReconstructed(requirement.relicId);
        }
      },
    },
    paymentPort: {
      tryConsumeResearchCost(cost) {
        return tryConsumeResearchCost(dependencies, cost);
      },
    },
  });

  for (const definition of RESEARCH_DEFINITIONS) {
    const result = researchService.registerResearch(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Research definition: ${definition.id} (${result.reason})`);
    }
  }

  return { researchService };
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
