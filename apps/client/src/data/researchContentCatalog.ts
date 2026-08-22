import type { ResearchDefinition, ResearchRequirementDefinition } from "@game/gameplay";
import { DUNGEON_RELIC_ID } from "./relicContentCatalog.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type ResearchContentRequirement = ResearchRequirementDefinition & (
  | {
    readonly type: "relic_charged";
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

export type ResearchPresentationGroup = "core" | "faction";

export interface ResearchPresentationInfo {
  readonly group: ResearchPresentationGroup;
  readonly description: string;
  readonly effectSummary: string;
  /** Player-facing list used by the generic Research completion recap. */
  readonly unlockedContent: readonly string[];
}

export const RESEARCH_IDS = {
  cartography1: "research_cartography_1",
  cartography2: "research_cartography_2",
  cartography3: "research_cartography_3",
  cartography4: "research_cartography_4",
  cartography5: "research_cartography_5",
  archaeology1: "research_archaeology_1",
  archaeology2: "research_archaeology_2",
  archaeology3: "research_archaeology_3",
  archaeology4: "research_archaeology_4",
  archaeology5: "research_archaeology_5",
  workerOrganization: "research_worker_organization",
  instantRefining: "research_instant_refining",
  dungeonRelicAnalysis: "research_dungeon_relic_analysis",
  dungeonSanctuaryLocation: "research_dungeon_sanctuary_location",
} as const;

export const RESEARCH_UNLOCK_IDS = {
  silverExpeditionTier4: "expedition_silver_tier:4",
  silverExpeditionTier5: "expedition_silver_tier:5",
  silverExpeditionTier6: "expedition_silver_tier:6",
  silverExpeditionTier7: "expedition_silver_tier:7",
  silverExpeditionTier8: "expedition_silver_tier:8",
  factionExpeditionTier4: "expedition_faction_tier:4",
  factionExpeditionTier5: "expedition_faction_tier:5",
  factionExpeditionTier6: "expedition_faction_tier:6",
  factionExpeditionTier7: "expedition_faction_tier:7",
  factionExpeditionTier8: "expedition_faction_tier:8",
  secondExpeditionSlot: "expedition_slot:2",
  advancedWorkerOrganization: "workers:advanced_organization",
  instantRefining: "refining:instant_batch",
  dungeonRelicAnalyzed: "dungeon_relic:analyzed",
  dungeonSystem: "dungeon_system:unlocked",
  equipmentPresets: "equipment_presets",
} as const;

const CARTOGRAPHY_RESEARCH = [
  {
    id: RESEARCH_IDS.cartography1,
    displayName: "Cartographie I",
    tier: 4,
    durationMs: 30 * MINUTE_MS,
    cost: { silver: 5_000, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 4 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier4],
  },
  {
    id: RESEARCH_IDS.cartography2,
    displayName: "Cartographie II",
    tier: 5,
    durationMs: HOUR_MS,
    cost: { silver: 15_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 5 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier4 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier5],
  },
  {
    id: RESEARCH_IDS.cartography3,
    displayName: "Cartographie III",
    tier: 6,
    durationMs: 2 * HOUR_MS,
    cost: { silver: 40_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 6 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier5 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier6, RESEARCH_UNLOCK_IDS.secondExpeditionSlot],
  },
  {
    id: RESEARCH_IDS.cartography4,
    displayName: "Cartographie IV",
    tier: 7,
    durationMs: 3 * HOUR_MS,
    cost: { silver: 70_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 7 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier6 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier7],
  },
  {
    id: RESEARCH_IDS.cartography5,
    displayName: "Cartographie V",
    tier: 8,
    durationMs: 4 * HOUR_MS,
    cost: { silver: 110_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 8 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier7 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier8],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];

const ARCHAEOLOGY_RESEARCH = [
  {
    id: RESEARCH_IDS.archaeology1,
    displayName: "Archéologie I",
    tier: 4,
    durationMs: 30 * MINUTE_MS,
    cost: { silver: 5_000, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 4 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier4],
  },
  {
    id: RESEARCH_IDS.archaeology2,
    displayName: "Archéologie II",
    tier: 5,
    durationMs: HOUR_MS,
    cost: { silver: 15_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 5 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier4 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier5],
  },
  {
    id: RESEARCH_IDS.archaeology3,
    displayName: "Archéologie III",
    tier: 6,
    durationMs: 2 * HOUR_MS,
    cost: { silver: 40_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 6 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier5 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier6],
  },
  {
    id: RESEARCH_IDS.archaeology4,
    displayName: "Archéologie IV",
    tier: 7,
    durationMs: 3 * HOUR_MS,
    cost: { silver: 70_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 7 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier6 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier7],
  },
  {
    id: RESEARCH_IDS.archaeology5,
    displayName: "Archéologie V",
    tier: 8,
    durationMs: 4 * HOUR_MS,
    cost: { silver: 110_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 8 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier7 },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier8],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];

const ECONOMY_RESEARCH = [
  {
    id: RESEARCH_IDS.workerOrganization,
    displayName: "Organisation avancée des ouvriers",
    tier: 6,
    durationMs: 150 * MINUTE_MS,
    cost: { silver: 60_000, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 6 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.advancedWorkerOrganization],
  },
  {
    id: RESEARCH_IDS.instantRefining,
    displayName: "Procédés de raffinage avancés",
    tier: 7,
    durationMs: 3 * HOUR_MS,
    cost: { silver: 80_000, materials: [] },
    requirements: [{ type: "academy_tier", minimumTier: 7 }],
    unlockIds: [RESEARCH_UNLOCK_IDS.instantRefining],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];

const DUNGEON_DISCOVERY_RESEARCH = [
  {
    id: RESEARCH_IDS.dungeonRelicAnalysis,
    displayName: "Analyse de la Relique",
    tier: 4,
    durationMs: 10 * MINUTE_MS,
    cost: { silver: 0, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 4 },
      { type: "relic_charged", relicId: DUNGEON_RELIC_ID },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed],
  },
  {
    id: RESEARCH_IDS.dungeonSanctuaryLocation,
    displayName: "Localisation des Sanctuaires",
    tier: 4,
    durationMs: HOUR_MS,
    cost: { silver: 10_000, materials: [] },
    requirements: [
      { type: "academy_tier", minimumTier: 4 },
      { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed },
    ],
    unlockIds: [RESEARCH_UNLOCK_IDS.dungeonSystem],
  },
] as const satisfies readonly ResearchDefinition<ResearchContentRequirement>[];

export const RESEARCH_DEFINITIONS: readonly ResearchDefinition<ResearchContentRequirement>[] = [
  ...CARTOGRAPHY_RESEARCH,
  ...ARCHAEOLOGY_RESEARCH,
  ...ECONOMY_RESEARCH,
  ...DUNGEON_DISCOVERY_RESEARCH,
];

const RESEARCH_PRESENTATION = new Map<string, ResearchPresentationInfo>([
  [RESEARCH_IDS.cartography1, {
    group: "core",
    description: "Ouvre les expéditions Silver T4.",
    effectSummary: "Débloque les expéditions Silver T4.",
    unlockedContent: ["Expéditions Silver T4"],
  }],
  [RESEARCH_IDS.cartography2, {
    group: "core",
    description: "Étend les expéditions Silver au T5.",
    effectSummary: "Débloque les expéditions Silver T5.",
    unlockedContent: ["Expéditions Silver T5"],
  }],
  [RESEARCH_IDS.cartography3, {
    group: "core",
    description: "Étend les expéditions Silver au T6 et augmente la capacité d’expédition.",
    effectSummary: "Débloque les expéditions Silver T6 et un second slot d’expédition.",
    unlockedContent: ["Expéditions Silver T6", "Second slot d’expédition"],
  }],
  [RESEARCH_IDS.cartography4, {
    group: "core",
    description: "Étend les expéditions Silver au T7.",
    effectSummary: "Débloque les expéditions Silver T7.",
    unlockedContent: ["Expéditions Silver T7"],
  }],
  [RESEARCH_IDS.cartography5, {
    group: "core",
    description: "Étend les expéditions Silver au T8.",
    effectSummary: "Débloque les expéditions Silver T8.",
    unlockedContent: ["Expéditions Silver T8"],
  }],
  [RESEARCH_IDS.archaeology1, {
    group: "faction",
    description: "Ouvre les expéditions de faction T4.",
    effectSummary: "Débloque les expéditions de faction T4.",
    unlockedContent: ["Expéditions de faction T4"],
  }],
  [RESEARCH_IDS.archaeology2, {
    group: "faction",
    description: "Étend les expéditions de faction au T5.",
    effectSummary: "Débloque les expéditions de faction T5.",
    unlockedContent: ["Expéditions de faction T5"],
  }],
  [RESEARCH_IDS.archaeology3, {
    group: "faction",
    description: "Étend les expéditions de faction au T6.",
    effectSummary: "Débloque les expéditions de faction T6.",
    unlockedContent: ["Expéditions de faction T6"],
  }],
  [RESEARCH_IDS.archaeology4, {
    group: "faction",
    description: "Étend les expéditions de faction au T7.",
    effectSummary: "Débloque les expéditions de faction T7.",
    unlockedContent: ["Expéditions de faction T7"],
  }],
  [RESEARCH_IDS.archaeology5, {
    group: "faction",
    description: "Étend les expéditions de faction au T8.",
    effectSummary: "Débloque les expéditions de faction T8.",
    unlockedContent: ["Expéditions de faction T8"],
  }],
  [RESEARCH_IDS.workerOrganization, {
    group: "core",
    description: "Étend l’organisation de la production passive de l’île avec un second ouvrier par métier.",
    effectSummary: "Porte la capacité à 8 ouvriers, avec 2 ouvriers maximum par profession.",
    unlockedContent: ["8 ouvriers maximum", "2 ouvriers par profession", "Recrutement avancé à 5 000 Silver"],
  }],
  [RESEARCH_IDS.instantRefining, {
    group: "core",
    description: "Automatise la transformation des stocks raffinables sans modifier les recettes ni les rendements.",
    effectSummary: "Débloque le raffinage instantané par lot dans les bâtiments de raffinage.",
    unlockedContent: ["Raffinage instantané par lot", "Recettes et rendements inchangés"],
  }],
  [RESEARCH_IDS.dungeonRelicAnalysis, {
    group: "core",
    description: "Analyse à l’Académie la Relique chargée découverte à Frostpeak Mountain.",
    effectSummary: "Révèle la recherche Localisation des Sanctuaires.",
    unlockedContent: ["Recherche : Localisation des Sanctuaires"],
  }],
  [RESEARCH_IDS.dungeonSanctuaryLocation, {
    group: "core",
    description: "Localise les sanctuaires et ouvre le système de Donjons.",
    effectSummary: "Débloque les Donjons et active les drops de clés et fragments de clé.",
    unlockedContent: ["Onglet Donjons", "Drops de fragments de clé", "Drops de clés de donjon"],
  }],
]);

export function getResearchPresentationGroup(
  researchId: string,
): ResearchPresentationGroup | undefined {
  return RESEARCH_PRESENTATION.get(researchId)?.group;
}

export function getResearchPresentationInfo(
  researchId: string,
): ResearchPresentationInfo | undefined {
  return RESEARCH_PRESENTATION.get(researchId);
}
