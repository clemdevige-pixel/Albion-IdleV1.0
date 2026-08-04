import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const ConsumableType = z.enum(["food", "potion"]);

export const ConsumableDefinitionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  consumableType: ConsumableType,
  duration: z.number().min(0),
  cooldown: z.number().min(0),
  effects: z.array(z.string()),
  tags: z.array(z.string()),
});

export type ConsumableDefinition = z.infer<typeof ConsumableDefinitionSchema>;

export const consumableCategory = defineDataCategory({
  category: "consumables" as const,
  schema: ConsumableDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [
      { targetCategory: "items", targetId: r.itemId },
    ];
    for (const effectId of r.effects) {
      refs.push({ targetCategory: "effects", targetId: effectId });
    }
    return refs;
  },
});
