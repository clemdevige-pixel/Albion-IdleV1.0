export type WorldProgressionTier = 4 | 5 | 6 | 7 | 8;
export type WorldProgressionSourceTier = 4 | 5 | 6 | 7;
export type WorldProgressionBandId = "blue" | "yellow" | "orange" | "red" | "black";
export type WorldProgressionEnchantment = 0 | 1 | 2 | 3;
export type WorldProgressionZoneRole = "progression" | "transition_plateau" | "final_gate" | "endgame";

export interface WorldProgressionLoadoutRequirement {
  readonly gearTier: WorldProgressionTier;
  readonly enchantment: WorldProgressionEnchantment;
  readonly masteryLevel: number;
}

export interface WorldProgressionZoneContract {
  readonly zoneIndex: number;
  readonly role: WorldProgressionZoneRole;
  readonly expected: WorldProgressionLoadoutRequirement;
}

export interface WorldProgressionTierContract {
  readonly tier: WorldProgressionTier;
  readonly band: WorldProgressionBandId;
  readonly zones: readonly WorldProgressionZoneContract[];
}

export interface WorldTierTransitionContract {
  readonly sourceTier: WorldProgressionSourceTier;
  readonly finalZoneIndex: number;
  readonly nextTierFirstZoneIndex: number;
  readonly masteryLevel: number;
  readonly blockedEnchantment: 2;
  readonly requiredEnchantment: 3;
  readonly plateauMinSegments: number;
  readonly plateauMaxSegmentWithPotion: number;
}

const makeTierZones = (
  tier: WorldProgressionTier,
  masteryBase: number,
): readonly WorldProgressionZoneContract[] => [
  { zoneIndex: 0, role: "transition_plateau", expected: { gearTier: tier, enchantment: 0, masteryLevel: masteryBase } },
  { zoneIndex: 1, role: "progression", expected: { gearTier: tier, enchantment: 0, masteryLevel: masteryBase + 2 } },
  { zoneIndex: 2, role: "progression", expected: { gearTier: tier, enchantment: 1, masteryLevel: masteryBase + 4 } },
  { zoneIndex: 3, role: "progression", expected: { gearTier: tier, enchantment: 2, masteryLevel: masteryBase + 7 } },
  { zoneIndex: 4, role: "final_gate", expected: { gearTier: tier, enchantment: 2, masteryLevel: masteryBase + 10 } },
];

export const WORLD_PROGRESSION_CONTRACT: Readonly<Record<WorldProgressionTier, WorldProgressionTierContract>> = {
  4: {
    tier: 4,
    band: "blue",
    zones: [
      { zoneIndex: 3, role: "progression", expected: { gearTier: 4, enchantment: 1, masteryLevel: 25 } },
      { zoneIndex: 4, role: "final_gate", expected: { gearTier: 4, enchantment: 2, masteryLevel: 30 } },
    ],
  },
  5: { tier: 5, band: "yellow", zones: makeTierZones(5, 25) },
  6: { tier: 6, band: "orange", zones: makeTierZones(6, 40) },
  7: { tier: 7, band: "red", zones: makeTierZones(7, 55) },
  8: {
    tier: 8,
    band: "black",
    zones: [
      { zoneIndex: 0, role: "transition_plateau", expected: { gearTier: 8, enchantment: 0, masteryLevel: 70 } },
      { zoneIndex: 1, role: "progression", expected: { gearTier: 8, enchantment: 0, masteryLevel: 72 } },
      { zoneIndex: 2, role: "progression", expected: { gearTier: 8, enchantment: 1, masteryLevel: 74 } },
      { zoneIndex: 3, role: "progression", expected: { gearTier: 8, enchantment: 2, masteryLevel: 77 } },
      { zoneIndex: 4, role: "endgame", expected: { gearTier: 8, enchantment: 2, masteryLevel: 80 } },
    ],
  },
} as const;

export const WORLD_TIER_TRANSITION_CONTRACTS: Readonly<Record<WorldProgressionSourceTier, WorldTierTransitionContract>> = {
  4: { sourceTier: 4, finalZoneIndex: 4, nextTierFirstZoneIndex: 0, masteryLevel: 30, blockedEnchantment: 2, requiredEnchantment: 3, plateauMinSegments: 3, plateauMaxSegmentWithPotion: 9 },
  5: { sourceTier: 5, finalZoneIndex: 4, nextTierFirstZoneIndex: 0, masteryLevel: 35, blockedEnchantment: 2, requiredEnchantment: 3, plateauMinSegments: 3, plateauMaxSegmentWithPotion: 9 },
  6: { sourceTier: 6, finalZoneIndex: 4, nextTierFirstZoneIndex: 0, masteryLevel: 50, blockedEnchantment: 2, requiredEnchantment: 3, plateauMinSegments: 3, plateauMaxSegmentWithPotion: 9 },
  7: { sourceTier: 7, finalZoneIndex: 4, nextTierFirstZoneIndex: 0, masteryLevel: 65, blockedEnchantment: 2, requiredEnchantment: 3, plateauMinSegments: 3, plateauMaxSegmentWithPotion: 9 },
} as const;

export function getWorldProgressionTierContract(tier: WorldProgressionTier): WorldProgressionTierContract {
  return WORLD_PROGRESSION_CONTRACT[tier];
}

export function getWorldProgressionZoneContract(tier: WorldProgressionTier, zoneIndex: number): WorldProgressionZoneContract {
  const zone = WORLD_PROGRESSION_CONTRACT[tier].zones.find((entry) => entry.zoneIndex === zoneIndex);
  if (zone === undefined) throw new Error(`Missing world progression contract for T${String(tier)} zone index ${String(zoneIndex)}`);
  return zone;
}

export function getWorldTierTransitionContract(sourceTier: WorldProgressionSourceTier): WorldTierTransitionContract {
  return WORLD_TIER_TRANSITION_CONTRACTS[sourceTier];
}
