import {
  asMasteryId,
  type AbilityDefinitionLike,
  type DamageType,
  type EquipmentInfoLike,
} from "@game/gameplay";

export interface ClientAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly damageType: DamageType;
  readonly bonusDamageRatio: number;
}

interface WeaponItemContent {
  readonly itemId: string;
  readonly handling: EquipmentInfoLike["handling"];
  readonly stats: EquipmentInfoLike["stats"];
  readonly sellPrice: number;
}

interface WeaponSpecializationContent {
  readonly familyMasteryId: string;
  readonly familyName: string;
  readonly specializationMasteryId: string;
  readonly specializationName: string;
  readonly ability: ClientAbilityDefinition;
  readonly items: readonly WeaponItemContent[];
}

const WEAPON_MASTERY_XP = [
  100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700,
];

/**
 * Single authoring boundary for weapon gameplay content.
 * Adding a weapon here automatically wires equipment, ability, mastery XP,
 * item-to-mastery routing, display names and vendor resale offers.
 */
const WEAPON_CONTENT: readonly WeaponSpecializationContent[] = [
  {
    familyMasteryId: "mastery_sword",
    familyName: "Épées",
    specializationMasteryId: "mastery_broadsword",
    specializationName: "Épée large",
    ability: {
      id: "ability_sword_heroic_strike",
      name: "Frappe héroïque",
      description: "Une frappe lourde infligeant 175 % des dégâts physiques.",
      icon: "⚔️",
      category: "active",
      cooldown: 8,
      castTime: 0,
      resourceCost: { energy: 12 },
      interruptible: false,
      targetRule: "current_target",
      damageType: "physical",
      bonusDamageRatio: 0.75,
    },
    items: [
      { itemId: "item_weapon_sword_t3_broadsword", handling: "one_handed", stats: { stat_physical_damage: 45 }, sellPrice: 70 },
      { itemId: "item_weapon_sword_t4_broadsword", handling: "one_handed", stats: { stat_physical_damage: 75 }, sellPrice: 200 },
    ],
  },
  {
    familyMasteryId: "mastery_bow",
    familyName: "Arcs",
    specializationMasteryId: "mastery_longbow",
    specializationName: "Arc long",
    ability: {
      id: "ability_bow_aimed_shot",
      name: "Tir ajusté",
      description: "Un tir précis infligeant 160 % des dégâts physiques.",
      icon: "🏹",
      category: "active",
      cooldown: 6,
      castTime: 0,
      resourceCost: { energy: 8 },
      interruptible: true,
      targetRule: "current_target",
      damageType: "physical",
      bonusDamageRatio: 0.6,
    },
    items: [
      { itemId: "item_weapon_bow_t3_longbow", handling: "two_handed", stats: { stat_physical_damage: 40 }, sellPrice: 70 },
      { itemId: "item_weapon_bow_t4_longbow", handling: "two_handed", stats: { stat_physical_damage: 68 }, sellPrice: 200 },
    ],
  },
  {
    familyMasteryId: "mastery_bow",
    familyName: "Arcs",
    specializationMasteryId: "mastery_badon",
    specializationName: "Badon",
    ability: {
      id: "ability_bow_aimed_shot",
      name: "Tir ajusté",
      description: "Un tir précis infligeant 160 % des dégâts physiques.",
      icon: "🏹",
      category: "active",
      cooldown: 6,
      castTime: 0,
      resourceCost: { energy: 8 },
      interruptible: true,
      targetRule: "current_target",
      damageType: "physical",
      bonusDamageRatio: 0.6,
    },
    items: [
      { itemId: "item_weapon_bow_t4_badon", handling: "two_handed", stats: { stat_physical_damage: 72 }, sellPrice: 260 },
    ],
  },
  {
    familyMasteryId: "mastery_fire_staff",
    familyName: "Bâtons de feu",
    specializationMasteryId: "mastery_t4_fire_staff",
    specializationName: "Bâton de feu",
    ability: {
      id: "ability_fire_fireball",
      name: "Boule de feu",
      description: "Un projectile ardent infligeant 170 % des dégâts magiques.",
      icon: "🔥",
      category: "active",
      cooldown: 5,
      castTime: 0,
      resourceCost: { energy: 15 },
      interruptible: true,
      targetRule: "current_target",
      damageType: "magical",
      bonusDamageRatio: 0.7,
    },
    items: [
      { itemId: "item_weapon_staff_t3_fire", handling: "two_handed", stats: { stat_magical_damage: 45 }, sellPrice: 80 },
      { itemId: "item_weapon_staff_t4_fire", handling: "two_handed", stats: { stat_magical_damage: 85 }, sellPrice: 220 },
    ],
  },
  {
    familyMasteryId: "mastery_gloves",
    familyName: "Gants",
    specializationMasteryId: "mastery_spiked_gauntlets",
    specializationName: "Gantelets à pointes",
    ability: {
      id: "ability_gloves_shockwave",
      name: "Onde percutante",
      description: "Un double impact libère une onde de choc infligeant 180 % des dégâts physiques.",
      icon: "🥊",
      category: "active",
      cooldown: 7,
      castTime: 0,
      resourceCost: { energy: 10 },
      interruptible: false,
      targetRule: "current_target",
      damageType: "physical",
      bonusDamageRatio: 0.8,
    },
    items: [
      { itemId: "item_weapon_gloves_t3_spiked_gauntlets", handling: "two_handed", stats: { stat_physical_damage: 34 }, sellPrice: 75 },
      { itemId: "item_weapon_gloves_t4_spiked_gauntlets", handling: "two_handed", stats: { stat_physical_damage: 58 }, sellPrice: 210 },
    ],
  },
];

