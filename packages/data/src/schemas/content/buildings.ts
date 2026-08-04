import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const BuildingCategory = z.enum(["crafting", "refining", "cooking", "storage", "utility"]);

const UpgradeCostSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(1),
});

export const BuildingDefinitionSchema = z.object({
  id: z.string(),
  category: BuildingCategory,
  tier: z.number().int().min(1).max(8),
  maxWorkers: z.number().int().min(0),
  supportedRecipeIds: z.array(z.string()),
  upgradeCost: z.array(UpgradeCostSchema),
  tags: z.array(z.string()),
});

export type BuildingDefinition = z.infer<typeof BuildingDefinitionSchema>;

export const buildingCategory = defineDataCategory({
  category: "buildings" as const,
  schema: BuildingDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    for (const recipeId of r.supportedRecipeIds) {
      refs.push({ targetCategory: "recipes", targetId: recipeId });
    }
    for (const cost of r.upgradeCost) {
      refs.push({ targetCategory: "items", targetId: cost.itemId });
    }
    return refs;
  },
});
