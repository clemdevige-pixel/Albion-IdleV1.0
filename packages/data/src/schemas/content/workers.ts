import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

const WorkerProfession = z.enum([
  "blacksmith", "carpenter", "cook", "alchemist", "tanner", "weaver", "stonemason",
]);

export const WorkerDefinitionSchema = z.object({
  id: z.string(),
  profession: WorkerProfession,
  tier: z.number().int().min(1).max(8),
  efficiency: z.number().gt(0),
  assignableBuildingCategories: z.array(z.string()),
  tags: z.array(z.string()),
});

export type WorkerDefinition = z.infer<typeof WorkerDefinitionSchema>;

export const workerCategory = defineDataCategory({
  category: "workers" as const,
  schema: WorkerDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
