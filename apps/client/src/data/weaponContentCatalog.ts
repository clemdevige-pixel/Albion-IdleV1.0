import {
  asMasteryId,
  WEAPON_MASTERY_XP,
  type AbilityDefinitionLike,
  type DamageType,
  type EquipmentInfoLike,
} from "@game/gameplay";

export type WeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";
export const WEAPON_ATTACK_SPEED_BY_PROFILE: Readonly<Record<WeaponCombatProfile, number>> = {
  dagger: 1.6,
  sword: 1.2,
  bow: 1,
  staff: 0.9,
  hammer: 0.75,
  gloves: 1.4,
};

export interface ClientAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly damageType: DamageType;
  readonly bonusDamageRatio: number;
}

export interface WeaponAbilityUnlock {
  readonly unlockMasteryLevel: number;
  readonly ability: ClientAbilityDefinition;
}

export interface WeaponCraftMaterial {
  readonly kind: "wood" | "metal" | "leather" | "cloth";
  readonly quantity: number;
}

export type WeaponCraftRule =
  | { readonly kind: "standard"; readonly materials: readonly WeaponCraftMaterial[] }
  | { readonly kind: "artifact_pending" };

export const WEAPON_FAMILIES = {
  sword: { masteryId: "mastery_sword", name: "Épées" },
  bow: { masteryId: "mastery_bow", name: "Arcs" },
  fire_staff: { masteryId: "mastery_fire_staff", name: "Bâtons de feu" },
  gloves: { masteryId: "mastery_gloves", name: "Gants" },
  dagger: { masteryId: "mastery_dagger", name: "Dagues" },
} as const;
export type WeaponFamilyId = keyof typeof WEAPON_FAMILIES;

interface WeaponItemContent {
  readonly itemId: string;
  readonly tier: 3 | 4;
  readonly handling: EquipmentInfoLike["handling"];
  readonly stats: EquipmentInfoLike["stats"];
  readonly sellPrice: number;
}

export interface WeaponProjectilePresentation {
  readonly kind: "projectile";
  readonly projectileId: string;
  readonly releaseDelayMs: number;
}

export interface WeaponPresentationContent {
  readonly itemIcon: string;
  readonly actorManifestId: string;
  readonly combatProfileId: string;
  readonly combatPresentation?: WeaponProjectilePresentation;
}

interface WeaponSpecializationContent {
  readonly familyId: WeaponFamilyId;
  readonly specializationMasteryId: string;
  readonly specializationName: string;
  readonly combatProfile: WeaponCombatProfile;
  readonly presentation: WeaponPresentationContent;
  readonly abilities: readonly WeaponAbilityUnlock[];
  readonly craft: WeaponCraftRule;
  readonly items: readonly WeaponItemContent[];
}

