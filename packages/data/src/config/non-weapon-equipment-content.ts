export type AuthoredEquipmentTier = 3 | 4 | 5 | 6 | 7 | 8;
export type AuthoredEquipmentCraftMaterialKind = "wood" | "metal" | "leather" | "cloth";
export type AuthoredEquipmentSlot = "off_hand" | "head" | "chest" | "boots";
export type AuthoredEquipmentHandling = "one_handed";

export interface AuthoredEquipmentCraftMaterial {
  readonly kind: AuthoredEquipmentCraftMaterialKind;
  readonly quantity: number;
}

export interface AuthoredProgressionEquipmentItemContent {
  readonly itemId: string;
  readonly recipeId: string;
  readonly name: string;
  readonly tier: AuthoredEquipmentTier;
  readonly stats: Readonly<Record<string, number>>;
  readonly craftMaterials: readonly AuthoredEquipmentCraftMaterial[];
}

export interface AuthoredProgressionEquipmentFamilyContent {
  readonly familyId: string;
  readonly recipeFamily: "armor" | "offhand";
  readonly slot: AuthoredEquipmentSlot;
  readonly handling: AuthoredEquipmentHandling;
  readonly items: readonly AuthoredProgressionEquipmentItemContent[];
}

export const PROGRESSION_EQUIPMENT_CONTENT = [
  {
    familyId: "reinforced_shield",
    recipeFamily: "offhand",
    slot: "off_hand",
    handling: "one_handed",
    items: [
      { itemId: "item_shield_t3_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T3_0", name: "Bouclier renforcé T3", tier: 3, stats: { stat_armor: 9, stat_magic_resistance: 5 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 2 }, { kind: "leather", quantity: 1 }] },
      { itemId: "item_shield_t4_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T4_0", name: "Bouclier renforcé T4", tier: 4, stats: { stat_armor: 15, stat_magic_resistance: 9 }, craftMaterials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 4 }, { kind: "leather", quantity: 2 }] },
      { itemId: "item_shield_t5_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T5_0", name: "Bouclier renforcé T5", tier: 5, stats: { stat_armor: 22, stat_magic_resistance: 14 }, craftMaterials: [{ kind: "wood", quantity: 5 }, { kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] },
      { itemId: "item_shield_t6_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T6_0", name: "Bouclier renforcé T6", tier: 6, stats: { stat_armor: 32, stat_magic_resistance: 21 }, craftMaterials: [{ kind: "wood", quantity: 6 }, { kind: "metal", quantity: 6 }, { kind: "leather", quantity: 4 }] },
      { itemId: "item_shield_t7_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T7_0", name: "Bouclier renforcé T7", tier: 7, stats: { stat_armor: 46, stat_magic_resistance: 31 }, craftMaterials: [{ kind: "wood", quantity: 7 }, { kind: "metal", quantity: 7 }, { kind: "leather", quantity: 5 }] },
      { itemId: "item_shield_t8_reinforced", recipeId: "CRAFT_REINFORCED_SHIELD_T8_0", name: "Bouclier renforcé T8", tier: 8, stats: { stat_armor: 67, stat_magic_resistance: 45 }, craftMaterials: [{ kind: "wood", quantity: 8 }, { kind: "metal", quantity: 8 }, { kind: "leather", quantity: 6 }] },
    ],
  },
  {
    familyId: "reinforced_helmet",
    recipeFamily: "armor",
    slot: "head",
    handling: "one_handed",
    items: [
      { itemId: "item_iron_helmet", recipeId: "CRAFT_IRON_HELMET_T3_0", name: "Casque en fer T3", tier: 3, stats: { stat_armor: 6, stat_magic_resistance: 4, stat_max_health: 70 }, craftMaterials: [{ kind: "metal", quantity: 4 }, { kind: "leather", quantity: 1 }] },
      { itemId: "item_helmet_t4_reinforced", recipeId: "CRAFT_REINFORCED_HELMET_T4_0", name: "Casque renforcé T4", tier: 4, stats: { stat_armor: 10, stat_magic_resistance: 7, stat_max_health: 90 }, craftMaterials: [{ kind: "wood", quantity: 1 }, { kind: "metal", quantity: 4 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 1 }] },
      { itemId: "item_helmet_t5_reinforced", recipeId: "CRAFT_REINFORCED_HELMET_T5_0", name: "Casque renforcé T5", tier: 5, stats: { stat_armor: 15, stat_magic_resistance: 11, stat_max_health: 150 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 5 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 1 }] },
      { itemId: "item_helmet_t6_reinforced", recipeId: "CRAFT_REINFORCED_HELMET_T6_0", name: "Casque renforcé T6", tier: 6, stats: { stat_armor: 22, stat_magic_resistance: 17, stat_max_health: 218 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] },
      { itemId: "item_helmet_t7_reinforced", recipeId: "CRAFT_REINFORCED_HELMET_T7_0", name: "Casque renforcé T7", tier: 7, stats: { stat_armor: 32, stat_magic_resistance: 25, stat_max_health: 316 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 7 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] },
      { itemId: "item_helmet_t8_reinforced", recipeId: "CRAFT_REINFORCED_HELMET_T8_0", name: "Casque renforcé T8", tier: 8, stats: { stat_armor: 46, stat_magic_resistance: 37, stat_max_health: 458 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 8 }, { kind: "leather", quantity: 3 }, { kind: "cloth", quantity: 2 }] },
    ],
  },
  {
    familyId: "leather_armor",
    recipeFamily: "armor",
    slot: "chest",
    handling: "one_handed",
    items: [
      { itemId: "item_leather_armor", recipeId: "CRAFT_LEATHER_ARMOR_T3_0", name: "Armure de cuir T3", tier: 3, stats: { stat_armor: 11, stat_magic_resistance: 8, stat_max_health: 125 }, craftMaterials: [{ kind: "leather", quantity: 4 }, { kind: "cloth", quantity: 2 }] },
      { itemId: "item_armor_t4_leather", recipeId: "CRAFT_LEATHER_ARMOR_T4_0", name: "Armure de cuir T4", tier: 4, stats: { stat_armor: 18, stat_magic_resistance: 12, stat_max_health: 160 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 1 }, { kind: "leather", quantity: 3 }, { kind: "cloth", quantity: 3 }] },
      { itemId: "item_armor_t5_leather", recipeId: "CRAFT_LEATHER_ARMOR_T5_0", name: "Armure de cuir T5", tier: 5, stats: { stat_armor: 27, stat_magic_resistance: 18, stat_max_health: 232 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 2 }, { kind: "leather", quantity: 4 }, { kind: "cloth", quantity: 3 }] },
      { itemId: "item_armor_t6_leather", recipeId: "CRAFT_LEATHER_ARMOR_T6_0", name: "Armure de cuir T6", tier: 6, stats: { stat_armor: 39, stat_magic_resistance: 27, stat_max_health: 336 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 2 }, { kind: "leather", quantity: 4 }, { kind: "cloth", quantity: 4 }] },
      { itemId: "item_armor_t7_leather", recipeId: "CRAFT_LEATHER_ARMOR_T7_0", name: "Armure de cuir T7", tier: 7, stats: { stat_armor: 57, stat_magic_resistance: 39, stat_max_health: 487 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 3 }, { kind: "leather", quantity: 5 }, { kind: "cloth", quantity: 4 }] },
      { itemId: "item_armor_t8_leather", recipeId: "CRAFT_LEATHER_ARMOR_T8_0", name: "Armure de cuir T8", tier: 8, stats: { stat_armor: 83, stat_magic_resistance: 57, stat_max_health: 706 }, craftMaterials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 3 }, { kind: "leather", quantity: 5 }, { kind: "cloth", quantity: 5 }] },
    ],
  },
  {
    familyId: "leather_boots",
    recipeFamily: "armor",
    slot: "boots",
    handling: "one_handed",
    items: [
      { itemId: "item_leather_boots", recipeId: "CRAFT_LEATHER_BOOTS_T3_0", name: "Bottes de cuir T3", tier: 3, stats: { stat_armor: 4, stat_magic_resistance: 3, stat_max_health: 35 }, craftMaterials: [{ kind: "leather", quantity: 3 }, { kind: "cloth", quantity: 1 }] },
      { itemId: "item_boots_t4_leather", recipeId: "CRAFT_LEATHER_BOOTS_T4_0", name: "Bottes de cuir T4", tier: 4, stats: { stat_armor: 8, stat_magic_resistance: 5, stat_max_health: 50 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 1 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 1 }] },
      { itemId: "item_boots_t5_leather", recipeId: "CRAFT_LEATHER_BOOTS_T5_0", name: "Bottes de cuir T5", tier: 5, stats: { stat_armor: 12, stat_magic_resistance: 8, stat_max_health: 73 }, craftMaterials: [{ kind: "wood", quantity: 2 }, { kind: "metal", quantity: 1 }, { kind: "leather", quantity: 3 }, { kind: "cloth", quantity: 2 }] },
      { itemId: "item_boots_t6_leather", recipeId: "CRAFT_LEATHER_BOOTS_T6_0", name: "Bottes de cuir T6", tier: 6, stats: { stat_armor: 18, stat_magic_resistance: 12, stat_max_health: 108 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 1 }, { kind: "leather", quantity: 3 }, { kind: "cloth", quantity: 3 }] },
      { itemId: "item_boots_t7_leather", recipeId: "CRAFT_LEATHER_BOOTS_T7_0", name: "Bottes de cuir T7", tier: 7, stats: { stat_armor: 27, stat_magic_resistance: 18, stat_max_health: 158 }, craftMaterials: [{ kind: "wood", quantity: 3 }, { kind: "metal", quantity: 2 }, { kind: "leather", quantity: 4 }, { kind: "cloth", quantity: 3 }] },
      { itemId: "item_boots_t8_leather", recipeId: "CRAFT_LEATHER_BOOTS_T8_0", name: "Bottes de cuir T8", tier: 8, stats: { stat_armor: 39, stat_magic_resistance: 27, stat_max_health: 229 }, craftMaterials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 2 }, { kind: "leather", quantity: 4 }, { kind: "cloth", quantity: 4 }] },
    ],
  },
] as const satisfies readonly AuthoredProgressionEquipmentFamilyContent[];
