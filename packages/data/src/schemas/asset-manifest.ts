import { z } from "zod";

/** Supported asset categories referenced by content definitions. */
export const AssetTypeSchema = z.enum(["sprite", "icon", "audio", "atlas", "font", "data"]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * A single addressable asset. Definitions reference assets by `id`, never by
 * raw path — this indirection is enforced here as the single source of truth.
 */
export const AssetEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9._-]*$/, "asset id must be lowercase dotted/kebab"),
  type: AssetTypeSchema,
  /** Path relative to the processed-assets root. */
  path: z.string().min(1),
  /** Optional grouping category for asset organisation. */
  category: z.string().optional(),
});

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

/** Root asset manifest. May be empty for Phase 01 but must be well-formed. */
export const AssetManifestSchema = z.object({
  version: z.number().int().positive(),
  assets: z.array(AssetEntrySchema).default([]),
});

export type AssetManifest = z.infer<typeof AssetManifestSchema>;
