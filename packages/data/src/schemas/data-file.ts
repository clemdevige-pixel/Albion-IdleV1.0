import { z } from "zod";

/**
 * Standard data file envelope.
 * Every data JSON file must conform to this shape before per-category validation.
 */
export const DataFileSchema = z.object({
  version: z.number().int().positive(),
  category: z.string().min(1),
  definitions: z.array(z.record(z.unknown())),
});

export type DataFile = z.infer<typeof DataFileSchema>;
