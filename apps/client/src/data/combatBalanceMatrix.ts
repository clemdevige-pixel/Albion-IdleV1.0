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
  /** Zero-based index inside the authored world-band combat curve. */
  readonly zoneIndex: number;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
}

/**
 * Synthetic player envelope used by the balancing process.
 *
 * This mirrors the current runtime hero baseline so the diagnostic can isolate
 * the marginal value of equipment. It intentionally lives in balance data,
 * never inside test control flow. If the runtime baseline changes, this catalog
 * must be updated in the same balancing pass.
 */
export const COMBAT_BALANCE_SYNTHETIC_HERO: CombatBalanceSyntheticHeroDefinition = {
  maxHealth: 500,
  armor: 10,
  magicResistance: 5,
};

/**
 * Representative one-handed progression route.
 *
 * The matrix is intentionally authored as data: adding another weapon family,
 * partial-set breakpoint or enchantment state requires only another entry.
 */
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
  {
    id: "broadsword_t4_full_0",
    label: "Broadsword T4.0 · set T4 de référence",
    weaponItemId: "item_weapon_sword_t4_broadsword",
    equipmentItemIds: [
      "item_helmet_t4_reinforced",
      "item_armor_t4_leather",
      "item_boots_t4_leather",
      "item_traveler_cape",
      "item_shield_t4_reinforced",
    ],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
  {
    id: "broadsword_t4_full_1",
    label: "Broadsword T4.1 · set T4 enchanté .1",
    weaponItemId: "item_weapon_sword_t4_broadsword",
    equipmentItemIds: [
      "item_helmet_t4_reinforced",
      "item_armor_t4_leather",
      "item_boots_t4_leather",
      "item_traveler_cape",
      "item_shield_t4_reinforced",
    ],
    enchantment: 1,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
  {
    id: "broadsword_t4_full_2",
    label: "Broadsword T4.2 · set T4 enchanté .2",
    weaponItemId: "item_weapon_sword_t4_broadsword",
    equipmentItemIds: [
      "item_helmet_t4_reinforced",
      "item_armor_t4_leather",
      "item_boots_t4_leather",
      "item_traveler_cape",
      "item_shield_t4_reinforced",
    ],
    enchantment: 2,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
  {
    id: "broadsword_t4_full_3",
    label: "Broadsword T4.3 · set T4 enchanté .3",
    weaponItemId: "item_weapon_sword_t4_broadsword",
    equipmentItemIds: [
      "item_helmet_t4_reinforced",
      "item_armor_t4_leather",
      "item_boots_t4_leather",
      "item_traveler_cape",
      "item_shield_t4_reinforced",
    ],
    enchantment: 3,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
] as const;

/**
 * Diagnostic checkpoints intentionally cover every early Blue segment.
 * Tests iterate these definitions and never own zone/segment thresholds.
 */
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
