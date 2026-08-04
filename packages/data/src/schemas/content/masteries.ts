import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

const MasteryCategory = z.enum(["combat", "gathering", "crafting", "refining"]);

export const MasteryDefinitionSchema = z.object({
  id: z.string(),
  category: MasteryCategory,
  maxLevel: z.number().int().min(1),
  experiencePerLevel: z.array(z.number()),
  tags: z.array(z.string()),
});

export type MasteryDefinition = z.infer<typeof MasteryDefinitionSchema>;

export const masteryCategory = defineDataCategory({
  category: "masteries" as const,
  schema: MasteryDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
