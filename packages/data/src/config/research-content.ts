import { DUNGEON_RELIC_ID } from "./dungeon-relic.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

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
  enchantmentStudy: "research_enchantment_study",
  yieldAnalysis: "research_yield_analysis",
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
  enchantmentService: "enchantment:service",
  resourceYieldTracking: "dashboard:resource_yield_tracking",
  advancedWorkerOrganization: "workers:advanced_organization",
  instantRefining: "refining:instant_batch",
  dungeonRelicAnalyzed: "dungeon_relic:analyzed",
  dungeonSystem: "dungeon_system:unlocked",
  factionRuneWorldDrop: "faction_rune:world_drop",
  equipmentPresets: "equipment_presets",
} as const;

export type AuthoredResearchRequirement =
  | { readonly type: "relic_charged"; readonly relicId: string }
  | { readonly type: "academy_tier"; readonly minimumTier: number }
  | { readonly type: "research_unlock"; readonly unlockId: string }
  | { readonly type: "enchantment_shard_discovered" };

export interface AuthoredResearchDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly tier: number;
  readonly durationMs: number;
  readonly cost: {
    readonly silver: number;
    readonly materials: readonly { readonly itemId: string; readonly quantity: number }[];
  };
  readonly requirements: readonly AuthoredResearchRequirement[];
  readonly unlockIds: readonly string[];
}

const CARTOGRAPHY_RESEARCH = [
  { id: RESEARCH_IDS.cartography1, displayName: "Cartographie I", tier: 4, durationMs: 30 * MINUTE_MS, cost: { silver: 5_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 4 }], unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier4] },
  { id: RESEARCH_IDS.cartography2, displayName: "Cartographie II", tier: 5, durationMs: HOUR_MS, cost: { silver: 15_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 5 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier4 }], unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier5] },
  { id: RESEARCH_IDS.cartography3, displayName: "Cartographie III", tier: 6, durationMs: 2 * HOUR_MS, cost: { silver: 40_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 6 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier5 }], unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier6, RESEARCH_UNLOCK_IDS.secondExpeditionSlot] },
  { id: RESEARCH_IDS.cartography4, displayName: "Cartographie IV", tier: 7, durationMs: 3 * HOUR_MS, cost: { silver: 70_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 7 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier6 }], unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier7] },
  { id: RESEARCH_IDS.cartography5, displayName: "Cartographie V", tier: 8, durationMs: 4 * HOUR_MS, cost: { silver: 110_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 8 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier7 }], unlockIds: [RESEARCH_UNLOCK_IDS.silverExpeditionTier8] },
] as const satisfies readonly AuthoredResearchDefinition[];

const ARCHAEOLOGY_RESEARCH = [
  { id: RESEARCH_IDS.archaeology1, displayName: "Archéologie I", tier: 4, durationMs: 30 * MINUTE_MS, cost: { silver: 5_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 4 }], unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier4] },
  { id: RESEARCH_IDS.archaeology2, displayName: "Archéologie II", tier: 5, durationMs: HOUR_MS, cost: { silver: 15_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 5 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier4 }], unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier5] },
  { id: RESEARCH_IDS.archaeology3, displayName: "Archéologie III", tier: 6, durationMs: 2 * HOUR_MS, cost: { silver: 40_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 6 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier5 }], unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier6] },
  { id: RESEARCH_IDS.archaeology4, displayName: "Archéologie IV", tier: 7, durationMs: 3 * HOUR_MS, cost: { silver: 70_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 7 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier6 }], unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier7] },
  { id: RESEARCH_IDS.archaeology5, displayName: "Archéologie V", tier: 8, durationMs: 4 * HOUR_MS, cost: { silver: 110_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 8 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier7 }], unlockIds: [RESEARCH_UNLOCK_IDS.factionExpeditionTier8] },
] as const satisfies readonly AuthoredResearchDefinition[];

const ECONOMY_RESEARCH = [
  { id: RESEARCH_IDS.enchantmentStudy, displayName: "Étude des enchantements", tier: 4, durationMs: 30 * MINUTE_MS, cost: { silver: 5_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 4 }, { type: "enchantment_shard_discovered" }], unlockIds: [RESEARCH_UNLOCK_IDS.enchantmentService] },
  { id: RESEARCH_IDS.yieldAnalysis, displayName: "Analyse des rendements", tier: 5, durationMs: HOUR_MS, cost: { silver: 15_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 5 }], unlockIds: [RESEARCH_UNLOCK_IDS.resourceYieldTracking] },
  { id: RESEARCH_IDS.workerOrganization, displayName: "Organisation avancée des ouvriers", tier: 6, durationMs: 150 * MINUTE_MS, cost: { silver: 60_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 6 }], unlockIds: [RESEARCH_UNLOCK_IDS.advancedWorkerOrganization] },
  { id: RESEARCH_IDS.instantRefining, displayName: "Procédés de raffinage avancés", tier: 7, durationMs: 3 * HOUR_MS, cost: { silver: 80_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 7 }], unlockIds: [RESEARCH_UNLOCK_IDS.instantRefining] },
] as const satisfies readonly AuthoredResearchDefinition[];

const DUNGEON_DISCOVERY_RESEARCH = [
  { id: RESEARCH_IDS.dungeonRelicAnalysis, displayName: "Analyse de la Relique", tier: 4, durationMs: 10 * MINUTE_MS, cost: { silver: 0, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 4 }, { type: "relic_charged", relicId: DUNGEON_RELIC_ID }], unlockIds: [RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed] },
  { id: RESEARCH_IDS.dungeonSanctuaryLocation, displayName: "Localisation des Sanctuaires", tier: 4, durationMs: HOUR_MS, cost: { silver: 10_000, materials: [] }, requirements: [{ type: "academy_tier", minimumTier: 4 }, { type: "research_unlock", unlockId: RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed }], unlockIds: [RESEARCH_UNLOCK_IDS.dungeonSystem, RESEARCH_UNLOCK_IDS.factionRuneWorldDrop] },
] as const satisfies readonly AuthoredResearchDefinition[];

export const RESEARCH_AUTHORED_DEFINITIONS: readonly AuthoredResearchDefinition[] = [
  ...CARTOGRAPHY_RESEARCH,
  ...ARCHAEOLOGY_RESEARCH,
  ...ECONOMY_RESEARCH,
  ...DUNGEON_DISCOVERY_RESEARCH,
];
