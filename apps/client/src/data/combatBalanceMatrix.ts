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
  readonly t3CoreStatMultiplier: CombatBalanceSyntheticHeroDefinition;
  readonly t4CoreStatMultiplier: CombatBalanceSyntheticHeroDefinition;
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

const IDENTITY_MULTIPLIER: CombatBalanceSyntheticHeroDefinition = {
  maxHealth: 1,
  armor: 1,
  magicResistance: 1,
};

const makeCeilingReallocation = (
  id: string,
  label: string,
  hero: CombatBalanceSyntheticHeroDefinition,
): CombatBalanceReallocationDefinition => {
  const t4CoreStatMultiplier = {
    maxHealth: (688.5 - hero.maxHealth) / (145 * 1.3),
    armor: (46.4 - hero.armor) / (28 * 1.3),
    magicResistance: (35 - hero.magicResistance - 4) / (20 * 1.3),
  };
  return {
    id,
    label,
    hero,
    t3CoreStatMultiplier: t4CoreStatMultiplier,
    t4CoreStatMultiplier,
    offHandStatMultiplier: IDENTITY_MULTIPLIER,
  };
};

const PRESERVE_T3_T43_300: CombatBalanceReallocationDefinition = {
  id: "candidate_300_preserve_t3_t43",
  label: "300 HP · T3 actuel préservé · T4.3 actuel préservé",
  hero: { maxHealth: 300, armor: 0, magicResistance: 0 },
  t3CoreStatMultiplier: {
    maxHealth: (580 - 300) / 80,
    armor: 25 / 15,
    magicResistance: (20 - 4) / 11,
  },
  t4CoreStatMultiplier: {
    maxHealth: (688.5 - 300) / (145 * 1.3),
    armor: 46.4 / (28 * 1.3),
    magicResistance: (35 - 4) / (20 * 1.3),
  },
  offHandStatMultiplier: IDENTITY_MULTIPLIER,
};

/**
 * Central design candidate:
 * - naked hero: 300 HP / 0 Armor / 0 MR;
 * - full T3 2H target: 530 HP / 21 Armor / 18 MR;
 * - full T4.3 2H target remains exactly current: 688.5 / 46.4 / 35;
 * - cape and shield keep authored values.
 */
const CENTRAL_T3_530_21_18: CombatBalanceReallocationDefinition = {
  id: "candidate_300_t3_530_21_18_t43_current",
  label: "300/0/0 · T3 530/21/18 · T4.3 actuel",
  hero: { maxHealth: 300, armor: 0, magicResistance: 0 },
  t3CoreStatMultiplier: {
    maxHealth: (530 - 300) / 80,
    armor: 21 / 15,
    magicResistance: (18 - 4) / 11,
  },
  t4CoreStatMultiplier: {
    maxHealth: (688.5 - 300) / (145 * 1.3),
    armor: 46.4 / (28 * 1.3),
    magicResistance: (35 - 4) / (20 * 1.3),
  },
  offHandStatMultiplier: IDENTITY_MULTIPLIER,
};

export const COMBAT_BALANCE_REALLOCATIONS: readonly CombatBalanceReallocationDefinition[] = [
  {
    id: "current",
    label: "Actuel",
    hero: { maxHealth: 500, armor: 10, magicResistance: 5 },
    t3CoreStatMultiplier: IDENTITY_MULTIPLIER,
    t4CoreStatMultiplier: IDENTITY_MULTIPLIER,
    offHandStatMultiplier: IDENTITY_MULTIPLIER,
  },
  makeCeilingReallocation("reallocation_light", "Réallocation légère", { maxHealth: 440, armor: 8, magicResistance: 4 }),
  makeCeilingReallocation("reallocation_medium", "Réallocation moyenne", { maxHealth: 400, armor: 6, magicResistance: 3 }),
  makeCeilingReallocation("reallocation_strong", "Réallocation forte", { maxHealth: 360, armor: 4, magicResistance: 2 }),
  makeCeilingReallocation("reallocation_probe_340", "Seuil 340 HP", { maxHealth: 340, armor: 3, magicResistance: 1.5 }),
  makeCeilingReallocation("reallocation_probe_320", "Seuil 320 HP", { maxHealth: 320, armor: 2, magicResistance: 1 }),
  ...([280, 285, 290, 295, 300, 305, 310, 315] as const).map((maxHealth) =>
    makeCeilingReallocation(
      `reallocation_probe_${String(maxHealth)}_zero_def`,
      `${String(maxHealth)} HP · 0 Armor/MR`,
      { maxHealth, armor: 0, magicResistance: 0 },
    ),
  ),
  PRESERVE_T3_T43_300,
  CENTRAL_T3_530_21_18,
] as const;
