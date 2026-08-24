import { getFactionRuneItemId, isFactionRuneTier } from "./faction-runes.js";
import type { WorldBandId } from "./world-bands.js";

export interface FactionRuneWorldDropZoneRate {
  readonly start: number;
  readonly end: number;
}

/**
 * Tester-baseline final per-kill Rune probabilities.
 * Values are authored as final rates, not runtime multipliers, so consumers can
 * display the exact probability used by combat rolls for each depth.
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
    { start: 0.0075, end: 0.009 },
    { start: 0.0095, end: 0.012 },
    { start: 0.0125, end: 0.015 },
    { start: 0.0155, end: 0.018 },
    { start: 0.0185, end: 0.021 },
  ],
  orange: [
    { start: 0.018, end: 0.022 },
    { start: 0.023, end: 0.027 },
    { start: 0.028, end: 0.029 },
    { start: 0.031, end: 0.036 },
    { start: 0.038, end: 0.043 },
  ],
  red: [
    { start: 0.03, end: 0.038 },
    { start: 0.04, end: 0.048 },
    { start: 0.05, end: 0.056 },
    { start: 0.058, end: 0.069 },
    { start: 0.072, end: 0.083 },
  ],
  black: [
    { start: 0.0475, end: 0.06 },
    { start: 0.064, end: 0.078 },
    { start: 0.082, end: 0.098 },
    { start: 0.102, end: 0.136 },
    { start: 0.136, end: 0.136 },
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
  random: () => number = Math.random,
): FactionRuneWorldDrop | undefined {
  const expectation = getFactionRuneWorldDropExpectation(factionId, tier, baseChance);
  if (expectation === undefined) return undefined;
  const bonusMultiplier = 1 + Math.max(0, factionYieldBonusPercent) / 100;
  const finalChance = expectation.expectedQuantity * bonusMultiplier;
  if (random() >= Math.min(1, finalChance)) return undefined;
  return { itemId: expectation.itemId, kind: "faction_rune", quantity: 1 };
}
