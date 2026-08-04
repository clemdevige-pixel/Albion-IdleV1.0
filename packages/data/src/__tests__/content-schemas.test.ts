import { describe, expect, it } from "vitest";
import {
  StatDefinitionSchema, statCategory, type StatDefinition,
  ItemDefinitionSchema, itemCategory, type ItemDefinition,
  EquipmentDefinitionSchema, equipmentCategory, type EquipmentDefinition,
  ConsumableDefinitionSchema, consumableCategory, type ConsumableDefinition,
  ResourceDefinitionSchema, resourceCategory, type ResourceDefinition,
  MonsterDefinitionSchema, monsterCategory, type MonsterDefinition,
  LootTableDefinitionSchema, lootTableCategory, type LootTableDefinition,
  AbilityDefinitionSchema, abilityCategory, type AbilityDefinition,
  EffectDefinitionSchema, effectCategory, type EffectDefinition,
  RecipeDefinitionSchema, recipeCategory, type RecipeDefinition,
  BiomeDefinitionSchema, biomeCategory, type BiomeDefinition,
  ZoneDefinitionSchema, zoneCategory, type ZoneDefinition,
  BuildingDefinitionSchema, buildingCategory, type BuildingDefinition,
  WorkerDefinitionSchema, workerCategory, type WorkerDefinition,
  CurrencyDefinitionSchema, currencyCategory, type CurrencyDefinition,
  vendorCategory,
  MasteryDefinitionSchema, masteryCategory, type MasteryDefinition,
} from "../schemas/content/index.js";

const validStat: StatDefinition = {
  id: "max_health",
  category: "primary",
  valueType: "integer",
  defaultValue: 100,
  minimumValue: 0,
  maximumValue: 99999,
  precision: 0,
  visible: true,
  stackable: true,
  displayFormat: "integer",
};

const validItem: ItemDefinition = {
  id: "iron_sword",
  category: "equipment",
  tier: 3,
  supportsQuality: true,
  supportsEnchantments: true,
  stackable: false,
  maxStack: 1,
  weight: 2.5,
  baseValue: 100,
  tags: ["weapon"],
  referenceId: "iron_sword_equip",
};

const validEquipment: EquipmentDefinition = {
  id: "iron_sword_equip",
  itemId: "iron_sword",
  slot: "weapon",
  weaponFamily: "sword",
  armorFamily: "none",
  equipmentType: "broadsword",
  handling: "one_handed",
  stats: { attack_power: 50 },
  passiveAbilityId: "sword_passive",
  activeAbilityId: null,
  maxDurability: 100,
  repairModifier: 1.0,
  setId: null,
};

const validConsumable: ConsumableDefinition = {
  id: "healing_potion",
  itemId: "healing_potion_item",
  consumableType: "potion",
  duration: 0,
  cooldown: 30,
  effects: ["instant_heal"],
  tags: ["heal"],
};

const validResource: ResourceDefinition = {
  id: "iron_ore",
  family: "ore",
  tier: 3,
  gatheringProfession: "mining",
  gatheringDifficulty: 10,
  baseYield: 1,
  gatheringDuration: 5,
  refinementTargetId: "iron_bar",
};

const validMonster: MonsterDefinition = {
  id: "skeleton_warrior",
  family: "undead",
  category: "normal",
  tier: 3,
  stats: { max_health: 200, attack_power: 30 },
  abilities: ["slash"],
  lootTableId: "skeleton_loot",
  experienceReward: 50,
  spawnWeight: 1.0,
  tags: ["undead"],
};

const validLootTable: LootTableDefinition = {
  id: "skeleton_loot",
  entries: [{ itemId: "bone", weight: 1, minQuantity: 1, maxQuantity: 3, conditions: [] }],
  guaranteedDrops: ["silver"],
  maxRolls: 2,
};

const validAbility: AbilityDefinition = {
  id: "slash",
  category: "active",
  abilityType: "damage",
  owner: "any",
  weaponFamily: "sword",
  cooldown: 5,
  resourceCost: { energy: 10 },
  castTime: 0,
  range: 3,
  targetRule: "enemy",
  interruptible: true,
  globalCooldown: true,
  effects: ["slash_damage"],
  tags: ["melee"],
};

const validEffect: EffectDefinition = {
  id: "slash_damage",
  type: "damage",
  parameters: { baseDamage: 50 },
  scaling: { type: "weapon_damage", multiplier: 1.2 },
  target: "primary_target",
  delay: 0,
  flags: [],
};

const validRecipe: RecipeDefinition = {
  id: "iron_bar_recipe",
  category: "refining",
  inputs: [{ itemId: "iron_ore", quantity: 2 }],
  outputs: [{ itemId: "iron_bar", quantity: 1 }],
  productionTime: 10,
  requiredBuildingId: "smelter",
  tier: 3,
  tags: ["metal"],
};

