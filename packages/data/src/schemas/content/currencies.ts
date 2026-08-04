import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";

export const CurrencyDefinitionSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  precision: z.number().int().min(0),
  minValue: z.number().min(0),
  maxValue: z.number().nullable(),
  visible: z.boolean(),
  tradable: z.boolean(),
  acquisitionSources: z.array(z.string()).optional(),
  spendingSources: z.array(z.string()).optional(),
  tags: z.array(z.string()),
});

export type CurrencyDefinition = z.infer<typeof CurrencyDefinitionSchema>;

export const currencyCategory = defineDataCategory({
  category: "currencies" as const,
  schema: CurrencyDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});
