const ENVIRONMENT_BY_ZONE_ID: Readonly<Record<string, string>> = {
  zone_forest_t3: "forest_blue",
  zone_swamp_t3: "swamp_blue",
  zone_highland_t3: "highland_blue",
  zone_steppe_t4: "steppe_blue",
  zone_mountain_t4: "mountain_blue",

  zone_amberwood_t5: "forest_blue",
  zone_gloamfen_t5: "swamp_blue",
  zone_stormwatch_t5: "highland_blue",
  zone_sunscar_t5: "steppe_blue",
  zone_ironveil_t5: "mountain_blue",

  zone_cinderwood_t6: "forest_blue",
  zone_rotfen_t6: "swamp_blue",
  zone_thundercrag_t6: "highland_blue",
  zone_emberwind_t6: "steppe_blue",
  zone_ashenpeak_t6: "mountain_blue",

  zone_bloodwood_t7: "forest_blue",
  zone_dreadfen_t7: "swamp_blue",
  zone_redspire_t7: "highland_blue",
  zone_crimson_steppe_t7: "steppe_blue",
  zone_doompeak_t7: "mountain_blue",

  zone_blackwood_t8: "forest_blue",
  zone_shadowfen_t8: "swamp_blue",
  zone_obsidian_highlands_t8: "highland_blue",
  zone_duskfall_steppe_t8: "steppe_blue",
  zone_blackspire_t8: "mountain_blue",
};

/** Presentation metadata boundary for world environments. */
export function resolveEnvironmentPresentation(
  zoneDefinitionId: string,
): string {
  return ENVIRONMENT_BY_ZONE_ID[zoneDefinitionId] ?? "birch_forest";
}
