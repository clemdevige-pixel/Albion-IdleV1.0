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

// Content schemas
export * from "./schemas/content/index.js";

// Localization
export * from "./localization/index.js";

// Asset Manifest Runtime
export * from "./assets/index.js";

// Combat progression and automation config
export * from "./config/combat-progression.js";
export * from "./config/combat-automation-balance.js";

// World progression bands and authored progression contract
export * from "./config/world-bands.js";
export * from "./config/world-progression-contract.js";
export * from "./config/item-power-balance.js";
export * from "./config/enchantment-balance.js";
export * from "./config/enchantment-recipe-balance.js";

// Mastery and Destiny progression balance/content
export * from "./config/mastery-experience-balance.js";
export * from "./config/destiny-content.js";

// Shared faction resource identifiers and world drop rules
export * from "./config/faction-runes.js";
export * from "./config/faction-rune-world-drops.js";

// Authored faction mastery and cape balance
export * from "./config/faction-mastery-balance.js";
export * from "./config/faction-cape-balance.js";

// Authored economy and loot balance values
export * from "./config/economy-balance.js";

// Canonical dungeon identifiers and authored dungeon loot balance
export * from "./config/dungeon-keys.js";
export * from "./config/dungeon-artifacts.js";
export * from "./config/dungeon-loot-balance.js";
export * from "./config/dungeon-relic.js";

// Authored research progression and unlock graph
export * from "./config/research-content.js";

// Authored awakened weapon balance
export * from "./config/awakening-balance.js";

// Authored artifact weapon and expedition reward balance
export * from "./config/artifact-weapon-craft-balance.js";
export * from "./config/expedition-balance.js";

// Authored production progression, cadence, gathering, refining, and worker content
export * from "./config/production-balance.js";
export * from "./config/gathering-content.js";
export * from "./config/gathering-progression.js";
export * from "./config/refining-content.js";
export * from "./config/worker-content.js";

// Player Island configuration
export * from "./config/island.js";
export * from "./config/island-progression.js";
export * from "./config/island-levels.js";
export * from "./config/academy-progression.js";
export * from "./config/island-building-progression.js";
