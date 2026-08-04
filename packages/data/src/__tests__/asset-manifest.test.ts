import { describe, expect, it } from "vitest";
import { loadAssetManifestData } from "../assets/asset-loader.js";
import { AssetRegistry } from "../assets/asset-registry.js";
import { AssetValidator } from "../assets/asset-validator.js";
import type { AssetDefinition, AssetManifestData } from "../assets/types.js";

function makeManifest(assets: AssetDefinition[], version = 1): AssetManifestData {
  return { version, assets };
}

const sword: AssetDefinition = { id: "item.sword", type: "sprite", path: "items/sword.png", category: "items" };
const goblin: AssetDefinition = { id: "mob.goblin", type: "animation", path: "mobs/goblin.png", category: "monsters" };
const click: AssetDefinition = { id: "sfx.click", type: "audio", path: "audio/click.ogg", category: "ui", tags: ["sfx"] };

describe("AssetRegistry", () => {
  it("loads valid manifest and builds registry", () => {
    const result = loadAssetManifestData({ version: 1, assets: [sword, goblin, click] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.getCount()).toBe(3);
    }
  });

  it("get returns asset by ID", () => {
    const reg = new AssetRegistry([sword, goblin]);
    expect(reg.get("item.sword")).toEqual(sword);
  });

  it("get throws for missing ID", () => {
    const reg = new AssetRegistry([sword]);
    expect(() => reg.get("nope")).toThrow("Asset not found: nope");
  });

  it("tryGet returns undefined for missing asset", () => {
    const reg = new AssetRegistry([sword]);
    expect(reg.tryGet("nope")).toBeUndefined();
  });

  it("has returns true/false correctly", () => {
    const reg = new AssetRegistry([sword]);
    expect(reg.has("item.sword")).toBe(true);
    expect(reg.has("nope")).toBe(false);
  });

  it("list returns all assets", () => {
    const reg = new AssetRegistry([sword, goblin, click]);
    expect(reg.list()).toHaveLength(3);
  });

  it("list filters by type", () => {
    const reg = new AssetRegistry([sword, goblin, click]);
    expect(reg.list("sprite")).toEqual([sword]);
    expect(reg.list("audio")).toEqual([click]);
  });

  it("resolve returns the path", () => {
    const reg = new AssetRegistry([sword]);
    expect(reg.resolve("item.sword")).toBe("items/sword.png");
  });

  it("getCount returns correct number", () => {
    const reg = new AssetRegistry([sword, goblin]);
    expect(reg.getCount()).toBe(2);
  });

  it("empty manifest produces empty registry", () => {
    const result = loadAssetManifestData({ version: 1, assets: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.getCount()).toBe(0);
      expect(result.value.list()).toEqual([]);
    }
  });
});

describe("AssetValidator", () => {
  const validator = new AssetValidator();

  it("detects duplicate IDs", () => {
    const issues = validator.validate(makeManifest([sword, { ...goblin, id: "item.sword" }]));
    expect(issues.some((i) => i.code === "DATA_DUPLICATE_ID")).toBe(true);
  });

  it("detects duplicate paths", () => {
    const issues = validator.validate(makeManifest([sword, { ...goblin, path: "items/sword.png" }]));
    expect(issues.some((i) => i.code === "DATA_SEMANTIC_ERROR")).toBe(true);
  });
});

describe("loadAssetManifestData", () => {
  it("rejects invalid manifest", () => {
    const result = loadAssetManifestData({ version: -1, assets: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = loadAssetManifestData({});
    expect(result.success).toBe(false);
  });
});
