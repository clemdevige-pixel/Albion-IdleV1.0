import { z } from "zod";

export const CloudSaveSlotIdSchema = z.enum([
  "player_slot_1",
  "player_slot_2",
  "player_slot_3",
]);

/** Transport shape mirrors the validated persistence SaveFormat. */
export const CloudSaveDocumentSchema = z.object({
  version: z.number().int().nonnegative(),
  metadata: z.object({
    version: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    buildVersion: z.string(),
    seed: z.number().int(),
    extra: z.record(z.unknown()).optional(),
  }),
  payload: z.record(z.unknown()),
  checksum: z.string().min(1),
});

export const CloudSaveSummarySchema = z.object({
  slotId: CloudSaveSlotIdSchema,
  updatedAt: z.number().int().nonnegative(),
});

export const CloudSaveListSchema = z.object({ saves: z.array(CloudSaveSummarySchema) });

export type CloudSaveSlotId = z.infer<typeof CloudSaveSlotIdSchema>;
export type CloudSaveDocument = z.infer<typeof CloudSaveDocumentSchema>;
export type CloudSaveSummary = z.infer<typeof CloudSaveSummarySchema>;
export type CloudSaveList = z.infer<typeof CloudSaveListSchema>;
