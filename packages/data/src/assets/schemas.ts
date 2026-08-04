import { z } from "zod";

export const AssetDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["sprite", "tileset", "icon", "animation", "audio", "music", "ui", "font", "vfx"]),
  path: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export const AssetManifestDataSchema = z.object({
  version: z.number().int().positive(),
  assets: z.array(AssetDefinitionSchema),
});
