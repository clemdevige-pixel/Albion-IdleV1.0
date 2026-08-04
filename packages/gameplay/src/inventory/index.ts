export type {
  ItemInstanceId,
  InventoryEntry,
  EnchantmentLevel,
  InventorySlot,
  InventoryFailureReason,
  InventoryResult,
  ItemStackInfoLike,
  StackInfoResolver,
  BagInfoLike,
  BagInfoResolver,
  BagChangeOutcome,
  AddQuantityOutcome,
  RemoveQuantityOutcome,
  MergeStacksOutcome,
} from "./types.js";
export {
  areEntriesStackCompatible,
  getEnchantmentLevel,
  isEnchantmentLevel,
} from "./types.js";
export { toItemInstanceId, inventoryOk, inventoryFail, effectiveMaxStack } from "./types.js";
export { InventoryComponent, type InventoryData } from "./components.js";
export { InventoryManager } from "./inventory-manager.js";
export { validateInventory } from "./inventory-validator.js";
export { InventorySaveProvider } from "./inventory-save-provider.js";