const BASE_CLIENT_ABILITIES: Readonly<Record<string, ClientAbilityDefinition>> =
  Object.fromEntries(WEAPON_CONTENT.map((entry) => [entry.ability.id, entry.ability]));

export const CLIENT_ABILITIES: Record<string, ClientAbilityDefinition> = {
  ...BASE_CLIENT_ABILITIES,
  ability_sword_heroic_strike: {
    id: "ability_sword_heroic_strike",
    name: "Frappe héroïque",
    description: "Une frappe lourde infligeant 175 % des dégâts physiques.",
    icon: "⚔️",
    category: "active",
    cooldown: 8,
    castTime: 0,
    resourceCost: { energy: 12 },
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.75,
  },
  ability_bow_aimed_shot: {
    id: "ability_bow_aimed_shot",
    name: "Tir ajusté",
    description: "Un tir précis infligeant 160 % des dégâts physiques.",
    icon: "🏹",
    category: "active",
    cooldown: 6,
    castTime: 0,
    resourceCost: { energy: 8 },
    interruptible: true,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.6,
  },
  ability_fire_fireball: {
    id: "ability_fire_fireball",
    name: "Boule de feu",
    description: "Un projectile ardent infligeant 170 % des dégâts magiques.",
    icon: "🔥",
    category: "active",
    cooldown: 5,
    castTime: 0,
    resourceCost: { energy: 15 },
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    bonusDamageRatio: 0.7,
  },
  ability_gloves_shockwave: {
    id: "ability_gloves_shockwave",
    name: "Onde percutante",
    description: "Un double impact libère une onde de choc infligeant 180 % des dégâts physiques.",
    icon: "🥊",
    category: "active",
    cooldown: 7,
    castTime: 0,
    resourceCost: { energy: 10 },
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.8,
  },
};

export const WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> =
  Object.fromEntries(
    WEAPON_CONTENT.flatMap((entry) => entry.items).map((item) => [
      item.itemId,
      { itemId: item.itemId, slot: "weapon", handling: item.handling, stats: item.stats },
    ]),
  );

const CONTENT_BY_ITEM_ID = new Map(
  WEAPON_CONTENT.flatMap((entry) => entry.items.map((item) => [item.itemId, entry] as const)),
);

