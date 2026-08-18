import { asBiomeId, asMonsterDefinitionId, asSpawnGroupId, asZoneDefinitionId, type BiomeDefinition, type BiomeId, type ZoneDefinition, type ZoneDefinitionId, type ZoneUnlockDefinition } from "@game/gameplay";
import { WORLD_BAND_DEFINITIONS, type WorldBandId } from "@game/data";
import { getZoneEncounterPool } from "./monsterContentCatalog";

interface WorldZoneContentDefinition { readonly id: ZoneDefinitionId; readonly name: string; readonly bandId: WorldBandId; readonly tier: number; readonly biomeId: BiomeId; readonly spawnGroupPrefix: string; readonly respawnDelayTicks: number; readonly tags: readonly string[]; }

export const WORLD_ZONE_CONTENT = {
  forest: { id: asZoneDefinitionId("zone_forest_t3"), name: "Birch Forest", bandId: "blue", tier: 3, biomeId: asBiomeId("biome_forest"), spawnGroupPrefix: "grp_forest", respawnDelayTicks: 30, tags: ["forest", "starter"] },
  swamp: { id: asZoneDefinitionId("zone_swamp_t3"), name: "Dark Swamp", bandId: "blue", tier: 3, biomeId: asBiomeId("biome_swamp"), spawnGroupPrefix: "grp_swamp", respawnDelayTicks: 40, tags: ["swamp"] },
  highland: { id: asZoneDefinitionId("zone_highland_t3"), name: "Stone Highlands", bandId: "blue", tier: 3, biomeId: asBiomeId("biome_highland"), spawnGroupPrefix: "grp_highland", respawnDelayTicks: 45, tags: ["highland", "tier3"] },
  steppe: { id: asZoneDefinitionId("zone_steppe_t4"), name: "Golden Steppe", bandId: "blue", tier: 4, biomeId: asBiomeId("biome_steppe"), spawnGroupPrefix: "grp_steppe", respawnDelayTicks: 50, tags: ["steppe", "tier4"] },
  mountain: { id: asZoneDefinitionId("zone_mountain_t4"), name: "Frostpeak Mountain", bandId: "blue", tier: 4, biomeId: asBiomeId("biome_mountain"), spawnGroupPrefix: "grp_mountain", respawnDelayTicks: 60, tags: ["mountain", "tier4", "final"] },
  amberwood: { id: asZoneDefinitionId("zone_amberwood_t5"), name: "Amberwood Forest", bandId: "yellow", tier: 5, biomeId: asBiomeId("biome_forest"), spawnGroupPrefix: "grp_amberwood", respawnDelayTicks: 65, tags: ["forest", "yellow", "tier5", "starter"] },
  gloamfen: { id: asZoneDefinitionId("zone_gloamfen_t5"), name: "Gloamfen Marsh", bandId: "yellow", tier: 5, biomeId: asBiomeId("biome_swamp"), spawnGroupPrefix: "grp_gloamfen", respawnDelayTicks: 70, tags: ["swamp", "yellow", "tier5"] },
  stormwatch: { id: asZoneDefinitionId("zone_stormwatch_t5"), name: "Stormwatch Highlands", bandId: "yellow", tier: 5, biomeId: asBiomeId("biome_highland"), spawnGroupPrefix: "grp_stormwatch", respawnDelayTicks: 75, tags: ["highland", "yellow", "tier5"] },
  sunscar: { id: asZoneDefinitionId("zone_sunscar_t5"), name: "Sunscar Steppe", bandId: "yellow", tier: 5, biomeId: asBiomeId("biome_steppe"), spawnGroupPrefix: "grp_sunscar", respawnDelayTicks: 80, tags: ["steppe", "yellow", "tier5"] },
  ironveil: { id: asZoneDefinitionId("zone_ironveil_t5"), name: "Ironveil Peaks", bandId: "yellow", tier: 5, biomeId: asBiomeId("biome_mountain"), spawnGroupPrefix: "grp_ironveil", respawnDelayTicks: 85, tags: ["mountain", "yellow", "tier5", "final"] },
  cinderwood: { id: asZoneDefinitionId("zone_cinderwood_t6"), name: "Cinderwood Forest", bandId: "orange", tier: 6, biomeId: asBiomeId("biome_forest"), spawnGroupPrefix: "grp_cinderwood", respawnDelayTicks: 90, tags: ["forest", "orange", "tier6", "starter"] },
  rotfen: { id: asZoneDefinitionId("zone_rotfen_t6"), name: "Rotfen Marsh", bandId: "orange", tier: 6, biomeId: asBiomeId("biome_swamp"), spawnGroupPrefix: "grp_rotfen", respawnDelayTicks: 95, tags: ["swamp", "orange", "tier6"] },
  thundercrag: { id: asZoneDefinitionId("zone_thundercrag_t6"), name: "Thundercrag Highlands", bandId: "orange", tier: 6, biomeId: asBiomeId("biome_highland"), spawnGroupPrefix: "grp_thundercrag", respawnDelayTicks: 100, tags: ["highland", "orange", "tier6"] },
  emberwind: { id: asZoneDefinitionId("zone_emberwind_t6"), name: "Emberwind Steppe", bandId: "orange", tier: 6, biomeId: asBiomeId("biome_steppe"), spawnGroupPrefix: "grp_emberwind", respawnDelayTicks: 105, tags: ["steppe", "orange", "tier6"] },
  ashenpeak: { id: asZoneDefinitionId("zone_ashenpeak_t6"), name: "Ashenpeak Mountain", bandId: "orange", tier: 6, biomeId: asBiomeId("biome_mountain"), spawnGroupPrefix: "grp_ashenpeak", respawnDelayTicks: 110, tags: ["mountain", "orange", "tier6", "final"] },
  bloodwood: { id: asZoneDefinitionId("zone_bloodwood_t7"), name: "Bloodwood Forest", bandId: "red", tier: 7, biomeId: asBiomeId("biome_forest"), spawnGroupPrefix: "grp_bloodwood", respawnDelayTicks: 115, tags: ["forest", "red", "tier7", "starter"] },
  dreadfen: { id: asZoneDefinitionId("zone_dreadfen_t7"), name: "Dreadfen Marsh", bandId: "red", tier: 7, biomeId: asBiomeId("biome_swamp"), spawnGroupPrefix: "grp_dreadfen", respawnDelayTicks: 120, tags: ["swamp", "red", "tier7"] },
  redspire: { id: asZoneDefinitionId("zone_redspire_t7"), name: "Redspire Highlands", bandId: "red", tier: 7, biomeId: asBiomeId("biome_highland"), spawnGroupPrefix: "grp_redspire", respawnDelayTicks: 125, tags: ["highland", "red", "tier7"] },
  crimsonSteppe: { id: asZoneDefinitionId("zone_crimson_steppe_t7"), name: "Crimson Steppe", bandId: "red", tier: 7, biomeId: asBiomeId("biome_steppe"), spawnGroupPrefix: "grp_crimson_steppe", respawnDelayTicks: 130, tags: ["steppe", "red", "tier7"] },
  doompeak: { id: asZoneDefinitionId("zone_doompeak_t7"), name: "Doompeak Mountain", bandId: "red", tier: 7, biomeId: asBiomeId("biome_mountain"), spawnGroupPrefix: "grp_doompeak", respawnDelayTicks: 135, tags: ["mountain", "red", "tier7", "final"] },
  blackwood: { id: asZoneDefinitionId("zone_blackwood_t8"), name: "Blackwood Forest", bandId: "black", tier: 8, biomeId: asBiomeId("biome_forest"), spawnGroupPrefix: "grp_blackwood", respawnDelayTicks: 140, tags: ["forest", "black", "tier8", "starter"] },
  shadowfen: { id: asZoneDefinitionId("zone_shadowfen_t8"), name: "Shadowfen Marsh", bandId: "black", tier: 8, biomeId: asBiomeId("biome_swamp"), spawnGroupPrefix: "grp_shadowfen", respawnDelayTicks: 145, tags: ["swamp", "black", "tier8"] },
  obsidianHighlands: { id: asZoneDefinitionId("zone_obsidian_highlands_t8"), name: "Obsidian Highlands", bandId: "black", tier: 8, biomeId: asBiomeId("biome_highland"), spawnGroupPrefix: "grp_obsidian_highlands", respawnDelayTicks: 150, tags: ["highland", "black", "tier8"] },
  duskfallSteppe: { id: asZoneDefinitionId("zone_duskfall_steppe_t8"), name: "Duskfall Steppe", bandId: "black", tier: 8, biomeId: asBiomeId("biome_steppe"), spawnGroupPrefix: "grp_duskfall_steppe", respawnDelayTicks: 155, tags: ["steppe", "black", "tier8"] },
  blackspire: { id: asZoneDefinitionId("zone_blackspire_t8"), name: "Blackspire Mountain", bandId: "black", tier: 8, biomeId: asBiomeId("biome_mountain"), spawnGroupPrefix: "grp_blackspire", respawnDelayTicks: 160, tags: ["mountain", "black", "tier8", "final"] },
} as const satisfies Readonly<Record<string, WorldZoneContentDefinition>>;

