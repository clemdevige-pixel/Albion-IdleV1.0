import { resolveEquipmentInfo } from "../../data/itemContentCatalog";
import { isRelicInventoryItem } from "../../data/relicContentCatalog";

export type StorageItemCategory = "equipment" | "resources" | "special";

export function isSpecialStorageItem(itemId: string): boolean {
  return isRelicInventoryItem(itemId)
    || itemId.startsWith("item_resource_dungeon_key_")
    || itemId.startsWith("item_resource_artifact_")
    || itemId.startsWith("item_resource_key_fragment_");
}

export function getStorageItemCategory(itemId: string): StorageItemCategory {
  if (resolveEquipmentInfo(itemId) !== undefined) return "equipment";
  if (isSpecialStorageItem(itemId)) return "special";
  return "resources";
}
