import type {
  ExpeditionDefinition,
  ExpeditionRequirementDefinition,
  FactionId,
} from "@game/gameplay";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

export type ExpeditionContentRequirement = ExpeditionRequirementDefinition & (
  | {
    readonly type: "research_unlock";
    readonly unlockId: string;
  }
  | {
    readonly type: "relic_examined";
    readonly relicId: string;
  }
);

export interface SilverExpeditionContentDefinition
  extends ExpeditionDefinition<ExpeditionContentRequirement> {
  readonly reward: {
    readonly kind: "silver";
    readonly silverPerHour: number;
  };
}

export interface FactionExpeditionContentDefinition
  extends ExpeditionDefinition<ExpeditionContentRequirement> {
  readonly factionId: FactionId;
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
const BASE_FACTION_RUNES_PER_HOUR = 1;
const EXPEDITION_TIERS = [4, 5, 6, 7, 8] as const;

type ExpeditionTier = (typeof EXPEDITION_TIERS)[number];

const TIER_UNLOCKS: Readonly<Record<ExpeditionTier, string>> = {
  4: RESEARCH_UNLOCK_IDS.expeditionTier4,
  5: RESEARCH_UNLOCK_IDS.expeditionTier5,
  6: RESEARCH_UNLOCK_IDS.expeditionTier6,
  7: RESEARCH_UNLOCK_IDS.expeditionTier7,
  8: RESEARCH_UNLOCK_IDS.expeditionTier8,
};

const FACTION_EXPEDITION_AUTHORING = [
  { factionId: "keeper", displayName: "Keeper", relicId: "relic_keeper" },
  { factionId: "heretic", displayName: "Heretic", relicId: "relic_heretic" },
  { factionId: "undead", displayName: "Undead", relicId: "relic_undead" },
  { factionId: "morgana", displayName: "Morgana", relicId: "relic_morgana" },
] as const satisfies readonly {
  readonly factionId: FactionId;
  readonly displayName: string;
  readonly relicId: string;
}[];

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
  requirements: [{ type: "research_unlock", unlockId: TIER_UNLOCKS[tier as ExpeditionTier] }],
  reward: { kind: "silver", silverPerHour },
})) satisfies readonly SilverExpeditionContentDefinition[];

export const FACTION_EXPEDITION_DEFINITIONS: readonly FactionExpeditionContentDefinition[] = (
  FACTION_EXPEDITION_AUTHORING.flatMap((faction) => EXPEDITION_TIERS.map((tier) => ({
    id: `expedition_${faction.factionId}_t${String(tier)}`,
    typeId: faction.factionId,
    displayName: `Expédition ${faction.displayName} T${String(tier)}`,
    tier,
    factionId: faction.factionId,
    requirements: [
      { type: "relic_examined", relicId: faction.relicId },
      { type: "research_unlock", unlockId: TIER_UNLOCKS[tier] },
    ],
    reward: {
      kind: "faction_rune",
      itemId: `item_resource_rune_${faction.factionId}_t${String(tier)}`,
      runesPerHour: BASE_FACTION_RUNES_PER_HOUR,
    },
  })))
);

export const KEEPER_EXPEDITION_DEFINITIONS = FACTION_EXPEDITION_DEFINITIONS.filter(
  (definition) => definition.factionId === "keeper",
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
    const faction = FACTION_EXPEDITION_AUTHORING.find((entry) => entry.factionId === definition.factionId);
    return {
      categoryLabel: "Faction",
      description: `Expédition passive ${faction?.displayName ?? definition.factionId}. Elle peut progresser pendant les autres activités et hors ligne.`,
      rewardSummary: `Produit ${String(definition.reward.runesPerHour)} Rune ${faction?.displayName ?? definition.factionId}/h de base, avant bonus de Faction Mastery.`,
    };
  }
  return {
    categoryLabel: "Silver",
    description: "Expédition passive dédiée au Silver. Elle peut progresser pendant les autres activités et hors ligne.",
    rewardSummary: `Produit ${String(definition.reward.silverPerHour)} Silver/h. La Faction Mastery ne modifie pas ce rendement.`,
  };
}

export function getFactionExpeditionTypeId(factionId: string): string | undefined {
  return EXPEDITION_DEFINITIONS.find((definition) => (
    isFactionExpeditionDefinition(definition)
    && definition.factionId === factionId
  ))?.typeId;
}

export function getSilverExpeditionReward(
  expeditionId: string,
  durationMs: number,
): number | undefined {
  const definition = SILVER_EXPEDITION_DEFINITIONS.find((entry) => entry.id === expeditionId);
  if (definition === undefined) return undefined;
  return getHourlyReward(definition.reward.silverPerHour, durationMs);
}

export function getFactionExpeditionBaseRuneReward(
  expeditionId: string,
  durationMs: number,
): number | undefined {
  const definition = getExpeditionDefinition(expeditionId);
  if (definition === undefined || !isFactionExpeditionDefinition(definition)) return undefined;
  return getHourlyReward(definition.reward.runesPerHour, durationMs);
}

/**
 * Faction Mastery modifies the base Rune yield, then the final player-facing
 * quantity is rounded to the nearest whole Rune. JavaScript Math.round gives
 * the validated nearest-integer behavior, with exact .5 ties rounding upward.
 */
export function getFactionExpeditionRuneReward(
  expeditionId: string,
  durationMs: number,
  masteryBonusPercent: number,
): number | undefined {
  const baseReward = getFactionExpeditionBaseRuneReward(expeditionId, durationMs);
  if (baseReward === undefined) return undefined;
  if (!Number.isFinite(masteryBonusPercent) || masteryBonusPercent < 0) return undefined;
  return Math.round(baseReward * (1 + masteryBonusPercent / 100));
}

function getHourlyReward(ratePerHour: number, durationMs: number): number | undefined {
  const hours = durationMs / (60 * 60 * 1000);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  return ratePerHour * hours;
}
