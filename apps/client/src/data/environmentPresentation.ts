const ENVIRONMENT_BY_ZONE_ID: Readonly<Record<string, string>> = {
  zone_forest_t3: "forest_blue",
  zone_swamp_t3: "swamp_blue",
  zone_highland_t3: "highland_blue",
  zone_steppe_t4: "steppe_blue",
  zone_mountain_t4: "mountain_blue",
  zone_amberwood_t5: "birch_forest",
  zone_gloamfen_t5: "birch_forest",
  zone_stormwatch_t5: "birch_forest",
  zone_sunscar_t5: "birch_forest",
  zone_ironveil_t5: "birch_forest",
};

/** Presentation metadata boundary for world environments. */
export function resolveEnvironmentPresentation(
  zoneDefinitionId: string,
): string {
  return ENVIRONMENT_BY_ZONE_ID[zoneDefinitionId] ?? "birch_forest";
}
