import { getFactionRuneItemId, isFactionRuneTier } from "./faction-runes.js";
import type { WorldBandId } from "./world-bands.js";

export interface FactionRuneWorldDropZoneRate {
  readonly start: number;
  readonly end: number;
}

export const FACTION_RUNE_WORLD_ENCOUNTER_MULTIPLIERS = {
  normal: 1,
  elite: 2.5,
  boss: 5,
} as const;

/**
 * Tester-baseline final per-kill Rune probabilities for normal encounters.
 * Values are authored as final rates, not runtime multipliers, so consumers can
 * display the exact normal-encounter probability used by combat rolls for each depth.
 */
export const FACTION_RUNE_WORLD_DROP_RATES: Readonly<
  Record<WorldBandId, readonly FactionRuneWorldDropZoneRate[]>
> = {
  blue: [
    { start: 0, end: 0 },
    { start: 0, end: 0 },
    { start: 0, end: 0 },
    { start: 0.005, end: 0.0085 },
    { start: 0.0085, end: 0.0115 },
  ],
  yellow: [
    { start: 0.00564, end: 0.00677 },
    { start: 0.00715, end: 0.00903 },
    { start: 0.0094, end: 0.01129 },
    { start: 0.01166, end: 0.01354 },
    { start: 0.01392, end: 0.0158 },
  ],
  orange: [
    { start: 0.00904, end: 0.01105 },
    { start: 0.01155, end: 0.01356 },
    { start: 0.01407, end: 0.01457 },
    { start: 0.01557, end: 0.01808 },
    { start: 0.01909, end: 0.0216 },
  ],
  red: [
    { start: 0.01048, end: 0.01328 },
    { start: 0.01398, end: 0.01677 },
    { start: 0.01747, end: 0.01957 },
    { start: 0.02027, end: 0.02411 },
    { start: 0.02516, end: 0.029 },
  ],
  black: [
    { start: 0.01373, end: 0.01734 },
    { start: 0.01849, end: 0.02254 },
    { start: 0.0237, end: 0.02832 },
    { start: 0.02948, end: 0.0393 },
    { start: 0.0393, end: 0.0393 },
  ],
} as const;

const RUNE_ELIGIBLE_FACTIONS = new Set(["keeper", "heretic", "undead", "morgana"]);

export function isFactionRuneWorldDropEligibleFaction(factionId: string): boolean {
  return RUNE_ELIGIBLE_FACTIONS.has(factionId.trim().toLowerCase());
}

export function getFactionRuneWorldDropChance(
  bandId: WorldBandId,
  zoneIndexWithinBand: number,
  segmentIndex: number,
): number {
  const zone = FACTION_RUNE_WORLD_DROP_RATES[bandId][zoneIndexWithinBand];
  if (zone === undefined) return 0;
  const clampedSegment = Math.max(0, Math.min(9, Math.floor(segmentIndex)));
  const progress = clampedSegment / 9;
  return zone.start + (zone.end - zone.start) * progress;
}

export function getFactionRuneWorldEncounterMultiplier(isElite: boolean, isBoss: boolean): number {
  if (isBoss) return FACTION_RUNE_WORLD_ENCOUNTER_MULTIPLIERS.boss;
  if (isElite) return FACTION_RUNE_WORLD_ENCOUNTER_MULTIPLIERS.elite;
  return FACTION_RUNE_WORLD_ENCOUNTER_MULTIPLIERS.normal;
}

export interface FactionRuneWorldDrop {
  readonly itemId: string;
  readonly kind: "faction_rune";
  readonly quantity: 1;
}

export function getFactionRuneWorldDropExpectation(
  factionId: string,
  tier: number,
  chance: number,
): { readonly itemId: string; readonly expectedQuantity: number } | undefined {
  if (!isFactionRuneWorldDropEligibleFaction(factionId) || !isFactionRuneTier(tier)) return undefined;
  const expectedQuantity = Math.max(0, chance);
  if (expectedQuantity <= 0) return undefined;
  return { itemId: getFactionRuneItemId(tier), expectedQuantity };
}

export function rollFactionRuneWorldDrop(
  factionId: string,
  tier: number,
  baseChance: number,
  factionYieldBonusPercent: number,
  encounterMultiplier = 1,
  random: () => number = Math.random,
): FactionRuneWorldDrop | undefined {
  const expectation = getFactionRuneWorldDropExpectation(factionId, tier, baseChance);
  if (expectation === undefined) return undefined;
  const bonusMultiplier = 1 + Math.max(0, factionYieldBonusPercent) / 100;
  const finalChance = expectation.expectedQuantity * Math.max(0, encounterMultiplier) * bonusMultiplier;
  if (random() >= Math.min(1, finalChance)) return undefined;
  return { itemId: expectation.itemId, kind: "faction_rune", quantity: 1 };
}
