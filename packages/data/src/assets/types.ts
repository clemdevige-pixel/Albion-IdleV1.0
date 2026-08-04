export type AssetCategory = "sprite" | "tileset" | "icon" | "animation" | "audio" | "music" | "ui" | "font" | "vfx";

export interface AssetDefinition {
  readonly id: string;
  readonly type: AssetCategory;
  readonly path: string;
  readonly category: string;
  readonly tags?: readonly string[] | undefined;
}

export interface AssetManifestData {
  readonly version: number;
  readonly assets: readonly AssetDefinition[];
}
