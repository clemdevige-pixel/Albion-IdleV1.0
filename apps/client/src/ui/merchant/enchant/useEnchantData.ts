import { useMemo } from "react";
import {
  ENCHANTMENT_RESOURCE_TIERS,
  getEnchantmentItemPowerBonus,
  getEnchantmentShardItemId,
  type ItemInstanceId,
} from "@game/gameplay";
import { getItemDefinition, getItemDisplayName } from "../../../panels/ItemVisual";
import { useGameServices } from "../../../state/GameContext";
import { isProductionMaterial } from "../../../runtime/ProductionStorage";
import { useMerchantData } from "../useMerchantData";
import type { EnchantModel, EnchantableItemModel } from "./enchantModels";

const STOCK_ITEM_IDS = ENCHANTMENT_RESOURCE_TIERS.map(getEnchantmentShardItemId);

export function useEnchantData(
  requestedInstanceId: string | null,
  selectedTier: number | null,
): EnchantModel {
  const snapshot = useMerchantData();
  const {
    enchantmentService,
    inventoryManager,
    heroId,
    productionStorageId,
  } = useGameServices();

  return useMemo(() => {
    const toEnchantableItems = (
      slots: typeof snapshot.inventory.slots,
      source: EnchantableItemModel["source"],
    ): readonly EnchantableItemModel[] => slots.flatMap((slot) => {
      if (slot.itemId === undefined || slot.instanceId === undefined) return [];
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      return preview === undefined || preview.failureReason === "item_not_enchantable" ? [] : [{
        itemId: slot.itemId,
        instanceId: slot.instanceId,
        enchantment: slot.enchantment,
        source,
      }];
    });

    const equippedItems: readonly EnchantableItemModel[] = snapshot.equipment.slots.flatMap((slot) => {
      if (slot.itemId === undefined || slot.instanceId === undefined) return [];
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      return preview === undefined || preview.failureReason === "item_not_enchantable" ? [] : [{
        itemId: slot.itemId,
        instanceId: slot.instanceId,
        enchantment: slot.enchantment,
        source: "equipped" as const,
      }];
    });
    const inventoryItems = toEnchantableItems(snapshot.inventory.slots, "inventory");
    const bankItems = toEnchantableItems(snapshot.bank.slots, "bank");
    const allItems = [...equippedItems, ...inventoryItems, ...bankItems];
    const availableTiers = [...new Set(allItems.flatMap((item) => {
      const tier = getItemDefinition(item.itemId)?.tier;
      return tier === undefined ? [] : [tier];
    }))].sort((a, b) => a - b);
    const items = selectedTier === null
      ? allItems
      : allItems.filter((item) => getItemDefinition(item.itemId)?.tier === selectedTier);
    const selectedInstanceId = items.some((item) => item.instanceId === requestedInstanceId)
      ? requestedInstanceId ?? undefined
      : items[0]?.instanceId;
    const rawPreview = selectedInstanceId === undefined
      ? undefined
      : enchantmentService.preview(selectedInstanceId as ItemInstanceId);
    const preview = rawPreview === undefined ? undefined : {
      instanceId: rawPreview.instanceId,
      itemId: rawPreview.itemId,
      currentLevel: rawPreview.currentLevel,
      nextLevel: rawPreview.nextLevel,
      silverCost: rawPreview.silverCost,
      itemPowerGain: rawPreview.nextLevel === undefined ? 0
        : getEnchantmentItemPowerBonus(rawPreview.nextLevel)
          - getEnchantmentItemPowerBonus(rawPreview.currentLevel),
      materials: rawPreview.materials.map((material) => ({
        itemId: material.itemId,
        name: getItemDisplayName(material.itemId),
        owned: material.owned,
        required: material.quantity,
        missing: material.missing,
      })),
      canAfford: rawPreview.canAfford,
      failureReason: rawPreview.failureReason,
    };

    return {
      silver: snapshot.wallet.silver,
      incomeRate: snapshot.wallet.incomeRate,
      items,
      availableTiers,
      selectedInstanceId,
      preview,
      stocks: STOCK_ITEM_IDS.map((itemId) => ({
        itemId,
        name: getItemDisplayName(itemId),
        quantity: isProductionMaterial(itemId)
          ? inventoryManager.getTotalQuantity(productionStorageId, itemId)
          : inventoryManager.getAccessibleQuantity(heroId, itemId),
      })),
    };
  }, [
    enchantmentService,
    heroId,
    inventoryManager,
    productionStorageId,
    requestedInstanceId,
    selectedTier,
    snapshot,
  ]);
}
