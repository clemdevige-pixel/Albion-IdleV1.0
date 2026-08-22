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
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";

export interface ResearchFoundationDependencies {
  readonly relicService: RelicService;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryManager: InventoryManager;
  readonly productionStorageId: EntityId;
  readonly getAcademyTier: () => number;
}

type RelicGateState = "none" | "waiting" | "ready" | "examined";

function getRelicRequirement(researchId: string) {
  const definition = RESEARCH_DEFINITIONS.find((candidate) => candidate.id === researchId);
  if (definition === undefined) return undefined;
  const requirement = definition.requirements.find(
    (candidate) => candidate.type === "relic_reconstructed",
  );
  return requirement?.type === "relic_reconstructed" ? requirement : undefined;
}

/** Client composition only. Research domain stays economy/content agnostic. */
export function createResearchFoundation(dependencies: ResearchFoundationDependencies) {
  const researchServiceRef: {
    current: ResearchService<ResearchContentRequirement> | undefined;
  } = { current: undefined };

  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort: {
      isRequirementMet(requirement) {
        switch (requirement.type) {
          case "relic_reconstructed":
            return dependencies.relicService.isReconstructed(requirement.relicId);
          case "academy_tier":
            return dependencies.getAcademyTier() >= requirement.minimumTier;
          case "research_unlock":
            return researchServiceRef.current?.hasUnlock(requirement.unlockId) ?? false;
        }
      },
    },
    paymentPort: {
      tryConsumeResearchCost(cost) {
        return tryConsumeResearchCost(dependencies, cost);
      },
    },
  });
  researchServiceRef.current = researchService;

  for (const definition of RESEARCH_DEFINITIONS) {
    const result = researchService.registerResearch(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Research definition: ${definition.id} (${result.reason})`);
    }
  }

  const getRelicGateState = (researchId: string): RelicGateState => {
    const requirement = getRelicRequirement(researchId);
    if (requirement === undefined) return "none";
    const progress = dependencies.relicService.getProgress(requirement.relicId);
    if (progress?.state === "examined") return "examined";
    if (progress?.state === "charged") return "ready";
    return "waiting";
  };

  const examineRelicForResearch = (researchId: string): boolean => {
    const requirement = getRelicRequirement(researchId);
    if (requirement === undefined) return false;
    return dependencies.relicService.examineRelic(requirement.relicId).ok;
  };

  return {
    researchService,
    canReconstructRelics: () => researchService.hasUnlock(RESEARCH_UNLOCK_IDS.relicReconstruction),
    getRelicGateState,
    examineRelicForResearch,
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
