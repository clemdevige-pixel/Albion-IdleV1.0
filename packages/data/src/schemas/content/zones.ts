import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

export const ZoneDefinitionSchema = z.object({
  id: z.string(),
  biomeId: z.string(),
  tier: z.number().int().min(1).max(8),
  dangerLevel: z.number().int().min(1),
  monsterIds: z.array(z.string()),
  bossIds: z.array(z.string()),
  resourceIds: z.array(z.string()),
  segmentCount: z.number().int().min(1),
  tags: z.array(z.string()),
});

export type ZoneDefinition = z.infer<typeof ZoneDefinitionSchema>;

export const zoneCategory = defineDataCategory({
  category: "zones" as const,
  schema: ZoneDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [
      { targetCategory: "biomes", targetId: r.biomeId },
    ];
    for (const id of r.monsterIds) {
      refs.push({ targetCategory: "monsters", targetId: id });
    }
    for (const id of r.bossIds) {
      refs.push({ targetCategory: "monsters", targetId: id });
    }
    for (const id of r.resourceIds) {
      refs.push({ targetCategory: "resources", targetId: id });
    }
    return refs;
  },
});
