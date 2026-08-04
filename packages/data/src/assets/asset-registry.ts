import type { AssetCategory, AssetDefinition } from "./types.js";

export class AssetRegistry {
  private readonly byId: ReadonlyMap<string, AssetDefinition>;
  private readonly all: readonly AssetDefinition[];

  constructor(assets: readonly AssetDefinition[]) {
    this.all = assets;
    const map = new Map<string, AssetDefinition>();
    for (const asset of assets) {
      map.set(asset.id, asset);
    }
    this.byId = map;
  }

  get(id: string): AssetDefinition {
    const asset = this.byId.get(id);
    if (!asset) {
      throw new Error(`Asset not found: ${id}`);
    }
    return asset;
  }

  tryGet(id: string): AssetDefinition | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  list(type?: AssetCategory): readonly AssetDefinition[] {
    if (type === undefined) {
      return this.all;
    }
    return this.all.filter((a) => a.type === type);
  }

  resolve(id: string): string {
    return this.get(id).path;
  }

  getIds(): readonly string[] {
    return Array.from(this.byId.keys());
  }

  getCount(): number {
    return this.all.length;
  }
}
