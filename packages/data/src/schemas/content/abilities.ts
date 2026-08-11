import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const AbilityCategory = z.enum(["active", "passive", "triggered"]);
const AbilityType = z.enum(["damage", "heal", "buff", "debuff", "movement", "utility", "summon"]);
const OwnerRestriction = z.enum(["player", "enemy", "boss", "any"]);
const TargetRule = z.enum(["self", "enemy", "ally", "area", "direction", "none"]);

export const AbilityDefinitionSchema = z.object({
  id: z.string(),
  category: AbilityCategory,
  abilityType: AbilityType,
  owner: OwnerRestriction,
  weaponFamily: z.string().nullable(),
  cooldown: z.number().min(0),
  resourceCost: z.object({
    health: z.number().optional(),
  }),
  castTime: z.number().min(0),
  range: z.number().min(0),
  targetRule: TargetRule,
  interruptible: z.boolean(),
  globalCooldown: z.boolean(),
  effects: z.array(z.string()),
  tags: z.array(z.string()),
});

export type AbilityDefinition = z.infer<typeof AbilityDefinitionSchema>;

export const abilityCategory = defineDataCategory({
  category: "abilities" as const,
  schema: AbilityDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [];
    for (const effectId of r.effects) {
      refs.push({ targetCategory: "effects", targetId: effectId });
    }
    return refs;
  },
});
