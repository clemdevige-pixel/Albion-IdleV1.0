import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

const StatCategory = z.enum(["primary", "offensive", "defensive", "utility", "gathering", "hidden"]);
const StatValueType = z.enum(["integer", "float", "percentage", "boolean"]);
const StatDisplayFormat = z.enum(["integer", "decimal", "percentage", "boolean"]);

export const StatDefinitionSchema = z.object({
  id: z.string(),
  category: StatCategory,
  valueType: StatValueType,
  defaultValue: z.number(),
  minimumValue: z.number(),
  maximumValue: z.number().nullable(),
  precision: z.number().int().min(0),
  visible: z.boolean(),
  stackable: z.boolean(),
  displayFormat: StatDisplayFormat,
});

export type StatDefinition = z.infer<typeof StatDefinitionSchema>;

export const statCategory = defineDataCategory({
  category: "stats" as const,
  schema: StatDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
