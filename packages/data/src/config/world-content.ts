import type { WorldBandId } from "./world-bands.js";

export interface AuthoredWorldZoneContentDefinition {
  readonly id: string;
  readonly name: string;
  readonly bandId: WorldBandId;
  readonly tier: number;
  readonly biomeId: string;
  readonly spawnGroupPrefix: string;
  readonly respawnDelayTicks: number;
  readonly tags: readonly string[];
}

export interface AuthoredBiomeDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  readonly difficultyModifier: number;
  readonly enemyFamilies: readonly string[];
  readonly resourceFamilies: readonly string[];
  readonly encounterPoolId: string;
  readonly visualThemeId: string;
  readonly ambientAudioId: string;
  readonly musicPlaylistId: string;
  readonly weather: string;
  readonly lighting: string;
  readonly decorationDensity: string;
  readonly tags: readonly string[];
}

export const WORLD_ZONE_CONTENT = {
  forest: { id: "zone_forest_t3", name: "Birch Forest", bandId: "blue", tier: 3, biomeId: "biome_forest", spawnGroupPrefix: "grp_forest", respawnDelayTicks: 30, tags: ["forest", "starter"] },
  swamp: { id: "zone_swamp_t3", name: "Dark Swamp", bandId: "blue", tier: 3, biomeId: "biome_swamp", spawnGroupPrefix: "grp_swamp", respawnDelayTicks: 40, tags: ["swamp"] },
  highland: { id: "zone_highland_t3", name: "Stone Highlands", bandId: "blue", tier: 3, biomeId: "biome_highland", spawnGroupPrefix: "grp_highland", respawnDelayTicks: 45, tags: ["highland", "tier3"] },
  steppe: { id: "zone_steppe_t4", name: "Golden Steppe", bandId: "blue", tier: 4, biomeId: "biome_steppe", spawnGroupPrefix: "grp_steppe", respawnDelayTicks: 50, tags: ["steppe", "tier4"] },
  mountain: { id: "zone_mountain_t4", name: "Frostpeak Mountain", bandId: "blue", tier: 4, biomeId: "biome_mountain", spawnGroupPrefix: "grp_mountain", respawnDelayTicks: 60, tags: ["mountain", "tier4", "final"] },
  amberwood: { id: "zone_amberwood_t5", name: "Amberwood Forest", bandId: "yellow", tier: 5, biomeId: "biome_forest", spawnGroupPrefix: "grp_amberwood", respawnDelayTicks: 65, tags: ["forest", "yellow", "tier5", "starter"] },
  gloamfen: { id: "zone_gloamfen_t5", name: "Gloamfen Marsh", bandId: "yellow", tier: 5, biomeId: "biome_swamp", spawnGroupPrefix: "grp_gloamfen", respawnDelayTicks: 70, tags: ["swamp", "yellow", "tier5"] },
  stormwatch: { id: "zone_stormwatch_t5", name: "Stormwatch Highlands", bandId: "yellow", tier: 5, biomeId: "biome_highland", spawnGroupPrefix: "grp_stormwatch", respawnDelayTicks: 75, tags: ["highland", "yellow", "tier5"] },
  sunscar: { id: "zone_sunscar_t5", name: "Sunscar Steppe", bandId: "yellow", tier: 5, biomeId: "biome_steppe", spawnGroupPrefix: "grp_sunscar", respawnDelayTicks: 80, tags: ["steppe", "yellow", "tier5"] },
  ironveil: { id: "zone_ironveil_t5", name: "Ironveil Peaks", bandId: "yellow", tier: 5, biomeId: "biome_mountain", spawnGroupPrefix: "grp_ironveil", respawnDelayTicks: 85, tags: ["mountain", "yellow", "tier5", "final"] },
  cinderwood: { id: "zone_cinderwood_t6", name: "Cinderwood Forest", bandId: "orange", tier: 6, biomeId: "biome_forest", spawnGroupPrefix: "grp_cinderwood", respawnDelayTicks: 90, tags: ["forest", "orange", "tier6", "starter"] },
  rotfen: { id: "zone_rotfen_t6", name: "Rotfen Marsh", bandId: "orange", tier: 6, biomeId: "biome_swamp", spawnGroupPrefix: "grp_rotfen", respawnDelayTicks: 95, tags: ["swamp", "orange", "tier6"] },
  thundercrag: { id: "zone_thundercrag_t6", name: "Thundercrag Highlands", bandId: "orange", tier: 6, biomeId: "biome_highland", spawnGroupPrefix: "grp_thundercrag", respawnDelayTicks: 100, tags: ["highland", "orange", "tier6"] },
  emberwind: { id: "zone_emberwind_t6", name: "Emberwind Steppe", bandId: "orange", tier: 6, biomeId: "biome_steppe", spawnGroupPrefix: "grp_emberwind", respawnDelayTicks: 105, tags: ["steppe", "orange", "tier6"] },
  ashenpeak: { id: "zone_ashenpeak_t6", name: "Ashenpeak Mountain", bandId: "orange", tier: 6, biomeId: "biome_mountain", spawnGroupPrefix: "grp_ashenpeak", respawnDelayTicks: 110, tags: ["mountain", "orange", "tier6", "final"] },
  bloodwood: { id: "zone_bloodwood_t7", name: "Bloodwood Forest", bandId: "red", tier: 7, biomeId: "biome_forest", spawnGroupPrefix: "grp_bloodwood", respawnDelayTicks: 115, tags: ["forest", "red", "tier7", "starter"] },
  dreadfen: { id: "zone_dreadfen_t7", name: "Dreadfen Marsh", bandId: "red", tier: 7, biomeId: "biome_swamp", spawnGroupPrefix: "grp_dreadfen", respawnDelayTicks: 120, tags: ["swamp", "red", "tier7"] },
  redspire: { id: "zone_redspire_t7", name: "Redspire Highlands", bandId: "red", tier: 7, biomeId: "biome_highland", spawnGroupPrefix: "grp_redspire", respawnDelayTicks: 125, tags: ["highland", "red", "tier7"] },
  crimsonSteppe: { id: "zone_crimson_steppe_t7", name: "Crimson Steppe", bandId: "red", tier: 7, biomeId: "biome_steppe", spawnGroupPrefix: "grp_crimson_steppe", respawnDelayTicks: 130, tags: ["steppe", "red", "tier7"] },
  doompeak: { id: "zone_doompeak_t7", name: "Doompeak Mountain", bandId: "red", tier: 7, biomeId: "biome_mountain", spawnGroupPrefix: "grp_doompeak", respawnDelayTicks: 135, tags: ["mountain", "red", "tier7", "final"] },
  blackwood: { id: "zone_blackwood_t8", name: "Blackwood Forest", bandId: "black", tier: 8, biomeId: "biome_forest", spawnGroupPrefix: "grp_blackwood", respawnDelayTicks: 140, tags: ["forest", "black", "tier8", "starter"] },
  shadowfen: { id: "zone_shadowfen_t8", name: "Shadowfen Marsh", bandId: "black", tier: 8, biomeId: "biome_swamp", spawnGroupPrefix: "grp_shadowfen", respawnDelayTicks: 145, tags: ["swamp", "black", "tier8"] },
  obsidianHighlands: { id: "zone_obsidian_highlands_t8", name: "Obsidian Highlands", bandId: "black", tier: 8, biomeId: "biome_highland", spawnGroupPrefix: "grp_obsidian_highlands", respawnDelayTicks: 150, tags: ["highland", "black", "tier8"] },
  duskfallSteppe: { id: "zone_duskfall_steppe_t8", name: "Duskfall Steppe", bandId: "black", tier: 8, biomeId: "biome_steppe", spawnGroupPrefix: "grp_duskfall_steppe", respawnDelayTicks: 155, tags: ["steppe", "black", "tier8"] },
  blackspire: { id: "zone_blackspire_t8", name: "Blackspire Mountain", bandId: "black", tier: 8, biomeId: "biome_mountain", spawnGroupPrefix: "grp_blackspire", respawnDelayTicks: 160, tags: ["mountain", "black", "tier8", "final"] },
} as const satisfies Readonly<Record<string, AuthoredWorldZoneContentDefinition>>;

