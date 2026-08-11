import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DataCategory } from "../category.js";
import { loadData } from "../loader/data-loader.js";
import { createInMemorySource } from "../source.js";
import {
  statCategory,
  itemCategory,
  equipmentCategory,
  consumableCategory,
  resourceCategory,
  monsterCategory,
  lootTableCategory,
  abilityCategory,
  effectCategory,
  recipeCategory,
  biomeCategory,
  zoneCategory,
  buildingCategory,
  workerCategory,
  currencyCategory,
  masteryCategory,
  vendorCategory,
} from "../schemas/content/index.js";
import { TranslationFileSchema } from "../localization/schemas.js";
import { TranslationRegistry } from "../localization/translation-registry.js";
import { AssetManifestDataSchema } from "../assets/schemas.js";
import { AssetValidator } from "../assets/asset-validator.js";

const CONTENT_DIR = resolve(import.meta.dirname, "../../../../content");
const ASSETS_DIR = resolve(import.meta.dirname, "../../../../assets");

async function loadJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as unknown;
}

const allCategories = [
  statCategory,
  itemCategory,
  equipmentCategory,
  consumableCategory,
  resourceCategory,
  monsterCategory,
  lootTableCategory,
  abilityCategory,
  effectCategory,
  recipeCategory,
  biomeCategory,
  zoneCategory,
  buildingCategory,
  workerCategory,
  currencyCategory,
  masteryCategory,
  vendorCategory,
];

const dataFiles = [
  "stats", "items", "equipment", "consumables", "resources",
  "monsters", "loot_tables", "abilities", "effects", "recipes",
  "biomes", "zones", "buildings", "workers", "currencies", "masteries",
  "vendors",
];

describe("Content Data Integration", () => {
  it("loads all 17 data files through Data Runtime with valid schemas and references", async () => {
    const sources = await Promise.all(
      dataFiles.map(async (name) => {
        const data = await loadJson(resolve(CONTENT_DIR, `data/${name}.json`));
        return createInMemorySource(name, data);
      }),
    );

    const result = await loadData({
      categories: allCategories,
      sources,
    });

    if (!result.success) {
      const msgs = result.issues.map((i) => i.message).join("\n");
      expect.fail(`Data loading failed:\n${msgs}`);
    }

    expect(result.success).toBe(true);

    const stats = result.value.getRegistry(statCategory);
    expect(stats.getCount()).toBeGreaterThanOrEqual(10);

    const items = result.value.getRegistry(itemCategory);
    expect(items.getCount()).toBeGreaterThanOrEqual(10);

    const equipment = result.value.getRegistry(equipmentCategory);
    expect(equipment.getCount()).toBeGreaterThanOrEqual(2);

    const monsters = result.value.getRegistry(monsterCategory);
    expect(monsters.getCount()).toBeGreaterThanOrEqual(4);

    const abilities = result.value.getRegistry(abilityCategory);
    expect(abilities.getCount()).toBeGreaterThanOrEqual(6);

    const effects = result.value.getRegistry(effectCategory);
    expect(effects.getCount()).toBeGreaterThanOrEqual(6);
  });

  it("has no duplicate IDs across any category", async () => {
    const sources = await Promise.all(
      dataFiles.map(async (name) => {
        const data = await loadJson(resolve(CONTENT_DIR, `data/${name}.json`));
        return createInMemorySource(name, data);
      }),
    );

    const result = await loadData({
      categories: allCategories,
      sources,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const cat of allCategories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = result.value.getRegistry(cat as DataCategory<any, string>);
      const ids = registry.getIds();
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it("loads English localization files", async () => {
    const locFiles = ["items", "monsters", "abilities", "ui"];
    const registry = new TranslationRegistry();

    for (const name of locFiles) {
      const raw = await loadJson(resolve(CONTENT_DIR, `localization/en/${name}.json`));
      const parsed = TranslationFileSchema.parse(raw);
      registry.register(parsed);
    }

    expect(registry.getLanguages()).toContain("en");
    expect(registry.has("en", "items.item.weapon.sword_t4_broadsword.name")).toBe(true);
    expect(registry.get("en", "items.item.weapon.sword_t4_broadsword.name")).toBe("Broadsword");
    expect(registry.has("en", "monsters.monster.wolf_t4.name")).toBe(true);
    expect(registry.has("en", "abilities.ability.sword_slash.name")).toBe(true);
    expect(registry.has("en", "ui.ui.inventory.title")).toBe(true);
  });

  it("loads asset manifest", async () => {
    const raw = await loadJson(resolve(ASSETS_DIR, "manifests/asset-manifest.json"));
    const parsed = AssetManifestDataSchema.parse(raw);
    const validator = new AssetValidator();
    const issues = validator.validate(parsed);

    expect(issues.length).toBe(0);
    expect(parsed.assets.length).toBeGreaterThanOrEqual(10);
  });
});
