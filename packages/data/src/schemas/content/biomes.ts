import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

export const BiomeDefinitionSchema = z.object({
  id: z.string(),
  enemyFamilies: z.array(z.string()),
  resourceFamilies: z.array(z.string()),
  dangerModifier: z.number().min(0),
  tags: z.array(z.string()),
});

export type BiomeDefinition = z.infer<typeof BiomeDefinitionSchema>;

export const biomeCategory = defineDataCategory({
  category: "biomes" as const,
  schema: BiomeDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
