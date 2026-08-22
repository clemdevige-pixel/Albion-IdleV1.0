import type { ResearchDefinition, ResearchRequirementDefinition } from "@game/gameplay";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type ResearchContentRequirement = ResearchRequirementDefinition & (
  | {
    readonly type: "relic_reconstructed";
    readonly relicId: string;
  }
  | {
    readonly type: "academy_tier";
    readonly minimumTier: number;
  }
  | {
    readonly type: "research_unlock";
    readonly unlockId: string;
  }
);

export const RESEARCH_UNLOCK_IDS = {
  relicReconstruction: "relic_reconstruction",
  expeditionTier4: "expedition_tier:4",
  expeditionTier5: "expedition_tier:5",
  expeditionTier6: "expedition_tier:6",
  expeditionTier7: "expedition_tier:7",
  expeditionTier8: "expedition_tier:8",
  secondExpeditionSlot: "expedition_slot:2",
  keeperExpeditionFamily: "expedition_family:keeper",
  keeperDungeonFamily: "dungeon_family:keeper",
  hereticExpeditionFamily: "expedition_family:heretic",
  hereticDungeonFamily: "dungeon_family:heretic",
  undeadExpeditionFamily: "expedition_family:undead",
  undeadDungeonFamily: "dungeon_family:undead",
  morganaExpeditionFamily: "expedition_family:morgana",
  morganaDungeonFamily: "dungeon_family:morgana",
  equipmentPresets: "equipment_presets",
} as const;

const CARTOGRAPHY_RESEARCH = [
  {
    id: "research_cartography_1",
    displayName: "Cartographie I",
    tier: 4,
    durationMs: 30 * MINUTE_MS,
    cost: { silver: 5_000, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 4 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier4],
  },
  {
    id: "research_cartography_2",
    displayName: "Cartographie II",
    tier: 5,
    durationMs: HOUR_MS,
    cost: { silver: 15_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 5 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier4 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier5],
  },
  {
    id: "research_cartography_3",
    displayName: "Cartographie III",
    tier: 6,
    durationMs: 2 * HOUR_MS,
    cost: { silver: 40_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 6 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier5 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier6, RESEARCH_UNLOCK_IDS.secondExpeditionSlot],
  },
  {
    id: "research_cartography_4",
    displayName: "Cartographie IV",
    tier: 7,
    durationMs: 3 * HOUR_MS,
    cost: { silver: 70_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 7 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier6 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier7],
  },
  {
    id: "research_cartography_5",
    displayName: "Cartographie V",
    tier: 8,
    durationMs: 4 * HOUR_MS,
    cost: { silver: 110_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 8 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.expeditionTier7 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier8],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];

const FACTION_RESEARCH = [
  {
    factionId: "keeper",
    displayName: "Keeper",
    relicId: "relic_keeper",
    expeditionUnlockId: RESEARCH_UNLOCK_IDS.keeperExpeditionFamily,
    dungeonUnlockId: RESEARCH_UNLOCK_IDS.keeperDungeonFamily,
  },
  {
    factionId: "heretic",
    displayName: "Heretic",
    relicId: "relic_heretic",
    expeditionUnlockId: RESEARCH_UNLOCK_IDS.hereticExpeditionFamily,
    dungeonUnlockId: RESEARCH_UNLOCK_IDS.hereticDungeonFamily,
  },
  {
    factionId: "undead",
    displayName: "Undead",
    relicId: "relic_undead",
    expeditionUnlockId: RESEARCH_UNLOCK_IDS.undeadExpeditionFamily,
    dungeonUnlockId: RESEARCH_UNLOCK_IDS.undeadDungeonFamily,
  },
  {
    factionId: "morgana",
    displayName: "Morgana",
    relicId: "relic_morgana",
    expeditionUnlockId: RESEARCH_UNLOCK_IDS.morganaExpeditionFamily,
    dungeonUnlockId: RESEARCH_UNLOCK_IDS.morganaDungeonFamily,
  },
] as const;

const CONTEXTUAL_FACTION_RESEARCH: readonly ResearchDefinition<ResearchContentRequirement>[] = FACTION_RESEARCH.flatMap((faction) => [
  {
    id: `research_${faction.factionId}_expedition_study`,
    displayName: `Étude des ${faction.displayName}`,
    tier: 4,
    durationMs: 30 * MINUTE_MS,
    cost: { silver: 5_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 4 },
      { type: "relic_reconstructed", relicId: faction.relicId },
    ],
    unlockIds: [faction.expeditionUnlockId],
  },
  {
    id: `research_${faction.factionId}_dungeon_location`,
    displayName: `Localisation des Sanctuaires ${faction.displayName}`,
    tier: 4,
    durationMs: HOUR_MS,
    cost: { silver: 10_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 4 },
      { type: "relic_reconstructed", relicId: faction.relicId },
    ],
    unlockIds: [faction.dungeonUnlockId],
  },
]);

export const RESEARCH_DEFINITIONS: readonly ResearchDefinition<ResearchContentRequirement>[] = [
  ...CARTOGRAPHY_RESEARCH,
  {
    id: "research_archaeology_1",
    displayName: "Archéologie I",
    tier: 4,
    durationMs: 20 * MINUTE_MS,
    cost: { silver: 2_500, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 4 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.relicReconstruction],
  },
  ...CONTEXTUAL_FACTION_RESEARCH,
];
