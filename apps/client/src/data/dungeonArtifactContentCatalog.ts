export type DungeonArtifactTier = 4 | 5 | 6 | 7 | 8;
export type DungeonArtifactFactionId = "keeper" | "heretic" | "undead" | "morgana";

export const DUNGEON_ARTIFACT_TIERS: readonly DungeonArtifactTier[] = [4, 5, 6, 7, 8] as const;
export const DUNGEON_ARTIFACT_FACTIONS: readonly DungeonArtifactFactionId[] = [
  "keeper",
  "heretic",
  "undead",
  "morgana",
] as const;

function assertDungeonArtifactTier(tier: number): DungeonArtifactTier {
  if (tier !== 4 && tier !== 5 && tier !== 6 && tier !== 7 && tier !== 8) {
    throw new Error(`Unsupported dungeon artifact tier: ${String(tier)}`);
  }
  return tier;
}

function assertDungeonArtifactFaction(faction: string): DungeonArtifactFactionId {
  if (
    faction !== "keeper"
    && faction !== "heretic"
    && faction !== "undead"
    && faction !== "morgana"
  ) {
    throw new Error(`Unsupported dungeon artifact faction: ${faction}`);
  }
  return faction;
}

/**
 * T4 keeps the original IDs for save compatibility. T5-T8 are tier-specific so
 * lower-tier dungeon loot can never be converted into higher-tier artifacts.
 */
export function getDungeonArtifactFragmentItemId(faction: string, tier: number): string {
  const safeFaction = assertDungeonArtifactFaction(faction);
  const safeTier = assertDungeonArtifactTier(tier);
  return safeTier === 4
    ? `item_resource_artifact_fragment_${safeFaction}`
    : `item_resource_artifact_fragment_${safeFaction}_t${String(safeTier)}`;
}

/** T4 keeps the original IDs for save compatibility; T5-T8 are distinct items. */
export function getDungeonArtifactItemId(faction: string, tier: number): string {
  const safeFaction = assertDungeonArtifactFaction(faction);
  const safeTier = assertDungeonArtifactTier(tier);
  return safeTier === 4
    ? `item_resource_artifact_${safeFaction}`
    : `item_resource_artifact_${safeFaction}_t${String(safeTier)}`;
}
