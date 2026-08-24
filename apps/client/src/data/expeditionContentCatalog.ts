import { getFactionRuneItemId } from "@game/data";
import type {
  ExpeditionDefinition,
  ExpeditionRequirementDefinition,
} from "@game/gameplay";
import { getFactionExpeditionRewardProfile } from "./factionExpeditionRewardContentCatalog.js";
import { getGeneralistExpeditionRewardProfile } from "./generalistExpeditionRewardContentCatalog.js";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

export type ExpeditionContentRequirement = ExpeditionRequirementDefinition & {
  readonly type: "research_unlock";
  readonly unlockId: string;
};

/** Internal IDs retain the historical `silver` name for save/unlock compatibility. */
export interface GeneralistExpeditionContentDefinition
  extends ExpeditionDefinition<ExpeditionContentRequirement> {
  readonly reward: {
    readonly kind: "silver";
    readonly silverPerHour: number;
    readonly shardsPerHour: number;
  };
}

export interface FactionExpeditionContentDefinition
  extends ExpeditionDefinition<ExpeditionContentRequirement> {
  readonly reward: {
    readonly kind: "faction_rune";
    readonly itemId: string;
    readonly runesPerHour: number;
  };
}

export type ExpeditionContentDefinition =
  | GeneralistExpeditionContentDefinition
  | FactionExpeditionContentDefinition;

export interface ExpeditionPresentationInfo {
  readonly categoryLabel: "Généraliste" | "Faction";
  readonly description: string;
  readonly rewardSummary: string;
}

/** Compatibility IDs: do not rename without a save migration. */
export const SILVER_EXPEDITION_TYPE_ID = "silver";
export const FACTION_EXPEDITION_TYPE_ID = "faction";
const EXPEDITION_TIERS = [4, 5, 6, 7, 8] as const;
type ExpeditionTier = (typeof EXPEDITION_TIERS)[number];

const SILVER_TIER_UNLOCKS: Readonly<Record<ExpeditionTier, string>> = {
  4: RESEARCH_UNLOCK_IDS.silverExpeditionTier4,
  5: RESEARCH_UNLOCK_IDS.silverExpeditionTier5,
  6: RESEARCH_UNLOCK_IDS.silverExpeditionTier6,
  7: RESEARCH_UNLOCK_IDS.silverExpeditionTier7,
  8: RESEARCH_UNLOCK_IDS.silverExpeditionTier8,
};

const FACTION_TIER_UNLOCKS: Readonly<Record<ExpeditionTier, string>> = {
  4: RESEARCH_UNLOCK_IDS.factionExpeditionTier4,
  5: RESEARCH_UNLOCK_IDS.factionExpeditionTier5,
  6: RESEARCH_UNLOCK_IDS.factionExpeditionTier6,
  7: RESEARCH_UNLOCK_IDS.factionExpeditionTier7,
  8: RESEARCH_UNLOCK_IDS.factionExpeditionTier8,
};

/**
 * Player-facing Generalist Expedition. Historical silver IDs are intentionally
 * preserved so existing saves and Research unlocks remain valid.
 */
export const SILVER_EXPEDITION_DEFINITIONS: readonly GeneralistExpeditionContentDefinition[] = (
  EXPEDITION_TIERS.map((tier) => {
    const profile = getGeneralistExpeditionRewardProfile(tier);
    return {
      id: `expedition_silver_t${String(tier)}`,
      typeId: SILVER_EXPEDITION_TYPE_ID,
      displayName: `Expédition généraliste T${String(tier)}`,
      tier,
      requirements: [{ type: "research_unlock", unlockId: SILVER_TIER_UNLOCKS[tier] }],
      reward: {
        kind: "silver",
        silverPerHour: profile.silverPerHour,
        shardsPerHour: profile.shardsPerHour,
      },
    };
  })
);

/** One generic Faction Expedition per tier. Reward tuning is owned by the dedicated reward catalog. */
export const FACTION_EXPEDITION_DEFINITIONS: readonly FactionExpeditionContentDefinition[] = (
  EXPEDITION_TIERS.map((tier) => ({
    id: `expedition_faction_t${String(tier)}`,
    typeId: FACTION_EXPEDITION_TYPE_ID,
    displayName: `Expédition de faction T${String(tier)}`,
    tier,
    requirements: [
      { type: "research_unlock", unlockId: FACTION_TIER_UNLOCKS[tier] },
    ],
    reward: {
      kind: "faction_rune",
      itemId: getFactionRuneItemId(tier),
      runesPerHour: getFactionExpeditionRewardProfile(tier).runesPerHour,
    },
  }))
);

export const EXPEDITION_DEFINITIONS: readonly ExpeditionContentDefinition[] = [
  ...SILVER_EXPEDITION_DEFINITIONS,
  ...FACTION_EXPEDITION_DEFINITIONS,
];

export function isFactionExpeditionDefinition(
  definition: ExpeditionContentDefinition,
): definition is FactionExpeditionContentDefinition {
  return definition.reward.kind === "faction_rune";
}

export function getExpeditionDefinition(
  expeditionId: string,
): ExpeditionContentDefinition | undefined {
  return EXPEDITION_DEFINITIONS.find((definition) => definition.id === expeditionId);
}

export function getExpeditionPresentationInfo(
  expeditionId: string,
): ExpeditionPresentationInfo | undefined {
  const definition = getExpeditionDefinition(expeditionId);
  if (definition === undefined) return undefined;
  if (isFactionExpeditionDefinition(definition)) {
    const profile = getFactionExpeditionRewardProfile(definition.tier);
    return {
      categoryLabel: "Faction",
      description: "Expédition passive de faction. Elle peut progresser pendant les autres activités et hors ligne.",
      rewardSummary: `Moyenne : ${String(profile.runesPerHour)} runes/h, ${String(profile.fragmentsPerHour)} fragments/h et ${String(profile.completeKeysPerHourEv)} clé/h (EV). Chaque retour est variable.`,
    };
  }

  const profile = getGeneralistExpeditionRewardProfile(definition.tier);
  return {
    categoryLabel: "Généraliste",
    description: "Expédition passive généraliste dédiée au Silver et aux éclats d’enchantement. Elle progresse pendant les autres activités et hors ligne.",
    rewardSummary: `Moyenne : ${String(profile.silverPerHour)} Silver/h et ${String(profile.shardsPerHour)} éclats T${String(definition.tier)}/h. Chaque retour est variable.`,
  };
}
