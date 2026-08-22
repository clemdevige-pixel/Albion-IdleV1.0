import { asMasteryId, type MasteryDefinitionLike, type MasteryId } from "@game/gameplay";

export const FACTION_MASTERY_MAX_LEVEL = 100;
export const FACTION_MASTERY_YIELD_PERCENT_PER_LEVEL = 0.5;

const SUPPORTED_FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

type SupportedFactionId = (typeof SUPPORTED_FACTIONS)[number];

/**
 * 44_FACTION_RESEARCH_EXPLORATION_SYSTEM §11.3:
 * cumulative XP at level L is 1,500 * L².
 * ExperienceTable expects the incremental cost for L-1 -> L.
 */
export const FACTION_MASTERY_XP_PER_LEVEL = Array.from(
  { length: FACTION_MASTERY_MAX_LEVEL },
  (_, index) => {
    const level = index + 1;
    const cumulativeAtLevel = 1_500 * level * level;
    const previousLevel = level - 1;
    const cumulativeBefore = 1_500 * previousLevel * previousLevel;
    return cumulativeAtLevel - cumulativeBefore;
  },
);

export const FACTION_MASTERY_IDS: Readonly<Record<SupportedFactionId, MasteryId>> = {
  keeper: asMasteryId("mastery_faction_keeper"),
  heretic: asMasteryId("mastery_faction_heretic"),
  undead: asMasteryId("mastery_faction_undead"),
  morgana: asMasteryId("mastery_faction_morgana"),
};

export const FACTION_MASTERY_DEFINITIONS: readonly MasteryDefinitionLike[] = SUPPORTED_FACTIONS.map(
  (factionId) => ({
    id: FACTION_MASTERY_IDS[factionId],
    category: "faction",
    maxLevel: FACTION_MASTERY_MAX_LEVEL,
    experiencePerLevel: FACTION_MASTERY_XP_PER_LEVEL,
  }),
);

export function normalizeFactionId(factionId: string): SupportedFactionId | undefined {
  const normalized = factionId.trim().toLowerCase();
  return SUPPORTED_FACTIONS.find((supported) => supported === normalized);
}

export function resolveFactionMasteryId(factionId: string): MasteryId | undefined {
  const normalized = normalizeFactionId(factionId);
  return normalized === undefined ? undefined : FACTION_MASTERY_IDS[normalized];
}

export function getFactionMasteryYieldBonusPercent(level: number): number {
  const clampedLevel = Math.max(0, Math.min(FACTION_MASTERY_MAX_LEVEL, Math.floor(level)));
  return clampedLevel * FACTION_MASTERY_YIELD_PERCENT_PER_LEVEL;
}

export function getFactionMasteryDisplayName(masteryId: string): string | undefined {
  const entry = Object.entries(FACTION_MASTERY_IDS).find(([, id]) => id === masteryId);
  if (entry === undefined) return undefined;
  const [factionId] = entry;
  const label = factionId.charAt(0).toUpperCase() + factionId.slice(1);
  return `Maîtrise ${label}`;
}
