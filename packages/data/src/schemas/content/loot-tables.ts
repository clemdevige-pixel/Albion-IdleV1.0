import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const LootEntrySchema = z.object({
  itemId: z.string(),
  weight: z.number().gt(0),
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1),
  conditions: z.array(z.string()),
});

export type LootEntry = z.infer<typeof LootEntrySchema>;

export const LootTableDefinitionSchema = z.object({
  id: z.string(),
  entries: z.array(LootEntrySchema),
  guaranteedDrops: z.array(z.string()),
  maxRolls: z.number().int().min(1),
});

export type LootTableDefinition = z.infer<typeof LootTableDefinitionSchema>;

export const lootTableCategory = defineDataCategory({
  category: "loot_tables" as const,
  schema: LootTableDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    for (const entry of r.entries) {
      refs.push({ targetCategory: "items", targetId: entry.itemId });
    }
    for (const itemId of r.guaranteedDrops) {
      refs.push({ targetCategory: "items", targetId: itemId });
    }
    return refs;
  },
});
