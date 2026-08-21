import type { ResearchDefinition, ResearchRequirementDefinition } from "@game/gameplay";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type ResearchContentRequirement = ResearchRequirementDefinition & {
  readonly type: "relic_reconstructed";
  readonly relicId: string;
};

export const RESEARCH_UNLOCK_IDS = {
  expeditionTier4: "expedition_tier:4",
  expeditionTier5: "expedition_tier:5",
  expeditionTier6: "expedition_tier:6",
  expeditionTier7: "expedition_tier:7",
  expeditionTier8: "expedition_tier:8",
  secondExpeditionSlot: "expedition_slot:2",
  keeperExpeditionFamily: "expedition_family:keeper",
  keeperDungeonFamily: "dungeon_family:keeper",
} as const;

/**
 * Only researches whose tuning is explicitly validated are authored here.
 * Cartography / Archaeology costs and durations remain OPEN in system 44 and
 * must not receive placeholder values.
 */
export const RESEARCH_DEFINITIONS = [
  {
    id: "research_keeper_expedition_study",
    displayName: "Étude des Keeper",
    tier: 4,
    durationMs: 30 * MINUTE_MS,
    cost: { silver: 5_000, materials: [] },
    requirements: [{ type: "relic_reconstructed", relicId: "relic_keeper" }],
    unlockIds: [RESEARCH_UNLOCK_IDS.keeperExpeditionFamily],
  },
  {
    id: "research_keeper_dungeon_location",
    displayName: "Localisation des Sanctuaires Keeper",
    tier: 4,
    durationMs: HOUR_MS,
    cost: { silver: 10_000, materials: [] },
    requirements: [{ type: "relic_reconstructed", relicId: "relic_keeper" }],
    unlockIds: [RESEARCH_UNLOCK_IDS.keeperDungeonFamily],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];
