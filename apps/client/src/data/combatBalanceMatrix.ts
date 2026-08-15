import type { EnchantmentLevel } from "@game/gameplay";

export interface CombatBalanceSyntheticHeroDefinition {
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
}

export interface CombatBalanceLoadoutDefinition {
  readonly id: string;
  readonly label: string;
  readonly weaponItemId: string;
  readonly equipmentItemIds: readonly string[];
  readonly enchantment: EnchantmentLevel;
  readonly specializationMasteryLevel: number;
  readonly role: "diagnostic" | "guardrail";
}

export interface CombatBalanceCheckpointDefinition {
  readonly id: string;
  readonly label: string;
  readonly worldBandId: "blue";
  readonly zoneIndex: number;
  readonly segmentIndex: number;
}

export interface CombatBalanceReallocationDefinition {
  readonly id: string;
  readonly label: string;
  readonly hero: CombatBalanceSyntheticHeroDefinition;
  readonly equipmentStatMultiplier: CombatBalanceSyntheticHeroDefinition;
}

export const COMBAT_BALANCE_SYNTHETIC_HERO: CombatBalanceSyntheticHeroDefinition = {
  maxHealth: 500,
  armor: 10,
  magicResistance: 5,
};

export const COMBAT_BALANCE_LOADOUTS: readonly CombatBalanceLoadoutDefinition[] = [
  {
    id: "broadsword_t3_weapon_only",
    label: "Broadsword T3 · arme seule",
    weaponItemId: "item_weapon_sword_t3_broadsword",
    equipmentItemIds: [],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: "broadsword_t3_chest",
    label: "Broadsword T3 · + torse",
    weaponItemId: "item_weapon_sword_t3_broadsword",
    equipmentItemIds: ["item_leather_armor"],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: "broadsword_t3_core",
    label: "Broadsword T3 · casque + torse + bottes",
    weaponItemId: "item_weapon_sword_t3_broadsword",
    equipmentItemIds: ["item_iron_helmet", "item_leather_armor", "item_leather_boots"],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: "broadsword_t3_full",
    label: "Broadsword T3 · set complet",
    weaponItemId: "item_weapon_sword_t3_broadsword",
    equipmentItemIds: [
      "item_iron_helmet",
      "item_leather_armor",
      "item_leather_boots",
      "item_traveler_cape",
      "item_shield_t3_reinforced",
    ],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
  ...([0, 1, 2, 3] as const).map((enchantment) => ({
    id: `broadsword_t4_full_${String(enchantment)}`,
    label: `Broadsword T4.${String(enchantment)} · set T4 de référence`,
    weaponItemId: "item_weapon_sword_t4_broadsword",
    equipmentItemIds: [
      "item_helmet_t4_reinforced",
      "item_armor_t4_leather",
      "item_boots_t4_leather",
      "item_traveler_cape",
      "item_shield_t4_reinforced",
    ],
    enchantment,
    specializationMasteryLevel: 1,
    role: "guardrail" as const,
  })),
] as const;

export const COMBAT_BALANCE_CHECKPOINTS: readonly CombatBalanceCheckpointDefinition[] = [
  ...Array.from({ length: 10 }, (_, segmentIndex) => ({
    id: `forest_s${String(segmentIndex + 1)}`,
    label: `Birch Forest S${String(segmentIndex + 1)}`,
    worldBandId: "blue" as const,
    zoneIndex: 0,
    segmentIndex,
  })),
  ...Array.from({ length: 10 }, (_, segmentIndex) => ({
    id: `swamp_s${String(segmentIndex + 1)}`,
    label: `Dark Swamp S${String(segmentIndex + 1)}`,
    worldBandId: "blue" as const,
    zoneIndex: 1,
    segmentIndex,
  })),
] as const;

/**
 * Experimental real-stat reallocations. All defensive power moved onto items
 * remains genuine authored equipment power and therefore scales through normal
 * IP. Multipliers are solved backwards so full T4.3 remains exactly on the
 * current defensive ceiling (688.5 HP / 65.9 Armor / 46.7 MR).
 */
export const COMBAT_BALANCE_REALLOCATIONS: readonly CombatBalanceReallocationDefinition[] = [
  {
    id: "current",
    label: "Actuel",
    hero: { maxHealth: 500, armor: 10, magicResistance: 5 },
    equipmentStatMultiplier: { maxHealth: 1, armor: 1, magicResistance: 1 },
  },
  {
    id: "reallocation_light",
    label: "Réallocation légère",
    hero: { maxHealth: 440, armor: 8, magicResistance: 4 },
    equipmentStatMultiplier: {
      maxHealth: 1.3183023872679045,
      armor: 1.0357781753130593,
      magicResistance: 1.023980815347722,
    },
  },
  {
    id: "reallocation_medium",
    label: "Réallocation moyenne",
    hero: { maxHealth: 400, armor: 6, magicResistance: 3 },
    equipmentStatMultiplier: {
      maxHealth: 1.530503978779841,
      armor: 1.071556350626118,
      magicResistance: 1.0479616306954436,
    },
  },
  {
    id: "reallocation_strong",
    label: "Réallocation forte",
    hero: { maxHealth: 360, armor: 4, magicResistance: 2 },
    equipmentStatMultiplier: {
      maxHealth: 1.742705570291777,
      armor: 1.1073345259391771,
      magicResistance: 1.0719424460431655,
    },
  },
  {
    id: "reallocation_probe_340",
    label: "Seuil 340 HP",
    hero: { maxHealth: 340, armor: 3, magicResistance: 1.5 },
    equipmentStatMultiplier: {
      maxHealth: 1.8488063660477454,
      armor: 1.1252236135957068,
      magicResistance: 1.0839328537170263,
    },
  },
  {
    id: "reallocation_probe_320",
    label: "Seuil 320 HP",
    hero: { maxHealth: 320, armor: 2, magicResistance: 1 },
    equipmentStatMultiplier: {
      maxHealth: 1.9549071618037135,
      armor: 1.1431127012522362,
      magicResistance: 1.0959232613908874,
    },
  },
] as const;