export type WorldZoneKey = keyof typeof WORLD_ZONE_CONTENT;
export const WORLD_ZONE_IDS = Object.fromEntries(Object.entries(WORLD_ZONE_CONTENT).map(([key, definition]) => [key, definition.id])) as { readonly [K in WorldZoneKey]: (typeof WORLD_ZONE_CONTENT)[K]["id"] };
const ZONE_CONTENT_VALUES: readonly WorldZoneContentDefinition[] = Object.values(WORLD_ZONE_CONTENT);
export const WORLD_ZONE_IDS_BY_BAND = Object.fromEntries(WORLD_BAND_DEFINITIONS.map(({ id }) => [id, ZONE_CONTENT_VALUES.filter((definition) => definition.bandId === id).map((definition) => definition.id)])) as unknown as Readonly<Record<WorldBandId, readonly ZoneDefinitionId[]>>;

export interface WorldZonePlacement { readonly bandId: WorldBandId; readonly zoneIndexWithinBand: number; readonly tier: number; }
export function getWorldZonePlacement(zoneDefId: ZoneDefinitionId | string): WorldZonePlacement {
  const definition = ZONE_CONTENT_VALUES.find(({ id }) => id === zoneDefId); if (definition === undefined) throw new Error(`Zone is not assigned to a world band: ${String(zoneDefId)}`);
  const zoneIndexWithinBand = WORLD_ZONE_IDS_BY_BAND[definition.bandId].findIndex((candidate) => candidate === definition.id); if (zoneIndexWithinBand < 0) throw new Error(`Zone placement is inconsistent: ${String(zoneDefId)}`);
  return { bandId: definition.bandId, zoneIndexWithinBand, tier: definition.tier };
}