const validBiome: BiomeDefinition = {
  id: "forest",
  enemyFamilies: ["beast", "undead"],
  resourceFamilies: ["wood", "hide"],
  dangerModifier: 1.0,
  tags: ["green"],
};

const validZone: ZoneDefinition = {
  id: "darkwood",
  biomeId: "forest",
  tier: 3,
  dangerLevel: 2,
  monsterIds: ["skeleton_warrior"],
  bossIds: ["skeleton_boss"],
  resourceIds: ["iron_ore"],
  segmentCount: 5,
  tags: [],
};

const validBuilding: BuildingDefinition = {
  id: "smelter",
  category: "refining",
  tier: 3,
  maxWorkers: 2,
  supportedRecipeIds: ["iron_bar_recipe"],
  upgradeCost: [{ itemId: "stone_block", quantity: 10 }],
  tags: [],
};

const validWorker: WorkerDefinition = {
  id: "blacksmith_t3",
  profession: "blacksmith",
  tier: 3,
  efficiency: 1.2,
  assignableBuildingCategories: ["crafting"],
  tags: [],
};

const validCurrency: CurrencyDefinition = {
  id: "silver",
  enabled: true,
  precision: 0,
  minValue: 0,
  maxValue: null,
  visible: true,
  tradable: true,
  tags: [],
};

const validMastery: MasteryDefinition = {
  id: "sword_mastery",
  category: "combat",
  maxLevel: 100,
  experiencePerLevel: [100, 200, 400],
  tags: [],
};