export const BIOME_DEFINITIONS = [
  { id: "biome_forest", name: "Forest", theme: "Nature", difficultyModifier: 0.72, enemyFamilies: ["Animal", "Keeper"], resourceFamilies: ["Wood", "Hide"], encounterPoolId: "encounter_pool_forest", visualThemeId: "visual_forest", ambientAudioId: "audio_forest", musicPlaylistId: "music_forest", weather: "None", lighting: "Day", decorationDensity: "Normal", tags: ["nature", "starter"] },
  { id: "biome_swamp", name: "Swamp", theme: "Undead", difficultyModifier: 0.88, enemyFamilies: ["Undead"], resourceFamilies: ["Fiber"], encounterPoolId: "encounter_pool_swamp", visualThemeId: "visual_swamp", ambientAudioId: "audio_swamp", musicPlaylistId: "music_swamp", weather: "Rain", lighting: "Foggy", decorationDensity: "Dense", tags: ["undead"] },
  { id: "biome_highland", name: "Highland", theme: "Royal", difficultyModifier: 1.04, enemyFamilies: ["Keeper", "Heretic"], resourceFamilies: ["Stone", "Ore"], encounterPoolId: "encounter_pool_highland", visualThemeId: "visual_highland", ambientAudioId: "audio_highland", musicPlaylistId: "music_highland", weather: "Wind", lighting: "Day", decorationDensity: "Sparse", tags: ["highland", "tier3", "checkpoint"] },
  { id: "biome_steppe", name: "Steppe", theme: "Demonic", difficultyModifier: 1.22, enemyFamilies: ["Heretic", "Animal"], resourceFamilies: ["Hide", "Fiber"], encounterPoolId: "encounter_pool_steppe", visualThemeId: "visual_steppe", ambientAudioId: "audio_steppe", musicPlaylistId: "music_steppe", weather: "Dry", lighting: "Sunset", decorationDensity: "Sparse", tags: ["steppe", "tier4", "transition"] },
  { id: "biome_mountain", name: "Mountain", theme: "Frozen", difficultyModifier: 1.42, enemyFamilies: ["Keeper", "Demon"], resourceFamilies: ["Ore", "Stone"], encounterPoolId: "encounter_pool_mountain", visualThemeId: "visual_mountain", ambientAudioId: "audio_mountain", musicPlaylistId: "music_mountain", weather: "Snow", lighting: "Cold", decorationDensity: "Normal", tags: ["mountain", "tier4", "final"] },
] as const satisfies readonly AuthoredBiomeDefinition[];
