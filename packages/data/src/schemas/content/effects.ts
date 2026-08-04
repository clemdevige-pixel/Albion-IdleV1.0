import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

const EffectType = z.enum([
  "damage", "heal", "resource", "apply_status", "remove_status",
  "knockback", "pull", "teleport", "dash", "spawn_projectile",
  "spawn_entity", "modify_stat", "cleanse", "purge", "trigger_ability",
]);
const ScalingType = z.enum(["flat", "percentage", "stat_based", "weapon_damage"]);
const EffectTarget = z.enum([
  "self", "primary_target", "allies", "enemies", "area", "random_enemy", "random_ally",
]);

const ScalingSchema = z.object({
  type: ScalingType,
  multiplier: z.number(),
});

export const EffectDefinitionSchema = z.object({
  id: z.string(),
  type: EffectType,
  parameters: z.record(z.string(), z.unknown()),
  scaling: ScalingSchema.nullable(),
  target: EffectTarget,
  delay: z.number().min(0),
  flags: z.array(z.string()),
});

export type EffectDefinition = z.infer<typeof EffectDefinitionSchema>;

export const effectCategory = defineDataCategory({
  category: "effects" as const,
  schema: EffectDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
