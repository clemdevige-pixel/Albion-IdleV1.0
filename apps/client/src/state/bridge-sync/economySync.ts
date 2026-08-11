import type { EntityId } from "@game/core";
import type {
  CurrencyService,
  DurabilityStore,
  EquipmentManager,
  InventoryManager,
  ItemInstanceId,
  RepairCostResolver,
  VendorRegistry,
  WalletId,
} from "@game/gameplay";
import { resolveRepairableInfo } from "../../data/itemContentCatalog";
import type { GameBridge, VendorOfferVM } from "../../game/GameBridge";

export function syncWalletToBridge(
  bridge: GameBridge,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
): void {
  const result = currencyService.getBalance(walletId, "currency_silver");
  bridge.updateWallet({ silver: result.ok ? result.value : 0, incomeRate });
}

export function syncVendorToBridge(
  bridge: GameBridge,
  vendorRegistry: VendorRegistry,
  vendorId: string,
): void {
  const vendor = vendorRegistry.get(vendorId);
  if (vendor === undefined) return;

  const offers: VendorOfferVM[] = vendor.offers
    .filter((offer) => offer.enabled)
    .map((offer) => ({
      itemId: offer.itemId,
      buyPrice: offer.buyPrice,
      sellPrice: offer.sellPrice,
      maxPerTransaction: offer.maxPerTransaction,
    }));
  bridge.updateVendor({ vendorId: vendor.vendorId, role: vendor.role, offers });
}

export interface RepairPreviewItem {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentDurability: number;
  readonly maxDurability: number;
  readonly repairCost: number;
}

export function collectRepairPreviewData(
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager,
  durabilityStore: DurabilityStore,
  repairCostResolver: RepairCostResolver,
  heroId: EntityId,
  stationModifier: number = 1,
): RepairPreviewItem[] {
  const items: RepairPreviewItem[] = [];

  const addIfDamaged = (instanceId: ItemInstanceId, itemId: string): void => {
    const durability = durabilityStore.get(instanceId);
    if (durability === undefined || durability.current >= durability.max) return;
    const info = resolveRepairableInfo(itemId);
    if (info === undefined) return;

    const cost = repairCostResolver.resolveCost(
      info.equipmentCategory,
      info.itemTier,
      durability.current,
      durability.max,
      stationModifier,
    );
    items.push({
      instanceId,
      itemId,
      currentDurability: durability.current,
      maxDurability: durability.max,
      repairCost: cost.ok ? cost.value : 0,
    });
  };

  for (const entry of equipmentManager.getEquipped(heroId).values()) {
    addIfDamaged(entry.instanceId, entry.itemId);
  }
  for (const slot of inventoryManager.listSlots(heroId)) {
    if (slot.entry !== undefined) addIfDamaged(slot.entry.instanceId, slot.entry.itemId);
  }
  return items;
}

export function syncRepairToBridge(
  bridge: GameBridge,
  repairItems: readonly RepairPreviewItem[],
): void {
  bridge.updateRepair({
    items: repairItems.map((item) => ({ ...item })),
    totalCost: repairItems.reduce((total, item) => total + item.repairCost, 0),
  });
}