const WEAPON_CONTENT: readonly WeaponSpecializationContent[] = [
  {
    familyId: "sword",
    specializationMasteryId: "mastery_broadsword",
    specializationName: "Épée large",
    combatProfile: "sword",
    presentation: {
      itemIcon: "item-broadsword-pixel-v1.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    },
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_sword_heroic_strike",
          name: "Frappe héroïque",
          description: "Une frappe lourde infligeant 175 % des dégâts physiques.",
          icon: "⚔️",
          category: "active",
          cooldown: 8,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.75,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_sword_guard_breaker",
          name: "Brise-garde",
          description: "Une frappe maîtrisée infligeant de lourds dégâts physiques.",
          icon: "🛡️",
          category: "active",
          cooldown: 12,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.05,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_sword_execution",
          name: "Exécution",
          description: "Une attaque signature dévastatrice concentrant toute la puissance de l'épée.",
          icon: "💥",
          category: "active",
          cooldown: 28,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.9,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_sword_t3_broadsword", tier: 3, handling: "one_handed", stats: { stat_physical_damage: 45 }, sellPrice: 70 },
      { itemId: "item_weapon_sword_t4_broadsword", tier: 4, handling: "one_handed", stats: { stat_physical_damage: 75 }, sellPrice: 200 },
    ],
  },
  {
    familyId: "bow",
    specializationMasteryId: "mastery_longbow",
    specializationName: "Arc long",
    combatProfile: "bow",
    presentation: {
      itemIcon: "item-longbow-pixel-v1.png",
      actorManifestId: "hero_bow",
      combatProfileId: "projectile",
      combatPresentation: { kind: "projectile", projectileId: "arrow", releaseDelayMs: 355 },
    },
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 6 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_bow_aimed_shot",
          name: "Tir ajusté",
          description: "Un tir précis infligeant 160 % des dégâts physiques.",
          icon: "🏹",
          category: "active",
          cooldown: 5,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.6,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_bow_piercing_arrow",
          name: "Flèche perforante",
          description: "Un projectile puissant transperce la cible et inflige de lourds dégâts physiques.",
          icon: "➶",
          category: "active",
          cooldown: 10,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.95,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_bow_deadeye",
          name: "Œil mortel",
          description: "Un tir ultime d'une précision absolue infligeant des dégâts physiques massifs.",
          icon: "🎯",
          category: "active",
          cooldown: 25,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.7,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_bow_t3_longbow", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 50 }, sellPrice: 70 },
      { itemId: "item_weapon_bow_t4_longbow", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 85 }, sellPrice: 200 },
    ],
  },
  {
    familyId: "bow",
    specializationMasteryId: "mastery_badon",
    specializationName: "Badon",
    combatProfile: "bow",
    presentation: {
      itemIcon: "item-badon-pixel-v1.png",
      actorManifestId: "hero_bow",
      combatProfileId: "projectile",
      combatPresentation: { kind: "projectile", projectileId: "badon_arrow", releaseDelayMs: 355 },
    },
    craft: { kind: "artifact_pending" },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_bow_aimed_shot",
          name: "Tir ajusté",
          description: "Un tir précis infligeant 160 % des dégâts physiques.",
          icon: "🏹",
          category: "active",
          cooldown: 5,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.6,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_bow_badon_storm_arrow",
          name: "Flèche d'orage",
          description: "Une flèche chargée d'énergie frappe brutalement la cible.",
          icon: "⚡",
          category: "active",
          cooldown: 11,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_bow_badon_raging_storm",
          name: "Tempête déchaînée",
          description: "Badon libère sa puissance signature dans une attaque dévastatrice.",
          icon: "🌩️",
          category: "active",
          cooldown: 28,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.85,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_bow_t4_badon", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 87 }, sellPrice: 260 },
    ],
  },
  {
    familyId: "fire_staff",
    specializationMasteryId: "mastery_infernal_staff",
    specializationName: "Bâton Infernal",
    combatProfile: "staff",
    presentation: {
      itemIcon: "item-fire-staff-pixel-v1.png",
      actorManifestId: "hero_fire_staff",
      combatProfileId: "projectile",
      combatPresentation: { kind: "projectile", projectileId: "fireball", releaseDelayMs: 355 },
    },
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 4 }, { kind: "cloth", quantity: 2 }] },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_fire_fireball",
          name: "Boule de feu",
          description: "Un projectile ardent infligeant 170 % des dégâts magiques.",
          icon: "🔥",
          category: "active",
          cooldown: 5,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "magical",
          bonusDamageRatio: 0.7,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_fire_infernal_burst",
          name: "Explosion infernale",
          description: "Une déflagration concentrée inflige de lourds dégâts magiques.",
          icon: "☄️",
          category: "active",
          cooldown: 10,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "magical",
          bonusDamageRatio: 1.1,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_fire_cataclysm",
          name: "Cataclysme",
          description: "Le bâton concentre un déluge de flammes dans une attaque magique ultime.",
          icon: "🌋",
          category: "active",
          cooldown: 30,
          castTime: 0,
          resourceCost: {},
          interruptible: true,
          targetRule: "current_target",
          damageType: "magical",
          bonusDamageRatio: 2,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_staff_t3_infernal", tier: 3, handling: "two_handed", stats: { stat_magical_damage: 48 }, sellPrice: 80 },
      { itemId: "item_weapon_staff_t4_infernal", tier: 4, handling: "two_handed", stats: { stat_magical_damage: 90 }, sellPrice: 220 },
    ],
  },
  {
    familyId: "gloves",
    specializationMasteryId: "mastery_spiked_gauntlets",
    specializationName: "Gantelets à pointes",
    combatProfile: "gloves",
    presentation: {
      itemIcon: "item-spiked-gauntlets-pixel-v1.png",
      actorManifestId: "hero_spiked_gauntlets",
      combatProfileId: "melee",
    },
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_gloves_shockwave",
          name: "Onde percutante",
          description: "Un double impact libère une onde de choc infligeant 180 % des dégâts physiques.",
          icon: "🥊",
          category: "active",
          cooldown: 6,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.8,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_gloves_breaking_combo",
          name: "Combo fracassant",
          description: "Une combinaison brutale de coups inflige de lourds dégâts physiques.",
          icon: "👊",
          category: "active",
          cooldown: 9,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_gloves_seismic_impact",
          name: "Impact sismique",
          description: "Un impact signature libère toute la force des gantelets en un seul coup.",
          icon: "💢",
          category: "active",
          cooldown: 24,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.65,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 38 }, sellPrice: 75 },
      { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 66 }, sellPrice: 210 },
    ],
  },
  {
    familyId: "dagger",
    specializationMasteryId: "mastery_dagger_pair",
    specializationName: "Paire de dagues",
    combatProfile: "dagger",
    presentation: {
      itemIcon: "item-dagger-pair-pixel-v1.png",
      actorManifestId: "hero_dagger_pair",
      combatProfileId: "melee",
    },
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    abilities: [
      {
        unlockMasteryLevel: 1,
        ability: {
          id: "ability_dagger_double_slash",
          name: "Double entaille",
          description: "Deux lames frappent en succession rapide pour infliger 150 % des dégâts physiques.",
          icon: "🗡️",
          category: "active",
          cooldown: 4,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.5,
        },
      },
      {
        unlockMasteryLevel: 10,
        ability: {
          id: "ability_dagger_flurry",
          name: "Rafale de lames",
          description: "Une succession fulgurante d'entailles inflige de lourds dégâts physiques.",
          icon: "⚔",
          category: "active",
          cooldown: 8,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 0.85,
        },
      },
      {
        unlockMasteryLevel: 30,
        ability: {
          id: "ability_dagger_assassination",
          name: "Assassinat",
          description: "Une attaque signature extrêmement violente frappe la cible avec les deux lames.",
          icon: "☠️",
          category: "active",
          cooldown: 22,
          castTime: 0,
          resourceCost: {},
          interruptible: false,
          targetRule: "current_target",
          damageType: "physical",
          bonusDamageRatio: 1.55,
        },
      },
    ],
    items: [
      { itemId: "item_weapon_dagger_t3_pair", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 34 }, sellPrice: 75 },
      { itemId: "item_weapon_dagger_t4_pair", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 58 }, sellPrice: 210 },
    ],
  },
];

