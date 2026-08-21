import {
  ExpeditionService,
  type CurrencyService,
  type ResearchService,
  type WalletId,
} from "@game/gameplay";
import {
  SILVER_EXPEDITION_DEFINITIONS,
  getSilverExpeditionReward,
  type ExpeditionContentRequirement,
} from "../../data/expeditionContentCatalog.js";
import {
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";

export interface SilverExpeditionRewardSummary {
  readonly kind: "silver";
  readonly silverCredited: number;
}

export interface ExpeditionFoundationDependencies {
  readonly researchService: ResearchService<ResearchContentRequirement>;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
}

export function createExpeditionFoundation(dependencies: ExpeditionFoundationDependencies) {
  const expeditionService = new ExpeditionService<
    ExpeditionContentRequirement,
    SilverExpeditionRewardSummary
  >({
    requirementPort: {
      isRequirementMet(requirement) {
        switch (requirement.type) {
          case "research_unlock":
            return dependencies.researchService.hasUnlock(requirement.unlockId);
        }
      },
    },
    slotCapacityPort: {
      getSlotCapacity() {
        if (dependencies.researchService.hasUnlock(RESEARCH_UNLOCK_IDS.secondExpeditionSlot)) {
          return 2;
        }
        const hasFirstSlot = [
          RESEARCH_UNLOCK_IDS.expeditionTier4,
          RESEARCH_UNLOCK_IDS.expeditionTier5,
          RESEARCH_UNLOCK_IDS.expeditionTier6,
          RESEARCH_UNLOCK_IDS.expeditionTier7,
          RESEARCH_UNLOCK_IDS.expeditionTier8,
        ].some((unlockId) => dependencies.researchService.hasUnlock(unlockId));
        return hasFirstSlot ? 1 : 0;
      },
    },
    rewardPort: {
      grantCompletionReward(definition, durationMs) {
        const silver = getSilverExpeditionReward(definition.id, durationMs);
        if (silver === undefined || !Number.isSafeInteger(silver) || silver <= 0) {
          throw new Error(`Invalid Silver Expedition reward: ${definition.id}`);
        }
        const credited = dependencies.currencyService.credit(
          dependencies.walletId,
          "currency_silver",
          silver,
        );
        if (!credited.ok) {
          throw new Error(`Silver Expedition credit failed: ${definition.id}`);
        }
        return { kind: "silver", silverCredited: silver };
      },
    },
  });

  for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
    const result = expeditionService.registerExpedition(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Expedition definition: ${definition.id} (${result.reason})`);
    }
  }

  return { expeditionService };
}

export type ExpeditionFoundation = ReturnType<typeof createExpeditionFoundation>;
