import type { EntityId } from "@game/core";
import {
  ExpeditionService,
  type CurrencyService,
  type InventoryManager,
  type RelicService,
  type ResearchService,
  type WalletId,
} from "@game/gameplay";
import {
  EXPEDITION_DEFINITIONS,
  getExpeditionDefinition,
  getFactionExpeditionBaseRuneReward,
  getFactionExpeditionRuneReward,
  getSilverExpeditionReward,
  isFactionExpeditionDefinition,
  type ExpeditionContentRequirement,
} from "../../data/expeditionContentCatalog.js";
import {
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";
import { ExpeditionRewardLedger } from "../ExpeditionRewardLedger.js";

export interface SilverExpeditionRewardSummary {
  readonly kind: "silver";
  readonly silverCredited: number;
}

export interface FactionRuneExpeditionRewardSummary {
  readonly kind: "faction_rune";
  readonly factionId: string;
  readonly itemId: string;
  readonly baseRunes: number;
  readonly masteryBonusPercent: number;
  readonly finalRunes: number;
}

export type ExpeditionRewardSummary =
  | SilverExpeditionRewardSummary
  | FactionRuneExpeditionRewardSummary;

export interface ExpeditionFoundationDependencies {
  readonly researchService: ResearchService<ResearchContentRequirement>;
  readonly relicService: Pick<RelicService, "isExamined">;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  readonly getFactionYieldBonusPercent: (factionId: string) => number;
}

export function createExpeditionFoundation(dependencies: ExpeditionFoundationDependencies) {
  const rewardLedger = new ExpeditionRewardLedger();
  const expeditionService = new ExpeditionService<
    ExpeditionContentRequirement,
    ExpeditionRewardSummary
  >({
    requirementPort: {
      isRequirementMet(requirement) {
        switch (requirement.type) {
          case "research_unlock":
            return dependencies.researchService.hasUnlock(requirement.unlockId);
          case "relic_examined":
            return dependencies.relicService.isExamined(requirement.relicId);
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
        const contentDefinition = getExpeditionDefinition(definition.id);
        if (contentDefinition === undefined) {
          throw new Error(`Unknown authored Expedition definition: ${definition.id}`);
        }

        if (!isFactionExpeditionDefinition(contentDefinition)) {
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
          rewardLedger.recordSilverCredited(silver);
          return { kind: "silver", silverCredited: silver };
        }

        const baseRunes = getFactionExpeditionBaseRuneReward(definition.id, durationMs);
        const masteryBonusPercent = dependencies.getFactionYieldBonusPercent(
          contentDefinition.factionId,
        );
        const finalRunes = getFactionExpeditionRuneReward(
          definition.id,
          durationMs,
          masteryBonusPercent,
        );
        if (
          baseRunes === undefined
          || finalRunes === undefined
          || !Number.isSafeInteger(finalRunes)
          || finalRunes <= 0
        ) {
          throw new Error(`Invalid Faction Expedition reward: ${definition.id}`);
        }

        // Runes are player inventory items, never Production Storage resources.
        // Preflight keeps reward credit all-or-nothing if the inventory is full.
        if (!dependencies.inventoryManager.canAcceptQuantity(
          dependencies.heroId,
          contentDefinition.reward.itemId,
          finalRunes,
        )) {
          throw new Error(`Faction Expedition inventory capacity exceeded: ${definition.id}`);
        }
        const added = dependencies.inventoryManager.addQuantity(
          dependencies.heroId,
          contentDefinition.reward.itemId,
          finalRunes,
        );
        if (
          !added.ok
          || added.value.added !== finalRunes
          || added.value.remainder !== 0
        ) {
          throw new Error(`Faction Expedition Rune credit failed: ${definition.id}`);
        }

        return {
          kind: "faction_rune",
          factionId: contentDefinition.factionId,
          itemId: contentDefinition.reward.itemId,
          baseRunes,
          masteryBonusPercent,
          finalRunes,
        };
      },
    },
  });

  for (const definition of EXPEDITION_DEFINITIONS) {
    const result = expeditionService.registerExpedition(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Expedition definition: ${definition.id} (${result.reason})`);
    }
  }

  return { expeditionService, rewardLedger };
}

export type ExpeditionFoundation = ReturnType<typeof createExpeditionFoundation>;