export const BIOME_DEFINITIONS: readonly BiomeDefinition[] = [
  { id: asBiomeId("biome_forest"), name: "Forest", theme: "Nature", difficultyModifier: 0.72, enemyFamilies: ["Animal", "Keeper"], resourceFamilies: ["Wood", "Hide"], encounterPoolId: "encounter_pool_forest", visualThemeId: "visual_forest", ambientAudioId: "audio_forest", musicPlaylistId: "music_forest", weather: "None", lighting: "Day", decorationDensity: "Normal", tags: ["nature", "starter"] },
  { id: asBiomeId("biome_swamp"), name: "Swamp", theme: "Undead", difficultyModifier: 0.88, enemyFamilies: ["Undead"], resourceFamilies: ["Fiber"], encounterPoolId: "encounter_pool_swamp", visualThemeId: "visual_swamp", ambientAudioId: "audio_swamp", musicPlaylistId: "music_swamp", weather: "Rain", lighting: "Foggy", decorationDensity: "Dense", tags: ["undead"] },
  { id: asBiomeId("biome_highland"), name: "Highland", theme: "Royal", difficultyModifier: 1.04, enemyFamilies: ["Keeper", "Heretic"], resourceFamilies: ["Stone", "Ore"], encounterPoolId: "encounter_pool_highland", visualThemeId: "visual_highland", ambientAudioId: "audio_highland", musicPlaylistId: "music_highland", weather: "Wind", lighting: "Day", decorationDensity: "Sparse", tags: ["highland", "tier3", "checkpoint"] },
  { id: asBiomeId("biome_steppe"), name: "Steppe", theme: "Demonic", difficultyModifier: 1.22, enemyFamilies: ["Heretic", "Animal"], resourceFamilies: ["Hide", "Fiber"], encounterPoolId: "encounter_pool_steppe", visualThemeId: "visual_steppe", ambientAudioId: "audio_steppe", musicPlaylistId: "music_steppe", weather: "Dry", lighting: "Sunset", decorationDensity: "Sparse", tags: ["steppe", "tier4", "transition"] },
  { id: asBiomeId("biome_mountain"), name: "Mountain", theme: "Frozen", difficultyModifier: 1.42, enemyFamilies: ["Keeper", "Demon"], resourceFamilies: ["Ore", "Stone"], encounterPoolId: "encounter_pool_mountain", visualThemeId: "visual_mountain", ambientAudioId: "audio_mountain", musicPlaylistId: "music_mountain", weather: "Snow", lighting: "Cold", decorationDensity: "Normal", tags: ["mountain", "tier4", "final"] },
];

