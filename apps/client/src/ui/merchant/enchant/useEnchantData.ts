import { useMemo } from "react";
import {
  getEnchantmentItemPowerBonus,
  type ItemInstanceId,
} from "@game/gameplay";
import { getItemDisplayName } from "../../../panels/ItemVisual";
import { useGameServices } from "../../../state/GameContext";
import { getOwnedItemTotals } from "../merchantModels";
import { useMerchantData } from "../useMerchantData";
import type { EnchantModel, EnchantableItemModel } from "./enchantModels";

const STOCK_ITEM_IDS = [
  "item_resource_enchantment_essence",
  "item_resource_arcane_crystal",
  "item_resource_enchantment_catalyst",
] as const;

export function useEnchantData(requestedInstanceId: string | null): EnchantModel {
  const snapshot = useMerchantData();
  const { enchantmentService } = useGameServices();

  return useMemo(() => {
    const inventoryItems: readonly EnchantableItemModel[] = snapshot.inventory.slots.flatMap((slot) => {
      if (slot.itemId === undefined || slot.instanceId === undefined) return [];
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      return preview === undefined || preview.failureReason === "item_not_enchantable" ? [] : [{
        itemId: slot.itemId,
        instanceId: slot.instanceId,
        enchantment: slot.enchantment,
        equipped: false,
      }];
    });
    const equippedItems: readonly EnchantableItemModel[] = snapshot.equipment.slots.flatMap((slot) => {
      if (slot.itemId === undefined || slot.instanceId === undefined) return [];
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      return preview === undefined || preview.failureReason === "item_not_enchantable" ? [] : [{
        itemId: slot.itemId,
        instanceId: slot.instanceId,
        enchantment: slot.enchantment,
        equipped: true,
      }];
    });
    const items = [...equippedItems, ...inventoryItems];
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
    const owned = getOwnedItemTotals(snapshot.inventory);

    return {
      silver: snapshot.wallet.silver,
      incomeRate: snapshot.wallet.incomeRate,
      items,
      selectedInstanceId,
      preview,
      stocks: STOCK_ITEM_IDS.map((itemId) => ({
        itemId,
        name: getItemDisplayName(itemId),
        quantity: owned.get(itemId) ?? 0,
      })),
    };
  }, [enchantmentService, requestedInstanceId, snapshot]);
}
