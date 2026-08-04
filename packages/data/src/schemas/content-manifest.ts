import { z } from "zod";

/**
 * A content collection groups definitions of one kind (e.g. items, enemies).
 *
 * Phase 01 only defines the envelope. Concrete definition schemas are added in
 * later content phases; `entries` is intentionally permissive-but-structured so
 * the pipeline exists and is extensible without hardcoding gameplay shapes yet.
 */
export const ContentCollectionSchema = z.object({
  /** Unique, stable identifier for the collection (kebab-case). */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, "collection id must be kebab-case"),
  /** Kind of definitions held by this collection. */
  kind: z.string().min(1),
  /** Definition entries. Each entry must at least carry a unique string `id`. */
  entries: z.array(z.object({ id: z.string().min(1) }).passthrough()).default([]),
});

export type ContentCollection = z.infer<typeof ContentCollectionSchema>;

/**
 * Root manifest describing every content collection the game ships.
 *
 * For Phase 01 this may be empty (`collections: []`) but it must be a valid,
 * well-formed document.
 */
export const ContentManifestSchema = z.object({
  version: z.number().int().positive(),
  collections: z.array(ContentCollectionSchema).default([]),
});

export type ContentManifest = z.infer<typeof ContentManifestSchema>;
