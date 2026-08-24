export const FACTION_RUNE_TIERS = [4, 5, 6, 7, 8] as const;
export type FactionRuneTier = (typeof FACTION_RUNE_TIERS)[number];

export function isFactionRuneTier(tier: number): tier is FactionRuneTier {
  return FACTION_RUNE_TIERS.includes(tier as FactionRuneTier);
}

/** One tiered Rune family shared by every faction-related craft and expedition. */
export function getFactionRuneItemId(tier: FactionRuneTier): string {
  return `item_resource_rune_faction_t${String(tier)}`;
}

const LEGACY_FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

/**
 * Legacy IDs are retained as migration metadata only. New content must never
 * author or reward these faction-specific rune stacks.
 */
export const LEGACY_FACTION_RUNE_MIGRATIONS = Object.fromEntries(
  LEGACY_FACTIONS.flatMap((factionId) => FACTION_RUNE_TIERS.map((tier) => [
    `item_resource_rune_${factionId}_t${String(tier)}`,
    getFactionRuneItemId(tier),
  ])),
) as Readonly<Record<string, string>>;
