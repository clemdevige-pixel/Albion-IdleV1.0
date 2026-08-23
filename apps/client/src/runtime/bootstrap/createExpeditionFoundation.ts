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
  getSilverExpeditionReward,
  isFactionExpeditionDefinition,
  type ExpeditionContentRequirement,
} from "../../data/expeditionContentCatalog.js";
import {
  rollFactionExpeditionReward,
  type FactionExpeditionResultQuality,
} from "../../data/factionExpeditionRewardContentCatalog.js";
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
  readonly fragmentItemId: string;
  readonly fragmentsCredited: number;
  readonly keyItemId: string;
  readonly completeKeysCredited: number;
  readonly quality: FactionExpeditionResultQuality;
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
  readonly random?: () => number;
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

interface QuantityReward {
  readonly itemId: string;
  readonly quantity: number;
}

function creditFactionRewards(
  inventoryManager: InventoryManager,
  heroId: EntityId,
  rewards: readonly QuantityReward[],
  expeditionId: string,
): void {
  const positiveRewards = rewards.filter(({ quantity }) => quantity > 0);
  for (const reward of positiveRewards) {
    if (!Number.isSafeInteger(reward.quantity)) {
      throw new Error(`Faction Expedition produced a non-integer reward: ${expeditionId}`);
    }
    if (!inventoryManager.canAcceptQuantity(heroId, reward.itemId, reward.quantity)) {
      throw new Error(`Faction Expedition inventory capacity exceeded: ${expeditionId}`);
    }
  }

  const credited: QuantityReward[] = [];
  try {
    for (const reward of positiveRewards) {
      const added = inventoryManager.addQuantity(heroId, reward.itemId, reward.quantity);
      if (!added.ok || added.value.added !== reward.quantity || added.value.remainder !== 0) {
        throw new Error(`Faction Expedition reward credit failed: ${expeditionId}`);
      }
      credited.push(reward);
    }
  } catch (error) {
    for (const reward of [...credited].reverse()) {
      inventoryManager.removeQuantity(heroId, reward.itemId, reward.quantity);
    }
    throw error;
  }
}

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

        const reward = rollFactionExpeditionReward(
          contentDefinition.tier,
          durationMs,
          dependencies.random ?? Math.random,
        );
        creditFactionRewards(
          dependencies.inventoryManager,
          dependencies.heroId,
          [
            { itemId: reward.runeItemId, quantity: reward.runes },
            { itemId: reward.fragmentItemId, quantity: reward.fragments },
            { itemId: reward.keyItemId, quantity: reward.completeKeys },
          ],
          definition.id,
        );

        return {
          kind: "faction_rune",
          itemId: reward.runeItemId,
          runesCredited: reward.runes,
          fragmentItemId: reward.fragmentItemId,
          fragmentsCredited: reward.fragments,
          keyItemId: reward.keyItemId,
          completeKeysCredited: reward.completeKeys,
          quality: reward.quality,
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
