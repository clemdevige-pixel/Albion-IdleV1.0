import {
  asBiomeId,
  asMonsterDefinitionId,
  asSpawnGroupId,
  asZoneDefinitionId,
  type BiomeDefinition,
  type ZoneDefinition,
  type ZoneUnlockDefinition,
} from "@game/gameplay";

export const WORLD_ZONE_IDS = {
  forest: asZoneDefinitionId("zone_forest_t3"),
  swamp: asZoneDefinitionId("zone_swamp_t3"),
  highland: asZoneDefinitionId("zone_highland_t3"),
  steppe: asZoneDefinitionId("zone_steppe_t4"),
  mountain: asZoneDefinitionId("zone_mountain_t4"),
} as const;

export const BIOME_DEFINITIONS: readonly BiomeDefinition[] = [
  { id: asBiomeId("biome_forest"), name: "Forest", theme: "Nature", difficultyModifier: 0.72, enemyFamilies: ["Animal", "Keeper"], resourceFamilies: ["Wood", "Hide"], encounterPoolId: "encounter_pool_forest", visualThemeId: "visual_forest", ambientAudioId: "audio_forest", musicPlaylistId: "music_forest", weather: "None", lighting: "Day", decorationDensity: "Normal", tags: ["nature", "starter"] },
  { id: asBiomeId("biome_swamp"), name: "Swamp", theme: "Undead", difficultyModifier: 0.88, enemyFamilies: ["Undead"], resourceFamilies: ["Fiber"], encounterPoolId: "encounter_pool_swamp", visualThemeId: "visual_swamp", ambientAudioId: "audio_swamp", musicPlaylistId: "music_swamp", weather: "Rain", lighting: "Foggy", decorationDensity: "Dense", tags: ["undead"] },
  { id: asBiomeId("biome_highland"), name: "Highland", theme: "Royal", difficultyModifier: 1.04, enemyFamilies: ["Keeper", "Heretic"], resourceFamilies: ["Stone", "Ore"], encounterPoolId: "encounter_pool_highland", visualThemeId: "visual_highland", ambientAudioId: "audio_highland", musicPlaylistId: "music_highland", weather: "Wind", lighting: "Day", decorationDensity: "Sparse", tags: ["highland", "tier3", "checkpoint"] },
  { id: asBiomeId("biome_steppe"), name: "Steppe", theme: "Demonic", difficultyModifier: 1.22, enemyFamilies: ["Heretic", "Animal"], resourceFamilies: ["Hide", "Fiber"], encounterPoolId: "encounter_pool_steppe", visualThemeId: "visual_steppe", ambientAudioId: "audio_steppe", musicPlaylistId: "music_steppe", weather: "Dry", lighting: "Sunset", decorationDensity: "Sparse", tags: ["steppe", "tier4", "transition"] },
  { id: asBiomeId("biome_mountain"), name: "Mountain", theme: "Frozen", difficultyModifier: 1.42, enemyFamilies: ["Keeper", "Demon"], resourceFamilies: ["Ore", "Stone"], encounterPoolId: "encounter_pool_mountain", visualThemeId: "visual_mountain", ambientAudioId: "audio_mountain", musicPlaylistId: "music_mountain", weather: "Snow", lighting: "Cold", decorationDensity: "Normal", tags: ["mountain", "tier4", "final"] },
];

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = [
  { id: WORLD_ZONE_IDS.forest, name: "Birch Forest", tier: 3, monsterSpawns: [{ definitionId: asMonsterDefinitionId("mob_wolf"), spawnGroupId: asSpawnGroupId("grp_wolves"), count: 3, respawnDelayTicks: 30 }], tags: ["forest", "starter"] },
  { id: WORLD_ZONE_IDS.swamp, name: "Dark Swamp", tier: 3, monsterSpawns: [{ definitionId: asMonsterDefinitionId("mob_undead"), spawnGroupId: asSpawnGroupId("grp_undead"), count: 2, respawnDelayTicks: 40 }], tags: ["swamp"] },
  { id: WORLD_ZONE_IDS.highland, name: "Stone Highlands", tier: 3, monsterSpawns: [{ definitionId: asMonsterDefinitionId("mob_keeper"), spawnGroupId: asSpawnGroupId("grp_highland"), count: 3, respawnDelayTicks: 45 }], tags: ["highland", "tier3"] },
  { id: WORLD_ZONE_IDS.steppe, name: "Golden Steppe", tier: 4, monsterSpawns: [{ definitionId: asMonsterDefinitionId("mob_heretic"), spawnGroupId: asSpawnGroupId("grp_steppe"), count: 3, respawnDelayTicks: 50 }], tags: ["steppe", "tier4"] },
  { id: WORLD_ZONE_IDS.mountain, name: "Frostpeak Mountain", tier: 4, monsterSpawns: [{ definitionId: asMonsterDefinitionId("mob_mountain_keeper"), spawnGroupId: asSpawnGroupId("grp_mountain"), count: 2, respawnDelayTicks: 60 }], tags: ["mountain", "tier4", "final"] },
];

export const BIOME_BY_ZONE = new Map([
  [WORLD_ZONE_IDS.forest, asBiomeId("biome_forest")],
  [WORLD_ZONE_IDS.swamp, asBiomeId("biome_swamp")],
  [WORLD_ZONE_IDS.highland, asBiomeId("biome_highland")],
  [WORLD_ZONE_IDS.steppe, asBiomeId("biome_steppe")],
  [WORLD_ZONE_IDS.mountain, asBiomeId("biome_mountain")],
]);

export const ZONE_UNLOCK_DEFINITIONS: readonly ZoneUnlockDefinition[] = [
  { zoneDefId: WORLD_ZONE_IDS.forest, conditions: [], unlockedByDefault: true },
  { zoneDefId: WORLD_ZONE_IDS.swamp, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.forest }] },
  { zoneDefId: WORLD_ZONE_IDS.highland, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.swamp }] },
  { zoneDefId: WORLD_ZONE_IDS.steppe, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.highland }] },
  { zoneDefId: WORLD_ZONE_IDS.mountain, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.steppe }] },
];

export const WORLD_ZONE_ORDER = Object.values(WORLD_ZONE_IDS);