function buildNormalMonsterSpawns(zoneDefId: ZoneDefinitionId, groupPrefix: string, respawnDelayTicks: number): ZoneDefinition["monsterSpawns"] {
  const pool = getZoneEncounterPool(zoneDefId); const monsterIds = [...new Set([...pool.dominant.normal, ...pool.secondary.normal])];
  return monsterIds.map((monsterId, index) => ({ definitionId: asMonsterDefinitionId(monsterId), spawnGroupId: asSpawnGroupId(`${groupPrefix}_${String(index + 1)}`), count: 1, respawnDelayTicks }));
}
export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = ZONE_CONTENT_VALUES.map((definition) => ({ id: definition.id, name: definition.name, tier: definition.tier, monsterSpawns: buildNormalMonsterSpawns(definition.id, definition.spawnGroupPrefix, definition.respawnDelayTicks), tags: [...definition.tags] }));
export const BIOME_BY_ZONE = new Map<ZoneDefinitionId, BiomeId>(ZONE_CONTENT_VALUES.map((definition) => [definition.id, definition.biomeId]));
export const WORLD_ZONE_ORDER = WORLD_BAND_DEFINITIONS.flatMap(({ id }) => WORLD_ZONE_IDS_BY_BAND[id]);
export function buildZoneUnlockDefinitions(zoneOrder: readonly ZoneDefinitionId[]): readonly ZoneUnlockDefinition[] {
  return zoneOrder.map((zoneDefId, index) => { const previousZoneDefId = zoneOrder[index - 1]; return previousZoneDefId === undefined ? { zoneDefId, conditions: [], unlockedByDefault: true } : { zoneDefId, conditions: [{ type: "zone_completed" as const, targetZoneDefId: previousZoneDefId }] }; });
}
export const ZONE_UNLOCK_DEFINITIONS: readonly ZoneUnlockDefinition[] = buildZoneUnlockDefinitions(WORLD_ZONE_ORDER);
export function validateWorldContentCatalog(): void {
  const zoneIds = ZONE_CONTENT_VALUES.map(({ id }) => id); if (new Set(zoneIds).size !== zoneIds.length) throw new Error("A world zone ID is authored more than once");
  const biomeIds = new Set(BIOME_DEFINITIONS.map(({ id }) => id)); for (const definition of ZONE_CONTENT_VALUES) { if (!biomeIds.has(definition.biomeId)) throw new Error(`Missing biome definition for zone: ${String(definition.id)}`); getZoneEncounterPool(definition.id); }
  const derivedDefinitionIds = new Set(ZONE_DEFINITIONS.map(({ id }) => id)); if (derivedDefinitionIds.size !== zoneIds.length) throw new Error("Derived zone definitions do not match authored world content");
}
