import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

const ItemCategory = z.enum([
  "equipment", "resource", "refined_resource", "consumable",
  "material", "quest", "building", "furniture", "miscellaneous",
]);

export const ItemDefinitionSchema = z.object({
  id: z.string(),
  category: ItemCategory,
  tier: z.number().int().min(1).max(8),
  supportsQuality: z.boolean(),
  supportsEnchantments: z.boolean(),
  stackable: z.boolean(),
  maxStack: z.number().int().min(1),
  weight: z.number().min(0),
  baseValue: z.number().int().min(0),
  tags: z.array(z.string()),
  referenceId: z.string().nullable(),
});

export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;

export const itemCategory = defineDataCategory({
  category: "items" as const,
  schema: ItemDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
