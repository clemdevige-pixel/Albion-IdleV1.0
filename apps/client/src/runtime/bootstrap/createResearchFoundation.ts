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

export type RelicGateState = "none" | "waiting" | "ready" | "examined";

function getRelicRequirement(researchId: string) {
  const definition = RESEARCH_DEFINITIONS.find((candidate) => candidate.id === researchId);
  if (definition === undefined) return undefined;
  const requirement = definition.requirements.find(
    (candidate) => candidate.type === "relic_examined",
  );
  return requirement?.type === "relic_examined" ? requirement : undefined;
}

export class AcademyResearchService extends ResearchService<ResearchContentRequirement> {
  readonly #relicService: RelicService;

  constructor(
    requirementPort: ResearchRequirementPort<ResearchContentRequirement>,
    paymentPort: ResearchPaymentPort,
    relicService: RelicService,
  ) {
    super({ requirementPort, paymentPort });
    this.#relicService = relicService;
  }

  isRelicExamined(relicId: string): boolean {
    return this.#relicService.isExamined(relicId);
  }

  getRelicGateState(researchId: string): RelicGateState {
    const requirement = getRelicRequirement(researchId);
    if (requirement === undefined) return "none";
    const progress = this.#relicService.getProgress(requirement.relicId);
    if (progress?.state === "examined") return "examined";
    if (progress?.state === "charged") {
      return this.hasUnlock(RESEARCH_UNLOCK_IDS.relicReconstruction) ? "ready" : "none";
    }
    return "waiting";
  }

  examineRelicForResearch(researchId: string): boolean {
    const requirement = getRelicRequirement(researchId);
    if (requirement === undefined) return false;
    return this.#relicService.examineRelic(requirement.relicId).ok;
  }
}

/** Client composition only. Research domain stays economy/content agnostic. */
export function createResearchFoundation(dependencies: ResearchFoundationDependencies) {
  const researchServiceRef: {
    current: AcademyResearchService | undefined;
  } = { current: undefined };

  const requirementPort: ResearchRequirementPort<ResearchContentRequirement> = {
    isRequirementMet(requirement) {
      switch (requirement.type) {
        case "relic_examined":
          return dependencies.relicService.isExamined(requirement.relicId);
        case "academy_tier":
          return dependencies.getAcademyTier() >= requirement.minimumTier;
        case "research_unlock":
          return researchServiceRef.current?.hasUnlock(requirement.unlockId) ?? false;
      }
    },
  };
  const paymentPort: ResearchPaymentPort = {
    tryConsumeResearchCost(cost) {
      return tryConsumeResearchCost(dependencies, cost);
    },
  };
  const researchService = new AcademyResearchService(
    requirementPort,
    paymentPort,
    dependencies.relicService,
  );
  researchServiceRef.current = researchService;

  for (const definition of RESEARCH_DEFINITIONS) {
    const result = researchService.registerResearch(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Research definition: ${definition.id} (${result.reason})`);
    }
  }

  return {
    researchService,
    canReconstructRelics: () => researchService.hasUnlock(RESEARCH_UNLOCK_IDS.relicReconstruction),
    // Compatibility adapter for the current composition root; presentation uses
    // the richer service-level gate state when available.
    isWaitingForRelic: (researchId: string): boolean => (
      researchService.getRelicGateState(researchId) === "waiting"
    ),
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
