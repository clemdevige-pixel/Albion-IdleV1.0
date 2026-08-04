import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const RecipeCategory = z.enum(["crafting", "refining", "cooking"]);

const RecipeIngredientSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(1),
});

const RecipeOutputSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(1),
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeOutput = z.infer<typeof RecipeOutputSchema>;

export const RecipeDefinitionSchema = z.object({
  id: z.string(),
  category: RecipeCategory,
  inputs: z.array(RecipeIngredientSchema),
  outputs: z.array(RecipeOutputSchema),
  productionTime: z.number().int().min(1),
  requiredBuildingId: z.string().nullable(),
  tier: z.number().int().min(1).max(8),
  tags: z.array(z.string()),
});

export type RecipeDefinition = z.infer<typeof RecipeDefinitionSchema>;

export const recipeCategory = defineDataCategory({
  category: "recipes" as const,
  schema: RecipeDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    for (const input of r.inputs) {
      refs.push({ targetCategory: "items", targetId: input.itemId });
    }
    for (const output of r.outputs) {
      refs.push({ targetCategory: "items", targetId: output.itemId });
    }
    if (r.requiredBuildingId) {
      refs.push({ targetCategory: "buildings", targetId: r.requiredBuildingId });
    }
    return refs;
  },
});
