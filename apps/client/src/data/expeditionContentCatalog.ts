import type {
  ExpeditionDefinition,
  ExpeditionRequirementDefinition,
} from "@game/gameplay";
import { getFactionExpeditionRewardProfile } from "./factionExpeditionRewardContentCatalog.js";
import { getFactionRuneItemId } from "./factionRuneContentCatalog.js";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

export type ExpeditionContentRequirement = ExpeditionRequirementDefinition & {
  readonly type: "research_unlock";
  readonly unlockId: string;
};

export interface SilverExpeditionContentDefinition
  extends ExpeditionDefinition<ExpeditionContentRequirement> {
  readonly reward: {
    readonly kind: "silver";
    readonly silverPerHour: number;
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
  | SilverExpeditionContentDefinition
  | FactionExpeditionContentDefinition;

export interface ExpeditionPresentationInfo {
  readonly categoryLabel: "Silver" | "Faction";
  readonly description: string;
  readonly rewardSummary: string;
}

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

export const SILVER_EXPEDITION_DEFINITIONS = [
  { tier: 4, silverPerHour: 15_000 },
  { tier: 5, silverPerHour: 25_000 },
  { tier: 6, silverPerHour: 35_000 },
  { tier: 7, silverPerHour: 40_000 },
  { tier: 8, silverPerHour: 50_000 },
].map(({ tier, silverPerHour }) => ({
  id: `expedition_silver_t${String(tier)}`,
  typeId: SILVER_EXPEDITION_TYPE_ID,
  displayName: `Expédition d'argent T${String(tier)}`,
  tier,
  requirements: [{ type: "research_unlock", unlockId: SILVER_TIER_UNLOCKS[tier as ExpeditionTier] }],
  reward: { kind: "silver", silverPerHour },
})) satisfies readonly SilverExpeditionContentDefinition[];

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
  return {
    categoryLabel: "Silver",
    description: "Expédition passive dédiée au Silver. Elle peut progresser pendant les autres activités et hors ligne.",
    rewardSummary: `Produit ${String(definition.reward.silverPerHour)} Silver/h.`,
  };
}

export function getSilverExpeditionReward(
  expeditionId: string,
  durationMs: number,
): number | undefined {
  const definition = SILVER_EXPEDITION_DEFINITIONS.find((entry) => entry.id === expeditionId);
  if (definition === undefined) return undefined;
  return getHourlyReward(definition.reward.silverPerHour, durationMs);
}

function getHourlyReward(ratePerHour: number, durationMs: number): number | undefined {
  const hours = durationMs / (60 * 60 * 1000);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  return ratePerHour * hours;
}