export const CLIENT_ABILITIES: Readonly<Record<string, ClientAbilityDefinition>> = Object.fromEntries(
  WEAPON_CONTENT.flatMap((entry) => entry.abilities.map(({ ability }) => [ability.id, ability] as const)),
);

export const WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  WEAPON_CONTENT.flatMap((entry) => entry.items).map((item) => [
    item.itemId,
    { itemId: item.itemId, slot: "weapon", handling: item.handling, stats: item.stats },
  ]),
);

interface WeaponItemRoute {
  readonly specialization: WeaponSpecializationContent;
  readonly item: WeaponItemContent;
}

const CONTENT_BY_ITEM_ID = new Map<string, WeaponItemRoute>(
  WEAPON_CONTENT.flatMap((specialization) => specialization.items.map((item) => [
    item.itemId,
    { specialization, item },
  ] as const)),
);

export function resolveWeaponAbilityUnlocks(
  itemId: string | null | undefined,
): readonly WeaponAbilityUnlock[] {
  if (itemId == null) return [];
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.abilities ?? [];
}

export function resolveUnlockedWeaponAbilities(
  itemId: string | null | undefined,
  specializationMasteryLevel: number,
): readonly ClientAbilityDefinition[] {
  return resolveWeaponAbilityUnlocks(itemId)
    .filter(({ unlockMasteryLevel }) => specializationMasteryLevel >= unlockMasteryLevel)
    .sort((a, b) => a.unlockMasteryLevel - b.unlockMasteryLevel)
    .map(({ ability }) => ability);
}

