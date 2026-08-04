import { z } from "zod";

export const SaveMetadataSchema = z.object({
  version: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  buildVersion: z.string(),
  seed: z.number().int(),
  extra: z.record(z.unknown()).optional(),
});

export type SaveMetadata = z.infer<typeof SaveMetadataSchema>;

export const SaveFormatSchema = z.object({
  version: z.number().int().nonnegative(),
  metadata: SaveMetadataSchema,
  payload: z.record(z.unknown()),
  checksum: z.string(),
});

export type SaveFormat = z.infer<typeof SaveFormatSchema>;
