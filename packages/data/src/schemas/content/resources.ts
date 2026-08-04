import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const ResourceFamily = z.enum(["ore", "wood", "fiber", "stone", "hide"]);
const GatheringProfession = z.enum(["mining", "lumberjack", "harvester", "quarrier", "skinner"]);

export const ResourceDefinitionSchema = z.object({
  id: z.string(),
  family: ResourceFamily,
  tier: z.number().int().min(1).max(8),
  gatheringProfession: GatheringProfession,
  gatheringDifficulty: z.number().min(0),
  baseYield: z.number().int().min(1),
  gatheringDuration: z.number().int().min(1),
  refinementTargetId: z.string().nullable(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

export const resourceCategory = defineDataCategory({
  category: "resources" as const,
  schema: ResourceDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    if (r.refinementTargetId) {
      refs.push({ targetCategory: "items", targetId: r.refinementTargetId });
    }
    return refs;
  },
});
