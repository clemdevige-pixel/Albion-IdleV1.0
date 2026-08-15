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
  readonly offHandStatMultiplier: CombatBalanceSyntheticHeroDefinition;
}

export const COMBAT_BALANCE_SYNTHETIC_HERO: CombatBalanceSyntheticHeroDefinition = {
  maxHealth: 500,
  armor: 10,
  magicResistance: 5,
};

const T3_CORE = ["item_iron_helmet", "item_leather_armor", "item_leather_boots"] as const;
const T4_CORE = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather"] as const;
const CAPE = "item_traveler_cape" as const;

type BalanceWeaponPrefix = "broadsword" | "longbow" | "infernal";

const getWeaponLabel = (prefix: BalanceWeaponPrefix): string => {
  if (prefix === "broadsword") return "Broadsword";
  if (prefix === "longbow") return "Longbow";
  return "Infernal Staff";
};

const makeT3Diagnostics = (
  prefix: BalanceWeaponPrefix,
  weaponItemId: string,
  includeShield: boolean,
): readonly CombatBalanceLoadoutDefinition[] => [
  {
    id: `${prefix}_t3_weapon_only`,
    label: `${getWeaponLabel(prefix)} T3 · arme seule`,
    weaponItemId,
    equipmentItemIds: [],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: `${prefix}_t3_chest`,
    label: `${getWeaponLabel(prefix)} T3 · + torse`,
    weaponItemId,
    equipmentItemIds: ["item_leather_armor"],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: `${prefix}_t3_core`,
    label: `${getWeaponLabel(prefix)} T3 · casque + torse + bottes`,
    weaponItemId,
    equipmentItemIds: T3_CORE,
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "diagnostic",
  },
  {
    id: `${prefix}_t3_full`,
    label: `${getWeaponLabel(prefix)} T3 · set complet`,
    weaponItemId,
    equipmentItemIds: [
      ...T3_CORE,
      CAPE,
      ...(includeShield ? ["item_shield_t3_reinforced"] : []),
    ],
    enchantment: 0,
    specializationMasteryLevel: 1,
    role: "guardrail",
  },
];

const makeT4Guardrails = (
  prefix: BalanceWeaponPrefix,
  weaponItemId: string,
  includeShield: boolean,
): readonly CombatBalanceLoadoutDefinition[] => ([0, 1, 2, 3] as const).map((enchantment) => ({
  id: `${prefix}_t4_full_${String(enchantment)}`,
  label: `${getWeaponLabel(prefix)} T4.${String(enchantment)} · set T4 de référence`,
  weaponItemId,
  equipmentItemIds: [
    ...T4_CORE,
    CAPE,
    ...(includeShield ? ["item_shield_t4_reinforced"] : []),
  ],
  enchantment,
  specializationMasteryLevel: 1,
  role: "guardrail" as const,
}));

export const COMBAT_BALANCE_LOADOUTS: readonly CombatBalanceLoadoutDefinition[] = [
  ...makeT3Diagnostics("broadsword", "item_weapon_sword_t3_broadsword", true),
  ...makeT4Guardrails("broadsword", "item_weapon_sword_t4_broadsword", true),
  ...makeT3Diagnostics("longbow", "item_weapon_bow_t3_longbow", false),
  ...makeT4Guardrails("longbow", "item_weapon_bow_t4_longbow", false),
  ...makeT3Diagnostics("infernal", "item_weapon_staff_t3_infernal", false),
  ...makeT4Guardrails("infernal", "item_weapon_staff_t4_infernal", false),
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
 * Experimental real-stat reallocations.
 *
 * Core armor and off-hand are solved independently so the current T4.3 ceiling
 * is preserved for BOTH weapon handling models:
 * - 2H physical/magical: head + chest + boots + cape, no off-hand;
 * - 1H: same core set + reinforced shield.
 *
 * This keeps every moved stat as real authored equipment power, fully scalable
 * through normal IP, while preventing a Broadsword+shield calibration from
 * silently nerfing two-handed weapons.
 */
const makeReallocation = (
  id: string,
  label: string,
  hero: CombatBalanceSyntheticHeroDefinition,
): CombatBalanceReallocationDefinition => ({
  id,
  label,
  hero,
  equipmentStatMultiplier: {
    // Current 2H T4.3 ceiling: 688.5 HP / 46.4 Armor / 35 MR.
    maxHealth: (688.5 - hero.maxHealth) / (145 * 1.3),
    armor: (46.4 - hero.armor) / (28 * 1.3),
    // Cape T3 contributes 4 MR without enchantment; T4 core contributes 20 MR.
    magicResistance: (35 - hero.magicResistance) / (4 + 20 * 1.3),
  },
  // Preserve authored shield contribution itself. Once the shared 2H/core
  // ceiling is preserved, keeping shield stats unchanged also preserves the
  // current 1H+shield T4.3 ceiling (65.9 Armor / 46.7 MR).
  offHandStatMultiplier: { maxHealth: 1, armor: 1, magicResistance: 1 },
});

export const COMBAT_BALANCE_REALLOCATIONS: readonly CombatBalanceReallocationDefinition[] = [
  {
    id: "current",
    label: "Actuel",
    hero: { maxHealth: 500, armor: 10, magicResistance: 5 },
    equipmentStatMultiplier: { maxHealth: 1, armor: 1, magicResistance: 1 },
    offHandStatMultiplier: { maxHealth: 1, armor: 1, magicResistance: 1 },
  },
  makeReallocation("reallocation_light", "Réallocation légère", { maxHealth: 440, armor: 8, magicResistance: 4 }),
  makeReallocation("reallocation_medium", "Réallocation moyenne", { maxHealth: 400, armor: 6, magicResistance: 3 }),
  makeReallocation("reallocation_strong", "Réallocation forte", { maxHealth: 360, armor: 4, magicResistance: 2 }),
  makeReallocation("reallocation_probe_340", "Seuil 340 HP", { maxHealth: 340, armor: 3, magicResistance: 1.5 }),
  makeReallocation("reallocation_probe_320", "Seuil 320 HP", { maxHealth: 320, armor: 2, magicResistance: 1 }),
  ...([300, 305, 310, 315] as const).map((maxHealth) =>
    makeReallocation(
      `reallocation_probe_${String(maxHealth)}_zero_def`,
      `${String(maxHealth)} HP · 0 Armor/MR`,
      { maxHealth, armor: 0, magicResistance: 0 },
    ),
  ),
] as const;
