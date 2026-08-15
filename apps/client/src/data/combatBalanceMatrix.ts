import type { EnchantmentLevel, EquipmentInfoLike } from "@game/gameplay";

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

export interface CombatBalanceCoverageInterventionDefinition {
  readonly id: string;
  readonly label: string;
  /** Base power removed from the naked hero before equipment is applied. */
  readonly heroReduction: CombatBalanceSyntheticHeroDefinition;
  /** Slots that restore the removed baseline independently from item tier/IP. */
  readonly recoverySlots: readonly EquipmentInfoLike["slot"][];
  /** Fixed, non-IP-scaled recovery granted by each authored recovery slot. */
  readonly recoveryPerEquippedSlot: CombatBalanceSyntheticHeroDefinition;
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
 * Experimental coverage candidates. They do not change item stats or IP.
 * Every non-baseline candidate removes a slice of naked-hero defense, then
 * restores exactly that slice across head/chest/boots. Therefore a fully
 * equipped core set retains the current defensive baseline by construction.
 */
export const COMBAT_BALANCE_COVERAGE_INTERVENTIONS: readonly CombatBalanceCoverageInterventionDefinition[] = [
  {
    id: "current",
    label: "Actuel",
    heroReduction: { maxHealth: 0, armor: 0, magicResistance: 0 },
    recoverySlots: ["head", "chest", "boots"],
    recoveryPerEquippedSlot: { maxHealth: 0, armor: 0, magicResistance: 0 },
  },
  {
    id: "coverage_light",
    label: "Couverture légère",
    heroReduction: { maxHealth: 60, armor: 3, magicResistance: 1.5 },
    recoverySlots: ["head", "chest", "boots"],
    recoveryPerEquippedSlot: { maxHealth: 20, armor: 1, magicResistance: 0.5 },
  },
  {
    id: "coverage_medium",
    label: "Couverture moyenne",
    heroReduction: { maxHealth: 120, armor: 6, magicResistance: 3 },
    recoverySlots: ["head", "chest", "boots"],
    recoveryPerEquippedSlot: { maxHealth: 40, armor: 2, magicResistance: 1 },
  },
  {
    id: "coverage_strong",
    label: "Couverture forte",
    heroReduction: { maxHealth: 180, armor: 9, magicResistance: 4.5 },
    recoverySlots: ["head", "chest", "boots"],
    recoveryPerEquippedSlot: { maxHealth: 60, armor: 3, magicResistance: 1.5 },
  },
] as const;
