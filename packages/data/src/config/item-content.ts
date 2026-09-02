export interface AuthoredStandaloneEquipmentDefinition {
  readonly itemId: string;
  readonly slot: "off_hand" | "cape";
  readonly handling: "one_handed";
  readonly stats: Readonly<Record<string, number>>;
}

/** Standalone non-progression equipment authored outside tier families. */
export const STANDALONE_NON_WEAPON_ITEM_DEFINITIONS = {
  item_wooden_shield: {
    itemId: "item_wooden_shield",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 5, stat_magic_resistance: 3 },
  },
  item_traveler_cape: {
    itemId: "item_traveler_cape",
    slot: "cape",
    handling: "one_handed",
    stats: { stat_magic_resistance: 4 },
  },
} as const satisfies Readonly<Record<string, AuthoredStandaloneEquipmentDefinition>>;

/** Canonical stack limits used by the current inventory content policy. */
export const ITEM_STACK_LIMITS = {
  equipment: 20,
  healthPotion: 99,
  resource: 999,
} as const;

export const CONSUMABLE_STACK_LIMITS = {
  item_health_potion: ITEM_STACK_LIMITS.healthPotion,
} as const satisfies Readonly<Record<string, number>>;
