// Legacy exports (backwards compatible)
export { DataValidationError } from "./errors.js";
export {
  ContentManifestSchema,
  ContentCollectionSchema,
  type ContentManifest,
  type ContentCollection,
} from "./schemas/content-manifest.js";
export {
  AssetManifestSchema,
  AssetEntrySchema,
  AssetTypeSchema,
  type AssetManifest,
  type AssetEntry,
  type AssetType,
} from "./schemas/asset-manifest.js";
export { loadJsonFile, loadContentManifest, loadAssetManifest } from "./loader.js";

// Data Runtime exports
export type { Brand } from "./brand.js";
export { type DataId, validateDataId, asDataId } from "./data-id.js";
export {
  type Severity,
  type IssueCode,
  type ValidationIssue,
  type ValidationResult,
  ok,
  fail,
} from "./diagnostics.js";
export {
  type DataCategory,
  type DataReference,
  type DataCategoryOptions,
  defineDataCategory,
} from "./category.js";
export { DataRegistry } from "./registry.js";
export {
  type DataSource,
  createJsonFileSource,
  createInMemorySource,
} from "./source.js";
export {
  type SemanticValidator,
  type SemanticValidationContext,
} from "./validation.js";
export {
  type DataLoaderConfig,
  type LoadedRegistries,
  loadData,
} from "./loader/data-loader.js";
export { DataFileSchema, type DataFile } from "./schemas/data-file.js";

export * from "./schemas/content/index.js";
export * from "./localization/index.js";
export * from "./assets/index.js";

export * from "./config/combat-progression.js";
export * from "./config/combat-automation-balance.js";
export * from "./config/world-combat-reward-balance.js";
export * from "./config/world-bands.js";
export * from "./config/world-progression-contract.js";
export * from "./config/item-power-balance.js";
export * from "./config/enchantment-balance.js";
export * from "./config/enchantment-recipe-balance.js";
export * from "./config/mastery-experience-balance.js";
export * from "./config/destiny-content.js";
export * from "./config/faction-runes.js";
export * from "./config/faction-rune-world-drops.js";
export * from "./config/faction-mastery-balance.js";
export * from "./config/faction-cape-balance.js";
export * from "./config/endless-tower.js";
export * from "./config/tower-reward-balance.js";
export * from "./config/daily-reset.js";
export * from "./config/economy-balance.js";
export * from "./config/economic-item-values.js";
export * from "./config/merchant-daily-balance.js";
export * from "./config/black-market-balance.js";
export * from "./config/bank-expansion-balance.js";
export * from "./config/dungeon-keys.js";
export * from "./config/dungeon-artifacts.js";
export * from "./config/dungeon-loot-balance.js";
export * from "./config/dungeon-relic.js";
export * from "./config/research-content.js";
export * from "./config/awakening-balance.js";
export * from "./config/artifact-weapon-craft-balance.js";
export * from "./config/expedition-balance.js";
export * from "./config/production-balance.js";
export * from "./config/gathering-content.js";
export * from "./config/gathering-progression.js";
export * from "./config/refining-content.js";
export * from "./config/worker-content.js";
export * from "./config/island.js";
export * from "./config/island-progression.js";
export * from "./config/island-levels.js";
export * from "./config/academy-progression.js";
export * from "./config/island-building-progression.js";
export * from "./config/weapon-ability-content.js";
export * from "./config/weapon-content.js";
export * from "./config/faction-artifact-weapon-content.js";
export * from "./config/monster-ability-content.js";
export * from "./config/monster-content.js";
