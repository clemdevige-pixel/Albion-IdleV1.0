import type {
  ExpeditionDefinition,
  ExpeditionRequirementDefinition,
  FactionId,
} from "@game/gameplay";
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

const SILVER_EXPEDITION_TYPE_ID = "silver";
const KEEPER_EXPEDITION_TYPE_ID = "keeper";
const BASE_FACTION_RUNES_PER_HOUR = 1;

export const SILVER_EXPEDITION_DEFINITIONS = [
  {
    id: "expedition_silver_t4",
    typeId: SILVER_EXPEDITION_TYPE_ID,
    displayName: "Expédition d'argent T4",
    tier: 4,
    requirements: [{ type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier4 }],
    reward: { kind: "silver", silverPerHour: 15_000 },
  },
  {
    id: "expedition_silver_t5",
    typeId: SILVER_EXPEDITION_TYPE_ID,
    displayName: "Expédition d'argent T5",
    tier: 5,
    requirements: [{ type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier5 }],
    reward: { kind: "silver", silverPerHour: 25_000 },
  },
  {
    id: "expedition_silver_t6",
    typeId: SILVER_EXPEDITION_TYPE_ID,
    displayName: "Expédition d'argent T6",
    tier: 6,
    requirements: [{ type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier6 }],
    reward: { kind: "silver", silverPerHour: 35_000 },
  },
  {
    id: "expedition_silver_t7",
    typeId: SILVER_EXPEDITION_TYPE_ID,
    displayName: "Expédition d'argent T7",
    tier: 7,
    requirements: [{ type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier7 }],
    reward: { kind: "silver", silverPerHour: 40_000 },
  },
  {
    id: "expedition_silver_t8",
    typeId: SILVER_EXPEDITION_TYPE_ID,
    displayName: "Expédition d'argent T8",
    tier: 8,
    requirements: [{ type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier8 }],
    reward: { kind: "silver", silverPerHour: 50_000 },
  },
] as const satisfies readonly SilverExpeditionContentDefinition[];

const KEEPER_TIER_UNLOCKS = {
  4: RESEARCH_UNLOCK_IDS.expeditionTier4,
  5: RESEARCH_UNLOCK_IDS.expeditionTier5,
  6: RESEARCH_UNLOCK_IDS.expeditionTier6,
  7: RESEARCH_UNLOCK_IDS.expeditionTier7,
  8: RESEARCH_UNLOCK_IDS.expeditionTier8,
} as const;

export const KEEPER_EXPEDITION_DEFINITIONS = ([4, 5, 6, 7, 8] as const).map((tier) => ({
  id: `expedition_keeper_t${String(tier)}`,
  typeId: KEEPER_EXPEDITION_TYPE_ID,
  displayName: `Expédition Keeper T${String(tier)}`,
  tier,
  factionId: "keeper",
  requirements: [
    { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.keeperExpeditionFamily },
    { type: "research_unlock", unlockId: KEEPER_TIER_UNLOCKS[tier] },
  ],
  reward: {
    kind: "faction_rune",
    itemId: `item_resource_rune_keeper_t${String(tier)}`,
    runesPerHour: BASE_FACTION_RUNES_PER_HOUR,
  },
})) satisfies readonly FactionExpeditionContentDefinition[];

export const EXPEDITION_DEFINITIONS: readonly ExpeditionContentDefinition[] = [
  ...SILVER_EXPEDITION_DEFINITIONS,
  ...KEEPER_EXPEDITION_DEFINITIONS,
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
  const definition = KEEPER_EXPEDITION_DEFINITIONS.find((entry) => entry.id === expeditionId);
  if (definition === undefined) return undefined;
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