/** @deprecated Compatibility helper for slot 0 (Q). */
export function resolvePrimaryAbilityId(itemId: string | null | undefined): string | undefined {
  return resolveWeaponAbilityUnlocks(itemId)[0]?.ability.id;
}

export interface WeaponMasteryRoute {
  readonly familyId: ReturnType<typeof asMasteryId>;
  readonly weaponId: ReturnType<typeof asMasteryId>;
}

export function resolveWeaponMastery(itemId: string): WeaponMasteryRoute | undefined {
  const entry = CONTENT_BY_ITEM_ID.get(itemId)?.specialization;
  if (entry === undefined) return undefined;
  const family = WEAPON_FAMILIES[entry.familyId];
  return {
    familyId: asMasteryId(family.masteryId),
    weaponId: asMasteryId(entry.specializationMasteryId),
  };
}

export function resolveWeaponFamilyId(itemId: string): WeaponFamilyId | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.familyId;
}

export function resolveWeaponTier(itemId: string): 3 | 4 | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.item.tier;
}

export function resolveWeaponPresentation(itemId: string): WeaponPresentationContent | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.presentation;
}

export function resolveWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.combatProfile;
}

export function resolveWeaponAttackSpeed(itemId: string): number | undefined {
  const profile = resolveWeaponCombatProfile(itemId);
  return profile === undefined ? undefined : WEAPON_ATTACK_SPEED_BY_PROFILE[profile];
}

export function resolveWeaponCraftRule(itemId: string): WeaponCraftRule | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.craft;
}

export function resolvePreviousWeaponTierItemId(itemId: string): string | undefined {
  const route = CONTENT_BY_ITEM_ID.get(itemId);
  if (
    route === undefined
    || route.item.tier < 4
    || route.specialization.craft.kind !== "standard"
  ) return undefined;
  return route.specialization.items.find((item) => item.tier === route.item.tier - 1)?.itemId;
}

export function getWeaponSpecializationName(itemId: string): string | undefined {
  return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.specializationName;
}

export function getWeaponFamilyDisplayName(familyId: string): string | undefined {
  return WEAPON_FAMILIES[familyId as WeaponFamilyId]?.name;
}

export interface WeaponMasteryFamilyDefinition {
  readonly familyId: WeaponFamilyId;
  readonly masteryId: string;
  readonly specializationMasteryIds: readonly string[];
}

export function getWeaponMasteryFamilyDefinitions(): readonly WeaponMasteryFamilyDefinition[] {
  return (Object.keys(WEAPON_FAMILIES) as WeaponFamilyId[]).map((familyId) => ({
    familyId,
    masteryId: WEAPON_FAMILIES[familyId].masteryId,
    specializationMasteryIds: WEAPON_CONTENT
      .filter((entry) => entry.familyId === familyId)
      .map((entry) => entry.specializationMasteryId),
  }));
}

const masteryNames = new Map<string, string>();
const familyMasteryIds = new Set<string>();
const specializationMasteryIds = new Set<string>();
for (const family of Object.values(WEAPON_FAMILIES)) {
  masteryNames.set(family.masteryId, family.name);
  familyMasteryIds.add(family.masteryId);
}
for (const entry of WEAPON_CONTENT) {
  masteryNames.set(entry.specializationMasteryId, entry.specializationName);
  specializationMasteryIds.add(entry.specializationMasteryId);
}

export function getWeaponMasteryDisplayName(masteryId: string): string | undefined {
  return masteryNames.get(masteryId);
}

export const WEAPON_MASTERY_DEFINITIONS = [
  ...familyMasteryIds,
  ...specializationMasteryIds,
].map((id) => ({
  id,
  category: specializationMasteryIds.has(id) ? "weapon_specialization" : "weapon",
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
