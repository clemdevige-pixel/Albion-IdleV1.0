import type { ExpeditionDefinition, ExpeditionRequirementDefinition } from "@game/gameplay";
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

const SILVER_EXPEDITION_TYPE_ID = "silver";

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

export function getSilverExpeditionDefinition(
  expeditionId: string,
): SilverExpeditionContentDefinition | undefined {
  return SILVER_EXPEDITION_DEFINITIONS.find((definition) => definition.id === expeditionId);
}

export function getSilverExpeditionReward(
  expeditionId: string,
  durationMs: number,
): number | undefined {
  const definition = getSilverExpeditionDefinition(expeditionId);
  if (definition === undefined) return undefined;
  const hours = durationMs / (60 * 60 * 1000);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  return definition.reward.silverPerHour * hours;
}
