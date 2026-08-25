export const FACTION_CAPE_TIERS = [4, 5, 6, 7, 8] as const;
export type FactionCapeTier = (typeof FACTION_CAPE_TIERS)[number];

export interface FactionCapeBalanceEntry {
  readonly tier: FactionCapeTier;
  readonly armor: number;
  readonly magicResistance: number;
  readonly clothQuantity: number;
  readonly leatherQuantity: number;
  readonly runeQuantity: number;
  readonly dungeonDamageReductionPercent: number;
}

/** Canonical authored faction-cape stats, craft quantities, and dungeon mitigation. */
export const FACTION_CAPE_BALANCE = [
  { tier: 4, armor: 3, magicResistance: 5, clothQuantity: 3, leatherQuantity: 1, runeQuantity: 3, dungeonDamageReductionPercent: 6 },
  { tier: 5, armor: 4, magicResistance: 7, clothQuantity: 4, leatherQuantity: 2, runeQuantity: 4, dungeonDamageReductionPercent: 8 },
  { tier: 6, armor: 6, magicResistance: 10, clothQuantity: 5, leatherQuantity: 2, runeQuantity: 5, dungeonDamageReductionPercent: 11 },
  { tier: 7, armor: 9, magicResistance: 14, clothQuantity: 6, leatherQuantity: 3, runeQuantity: 6, dungeonDamageReductionPercent: 14 },
  { tier: 8, armor: 13, magicResistance: 20, clothQuantity: 8, leatherQuantity: 4, runeQuantity: 8, dungeonDamageReductionPercent: 18 },
] as const satisfies readonly FactionCapeBalanceEntry[];

export const FACTION_CAPE_FACTIONS = [
  { factionId: "keeper", displayName: "Keeper" },
  { factionId: "heretic", displayName: "Heretic" },
  { factionId: "undead", displayName: "Undead" },
  { factionId: "morgana", displayName: "Morgana" },
] as const;
