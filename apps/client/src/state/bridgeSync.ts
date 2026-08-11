import type { EntityId } from "@game/core";
import type {
  CurrencyService,
  EquipmentManager,
  InventoryManager,
  StatsManager,
  VendorRegistry,
  WalletId,
} from "@game/gameplay";
import type { GameBridge, MasteryVM } from "../game/GameBridge";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "./bridge-sync/playerInventorySync";
import { syncVendorToBridge, syncWalletToBridge } from "./bridge-sync/economySync";
import { syncProgressionToBridge } from "./bridge-sync/progressionSync";

export * from "./bridge-sync/abilitySync";
export * from "./bridge-sync/economySync";
export * from "./bridge-sync/playerInventorySync";
export * from "./bridge-sync/productionSync";
export * from "./bridge-sync/progressionSync";
export * from "./bridge-sync/workerSync";

/** Compatibility orchestration for callers that still require a full projection refresh. */
export function syncAllToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  statsManager: StatsManager,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
  vendorRegistry: VendorRegistry,
  vendorId: string,
  entityId: EntityId,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  syncInventoryToBridge(bridge, inventoryManager, entityId);
  syncEquipmentToBridge(bridge, equipmentManager, entityId);
  syncStatsToBridge(bridge, statsManager, entityId);
  syncWalletToBridge(bridge, currencyService, walletId, incomeRate);
  syncVendorToBridge(bridge, vendorRegistry, vendorId);
  syncProgressionToBridge(bridge, totalFame, overflowPool, masteries);
}
