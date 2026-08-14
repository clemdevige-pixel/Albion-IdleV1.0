import type { EntityId } from "@game/core";
import type { InventoryManager } from "@game/gameplay";
import {
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";

export function getIslandMaterialQuantity(
  inventoryManager: InventoryManager,
  storageId: EntityId,
  itemId: string,
): number {
  return inventoryManager.getTotalQuantity(storageId, itemId);
}

export function getIslandMaterialLabel(itemId: string): string {
  for (const familyId of PRODUCTION_FAMILY_IDS) {
    const family = getProductionFamilyDefinition(familyId);
    for (const tier of PRODUCTION_CONTENT_TIERS) {
      const recipe = getProductionRefiningRecipe(familyId, tier);
      if (recipe.rawItemId === itemId) return `${family.rawMaterialLabel} T${String(tier)}`;
      if (recipe.outputItemId === itemId) return `${family.label} raffiné T${String(tier)}`;
    }
  }
  return itemId;
}
