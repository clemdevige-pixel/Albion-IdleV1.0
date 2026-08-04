import { z } from "zod";

export const TranslationFileSchema = z.object({
  language: z.string().min(2).max(5),
  namespace: z.string().min(1),
  entries: z.record(z.string(), z.string()),
});
