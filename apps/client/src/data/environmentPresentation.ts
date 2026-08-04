const ENVIRONMENT_BY_ZONE_ID: Readonly<Record<string, string>> = {
  zone_forest_t3: "birch_forest",
  zone_swamp_t3: "birch_forest",
  zone_highland_t3: "birch_forest",
  zone_steppe_t4: "birch_forest",
  zone_mountain_t4: "birch_forest",
};

/** Presentation metadata boundary for world environments. */
export function resolveEnvironmentPresentation(
  zoneDefinitionId: string,
): string {
  return ENVIRONMENT_BY_ZONE_ID[zoneDefinitionId] ?? "birch_forest";
}