describe("Content Schemas", () => {
  describe("StatDefinition", () => {
    it("validates valid data", () => {
      expect(StatDefinitionSchema.parse(validStat)).toEqual(validStat);
    });
    it("rejects missing fields", () => {
      expect(() => StatDefinitionSchema.parse({ id: "x" })).toThrow();
    });
    it("rejects invalid category", () => {
      expect(() => StatDefinitionSchema.parse({ ...validStat, category: "nope" })).toThrow();
    });
    it("extracts correct ID", () => {
      expect(statCategory.getId(validStat)).toBe("max_health");
    });
  });

  describe("ItemDefinition", () => {
    it("validates valid data", () => {
      expect(ItemDefinitionSchema.parse(validItem)).toEqual(validItem);
    });
    it("rejects tier out of range", () => {
      expect(() => ItemDefinitionSchema.parse({ ...validItem, tier: 0 })).toThrow();
      expect(() => ItemDefinitionSchema.parse({ ...validItem, tier: 9 })).toThrow();
    });
    it("extracts correct ID", () => {
      expect(itemCategory.getId(validItem)).toBe("iron_sword");
    });
  });

  describe("EquipmentDefinition", () => {
    it("validates valid data", () => {
      expect(EquipmentDefinitionSchema.parse(validEquipment)).toEqual(validEquipment);
    });
    it("rejects invalid slot", () => {
      expect(() => EquipmentDefinitionSchema.parse({ ...validEquipment, slot: "pants" })).toThrow();
    });
    it("extracts correct references", () => {
      const refs = equipmentCategory.getReferences!(validEquipment);
      expect(refs).toEqual([
        { targetCategory: "items", targetId: "iron_sword" },
        { targetCategory: "abilities", targetId: "sword_passive" },
      ]);
    });
    it("omits null ability references", () => {
      const noAbilities = { ...validEquipment, passiveAbilityId: null, activeAbilityId: null };
      const refs = equipmentCategory.getReferences!(noAbilities);
      expect(refs).toEqual([{ targetCategory: "items", targetId: "iron_sword" }]);
    });
  });

  describe("ConsumableDefinition", () => {
    it("validates valid data", () => {
      expect(ConsumableDefinitionSchema.parse(validConsumable)).toEqual(validConsumable);
    });
    it("extracts references to items and effects", () => {
      const refs = consumableCategory.getReferences!(validConsumable);
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "healing_potion_item" });
      expect(refs).toContainEqual({ targetCategory: "effects", targetId: "instant_heal" });
    });
  });

  describe("ResourceDefinition", () => {
    it("validates valid data", () => {
      expect(ResourceDefinitionSchema.parse(validResource)).toEqual(validResource);
    });
    it("extracts refinement reference", () => {
      const refs = resourceCategory.getReferences!(validResource);
      expect(refs).toEqual([{ targetCategory: "items", targetId: "iron_bar" }]);
    });
    it("returns empty refs when refinementTargetId is null", () => {
      const noRef = { ...validResource, refinementTargetId: null };
      const refs = resourceCategory.getReferences!(noRef);
      expect(refs).toEqual([]);
    });
  });

  describe("MonsterDefinition", () => {
    it("validates valid data", () => {
      expect(MonsterDefinitionSchema.parse(validMonster)).toEqual(validMonster);
    });
    it("extracts references to abilities and loot table", () => {
      const refs = monsterCategory.getReferences!(validMonster);
      expect(refs).toContainEqual({ targetCategory: "abilities", targetId: "slash" });
      expect(refs).toContainEqual({ targetCategory: "loot_tables", targetId: "skeleton_loot" });
    });
  });

  describe("LootTableDefinition", () => {
    it("validates valid data", () => {
      expect(LootTableDefinitionSchema.parse(validLootTable)).toEqual(validLootTable);
    });
    it("extracts item references from entries and guaranteed drops", () => {
      const refs = lootTableCategory.getReferences!(validLootTable);
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "bone" });
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "silver" });
    });
  });

  describe("AbilityDefinition", () => {
    it("validates valid data", () => {
      expect(AbilityDefinitionSchema.parse(validAbility)).toEqual(validAbility);
    });
    it("extracts effect references", () => {
      const refs = abilityCategory.getReferences!(validAbility);
      expect(refs).toEqual([{ targetCategory: "effects", targetId: "slash_damage" }]);
    });
  });

  describe("EffectDefinition", () => {
    it("validates valid data", () => {
      expect(EffectDefinitionSchema.parse(validEffect)).toEqual(validEffect);
    });
    it("accepts null scaling", () => {
      const noScaling = { ...validEffect, scaling: null };
      expect(EffectDefinitionSchema.parse(noScaling).scaling).toBeNull();
    });
    it("has no getReferences", () => {
      expect("getReferences" in effectCategory).toBe(false);
    });
  });

  describe("RecipeDefinition", () => {
    it("validates valid data", () => {
      expect(RecipeDefinitionSchema.parse(validRecipe)).toEqual(validRecipe);
    });
    it("extracts references to items and buildings", () => {
      const refs = recipeCategory.getReferences!(validRecipe);
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "iron_ore" });
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "iron_bar" });
      expect(refs).toContainEqual({ targetCategory: "buildings", targetId: "smelter" });
    });
  });

  describe("BiomeDefinition", () => {
    it("validates valid data", () => {
      expect(BiomeDefinitionSchema.parse(validBiome)).toEqual(validBiome);
    });
    it("has no getReferences", () => {
      expect("getReferences" in biomeCategory).toBe(false);
    });
  });

  describe("ZoneDefinition", () => {
    it("validates valid data", () => {
      expect(ZoneDefinitionSchema.parse(validZone)).toEqual(validZone);
    });
    it("extracts references to biome, monsters, and resources", () => {
      const refs = zoneCategory.getReferences!(validZone);
      expect(refs).toContainEqual({ targetCategory: "biomes", targetId: "forest" });
      expect(refs).toContainEqual({ targetCategory: "monsters", targetId: "skeleton_warrior" });
      expect(refs).toContainEqual({ targetCategory: "monsters", targetId: "skeleton_boss" });
      expect(refs).toContainEqual({ targetCategory: "resources", targetId: "iron_ore" });
    });
  });

  describe("BuildingDefinition", () => {
    it("validates valid data", () => {
      expect(BuildingDefinitionSchema.parse(validBuilding)).toEqual(validBuilding);
    });
    it("extracts references to recipes and items", () => {
      const refs = buildingCategory.getReferences!(validBuilding);
      expect(refs).toContainEqual({ targetCategory: "recipes", targetId: "iron_bar_recipe" });
      expect(refs).toContainEqual({ targetCategory: "items", targetId: "stone_block" });
    });
  });

  describe("WorkerDefinition", () => {
    it("validates valid data", () => {
      expect(WorkerDefinitionSchema.parse(validWorker)).toEqual(validWorker);
    });
    it("has no getReferences", () => {
      expect("getReferences" in workerCategory).toBe(false);
    });
  });

  describe("CurrencyDefinition", () => {
    it("validates valid data", () => {
      expect(CurrencyDefinitionSchema.parse(validCurrency)).toEqual(validCurrency);
    });
    it("has no getReferences", () => {
      expect("getReferences" in currencyCategory).toBe(false);
    });
  });

  describe("MasteryDefinition", () => {
    it("validates valid data", () => {
      expect(MasteryDefinitionSchema.parse(validMastery)).toEqual(validMastery);
    });
    it("rejects invalid category", () => {
      expect(() => MasteryDefinitionSchema.parse({ ...validMastery, category: "fishing" })).toThrow();
    });
    it("has no getReferences", () => {
      expect("getReferences" in masteryCategory).toBe(false);
    });
  });

  describe("All categories", () => {
    const allCategories = [
      statCategory, itemCategory, equipmentCategory, consumableCategory,
      resourceCategory, monsterCategory, lootTableCategory, abilityCategory,
      effectCategory, recipeCategory, biomeCategory, zoneCategory,
      buildingCategory, workerCategory, currencyCategory, masteryCategory,
      vendorCategory,
    ];

    it("has 17 categories", () => {
      expect(allCategories).toHaveLength(17);
    });

    it("all have unique category names", () => {
      const names = allCategories.map((c) => c.category);
      expect(new Set(names).size).toBe(17);
    });

    it("all have version 1", () => {
      for (const cat of allCategories) {
        expect(cat.version).toBe(1);
      }
    });
  });
});
