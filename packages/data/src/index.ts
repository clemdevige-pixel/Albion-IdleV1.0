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

// Combat progression config
export * from "./config/combat-progression.js";

// World progression bands and authored progression contract
export * from "./config/world-bands.js";
export * from "./config/world-progression-contract.js";

// Shared faction resource identifiers and world drop rules
export * from "./config/faction-runes.js";
export * from "./config/faction-rune-world-drops.js";

// Authored economy and loot balance values
export * from "./config/economy-balance.js";

// Canonical dungeon entry currency identifiers
export * from "./config/dungeon-keys.js";

// Player Island configuration
export * from "./config/island.js";
export * from "./config/island-progression.js";
export * from "./config/island-levels.js";
export * from "./config/academy-progression.js";
export * from "./config/island-building-progression.js";
