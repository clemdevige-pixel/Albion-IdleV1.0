import type { EntityId } from "@game/core";
import {
  ExpeditionService,
  type CurrencyService,
  type InventoryManager,
  type ResearchService,
  type WalletId,
} from "@game/gameplay";
import {
  EXPEDITION_DEFINITIONS,
  getExpeditionDefinition,
  getFactionExpeditionBaseRuneReward,
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
  readonly itemId: string;
  readonly runesCredited: number;
}

export type ExpeditionRewardSummary =
  | SilverExpeditionRewardSummary
  | FactionRuneExpeditionRewardSummary;

export interface ExpeditionFoundationDependencies {
  readonly researchService: ResearchService<ResearchContentRequirement>;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  /** @deprecated Ignored since Faction Expeditions no longer use faction Mastery yield. */
  readonly getFactionYieldBonusPercent?: (factionId: string) => number;
}

const FIRST_SLOT_UNLOCKS = [
  RESEARCH_UNLOCK_IDS.silverExpeditionTier4,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier5,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier6,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier7,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier8,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier4,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier5,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier6,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier7,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier8,
] as const;

export function createExpeditionFoundation(dependencies: ExpeditionFoundationDependencies) {
  const rewardLedger = new ExpeditionRewardLedger();
  const expeditionService = new ExpeditionService<
    ExpeditionContentRequirement,
    ExpeditionRewardSummary
  >({
    requirementPort: {
      isRequirementMet(requirement) {
        return dependencies.researchService.hasUnlock(requirement.unlockId);
      },
    },
    slotCapacityPort: {
      getSlotCapacity() {
        if (dependencies.researchService.hasUnlock(RESEARCH_UNLOCK_IDS.secondExpeditionSlot)) {
          return 2;
        }
        const hasFirstSlot = FIRST_SLOT_UNLOCKS.some((unlockId) => (
          dependencies.researchService.hasUnlock(unlockId)
        ));
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

        const runes = getFactionExpeditionBaseRuneReward(definition.id, durationMs);
        if (runes === undefined || !Number.isSafeInteger(runes) || runes <= 0) {
          throw new Error(`Invalid Faction Expedition reward: ${definition.id}`);
        }

        if (!dependencies.inventoryManager.canAcceptQuantity(
          dependencies.heroId,
          contentDefinition.reward.itemId,
          runes,
        )) {
          throw new Error(`Faction Expedition inventory capacity exceeded: ${definition.id}`);
        }
        const added = dependencies.inventoryManager.addQuantity(
          dependencies.heroId,
          contentDefinition.reward.itemId,
          runes,
        );
        if (!added.ok || added.value.added !== runes || added.value.remainder !== 0) {
          throw new Error(`Faction Expedition Rune credit failed: ${definition.id}`);
        }

        return {
          kind: "faction_rune",
          itemId: contentDefinition.reward.itemId,
          runesCredited: runes,
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