export function resolveCatalogPrimaryAbilityId(itemId: string | null | undefined): string | undefined {
  if (itemId == null) return undefined;
  return CONTENT_BY_ITEM_ID.get(itemId)?.ability.id;
}

export function resolvePrimaryAbilityId(itemId: string | null | undefined): string | undefined {
  const catalogAbilityId = resolveCatalogPrimaryAbilityId(itemId);
  if (catalogAbilityId !== undefined) return catalogAbilityId;
  if (itemId?.includes("_sword_") === true) return "ability_sword_heroic_strike";
  if (itemId?.includes("_bow_") === true) return "ability_bow_aimed_shot";
  if (itemId?.includes("_staff_") === true) return "ability_fire_fireball";
  if (itemId?.includes("_gloves_") === true) return "ability_gloves_shockwave";
  return undefined;
}

export interface WeaponMasteryRoute {
  readonly familyId: ReturnType<typeof asMasteryId>;
  readonly weaponId: ReturnType<typeof asMasteryId>;
}

export function resolveCatalogWeaponMastery(itemId: string): WeaponMasteryRoute | undefined {
  const entry = CONTENT_BY_ITEM_ID.get(itemId);
  if (entry === undefined) return undefined;
  return {
    familyId: asMasteryId(entry.familyMasteryId),
    weaponId: asMasteryId(entry.specializationMasteryId),
  };
}

export function resolveWeaponMastery(itemId: string): WeaponMasteryRoute | undefined {
  const catalogRoute = resolveCatalogWeaponMastery(itemId);
  if (catalogRoute !== undefined) return catalogRoute;
  switch (itemId) {
    case "item_weapon_sword_t3_broadsword":
    case "item_weapon_sword_t4_broadsword":
      return { familyId: asMasteryId("mastery_sword"), weaponId: asMasteryId("mastery_broadsword") };
    case "item_weapon_bow_t3_longbow":
    case "item_weapon_bow_t4_longbow":
      return { familyId: asMasteryId("mastery_bow"), weaponId: asMasteryId("mastery_longbow") };
    case "item_weapon_bow_t4_badon":
      return { familyId: asMasteryId("mastery_bow"), weaponId: asMasteryId("mastery_badon") };
    case "item_weapon_staff_t3_fire":
    case "item_weapon_staff_t4_fire":
      return { familyId: asMasteryId("mastery_fire_staff"), weaponId: asMasteryId("mastery_t4_fire_staff") };
    case "item_weapon_gloves_t3_spiked_gauntlets":
    case "item_weapon_gloves_t4_spiked_gauntlets":
      return { familyId: asMasteryId("mastery_gloves"), weaponId: asMasteryId("mastery_spiked_gauntlets") };
    default:
      return undefined;
  }
}

const masteryNames = new Map<string, string>();
for (const entry of WEAPON_CONTENT) {
  masteryNames.set(entry.familyMasteryId, entry.familyName);
  masteryNames.set(entry.specializationMasteryId, entry.specializationName);
}

export function getWeaponMasteryDisplayName(masteryId: string): string | undefined {
  return masteryNames.get(masteryId);
}

export const WEAPON_MASTERY_DEFINITIONS = [...masteryNames.keys()].map((id) => ({
  id,
  category: id.includes("mastery_broadsword")
    || id.includes("mastery_longbow")
    || id.includes("mastery_badon")
    || id.includes("mastery_t4_fire_staff")
    || id.includes("mastery_spiked_gauntlets")
    ? "weapon_specialization"
    : "weapon",
  maxLevel: 100,
  experiencePerLevel: WEAPON_MASTERY_XP,
}));

export const WEAPON_VENDOR_OFFERS = WEAPON_CONTENT.flatMap((entry) =>
  entry.items.map((item) => ({
    itemId: item.itemId,
    buyPrice: null,
    sellPrice: item.sellPrice,
    maxPerTransaction: null,
    enabled: true,
  })),
);

