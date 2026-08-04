import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const MonsterCategory = z.enum(["normal", "veteran", "elite", "boss", "resource_enemy"]);

export const MonsterDefinitionSchema = z.object({
  id: z.string(),
  family: z.string(),
  category: MonsterCategory,
  tier: z.number().int().min(1).max(8),
  stats: z.record(z.string(), z.number()),
  abilities: z.array(z.string()),
  lootTableId: z.string(),
  experienceReward: z.number().int().min(0),
  spawnWeight: z.number().gt(0),
  tags: z.array(z.string()),
});

export type MonsterDefinition = z.infer<typeof MonsterDefinitionSchema>;

export const monsterCategory = defineDataCategory({
  category: "monsters" as const,
  schema: MonsterDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    for (const abilityId of r.abilities) {
      refs.push({ targetCategory: "abilities", targetId: abilityId });
    }
    refs.push({ targetCategory: "loot_tables", targetId: r.lootTableId });
    return refs;
  },
});
