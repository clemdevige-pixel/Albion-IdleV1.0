import type { EntityId } from "@game/core";
import type { CurrencyService, InventoryManager, WalletId } from "@game/gameplay";
import { SerializationFailedError } from "@game/persistence";
import type { GameBridge } from "../game/GameBridge";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { combatStopController } from "../runtime/CombatStopController";
import { migrateLegacyProductionMaterials } from "../runtime/ProductionStorage";
import { worldTravelTransition } from "../runtime/WorldTravelTransition";

const REMOVED_ENCHANTMENT_RESOURCE_IDS = [
  "item_resource_enchantment_essence",
  "item_resource_arcane_crystal",
  "item_resource_enchantment_catalyst",
] as const;

interface SaveGameActionsDependencies {
  readonly bridge: GameBridge;
  readonly persistence: RuntimePersistence;
  readonly inventoryManager: InventoryManager;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
  readonly getCurrentTick: () => number;
  readonly prepareRuntimeForLoad: () => void;
  readonly resetSilverBalance: (balance: number) => void;
  readonly syncPlayerHealth: () => void;
  readonly resyncAll: () => void;
}

/** Save/load application actions and compatibility migrations. */
export class SaveGameActions {
  private readonly deps: SaveGameActionsDependencies;

  constructor(deps: SaveGameActionsDependencies) {
    this.deps = deps;
  }

  save(): void {
    if (this.deps.persistence.isLoadFailed()) {
      console.error("[Persistence] Save blocked because the current runtime failed to load its save");
      this.deps.bridge.addEconomyNotification({
        id: `notif_save_blocked_${String(Date.now())}`,
        type: "error",
        message: "Save blocked after a failed or degraded load. Reload or restore a valid backup first.",
        timestamp: Date.now(),
      });
      return;
    }

    this.deps.persistence.save(this.deps.getCurrentTick());
    this.deps.bridge.addEconomyNotification({
      id: `notif_save_${String(Date.now())}`,
      type: "success",
      message: "Game saved",
      timestamp: Date.now(),
    });
  }

  load(): boolean {
    if (!this.deps.persistence.hasSave()) return false;

    this.prepareLoadBoundary();

    let writeFailedAfterLoad = false;
    try {
      this.deps.persistence.load();
    } catch (error) {
      if (!(error instanceof SerializationFailedError)) throw error;

      // RuntimePersistence only writes after a primary/backup snapshot has
      // already been loaded. Keep that runtime state, but mark persistence as
      // degraded so autosave cannot repeatedly risk the last recovery point.
      writeFailedAfterLoad = true;
      console.error(
        "[Persistence] Save loaded but post-load persistence failed:",
        error,
      );
    }

    const loadSource = this.deps.persistence.getLastLoadSource();
    const backupCouldNotBeRestored = loadSource === "backup_unrestored";
    const persistenceDegraded = writeFailedAfterLoad || backupCouldNotBeRestored;
    this.deps.persistence.setLoadFailed(persistenceDegraded);
    this.applyLoadedState();

    this.deps.bridge.addEconomyNotification({
      id: `notif_load_${String(Date.now())}`,
      type: persistenceDegraded ? "error" : "success",
      message: writeFailedAfterLoad
        ? "Game loaded, but local persistence is full or unavailable. Auto-save is disabled until reload."
        : backupCouldNotBeRestored
          ? "Backup loaded, but the primary local save could not be restored. Auto-save is disabled until reload."
          : loadSource === "backup"
            ? "Backup save restored"
            : "Game loaded",
      timestamp: Date.now(),
    });
    return true;
  }

  exportSave(): string {
    if (!this.deps.persistence.isLoadFailed()) {
      this.deps.persistence.save(this.deps.getCurrentTick());
    }
    return this.deps.persistence.exportSave();
  }

  importSave(raw: string): boolean {
    try {
      this.prepareLoadBoundary();
      this.deps.persistence.importSave(raw);
      this.deps.persistence.setLoadFailed(false);
      this.applyLoadedState();
      this.deps.bridge.addEconomyNotification({
        id: `notif_import_${String(Date.now())}`,
        type: "success",
        message: "Save imported",
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error("[Persistence] Save import failed:", error);
      this.deps.bridge.addEconomyNotification({
        id: `notif_import_error_${String(Date.now())}`,
        type: "error",
        message: "Save import failed. Previous save preserved.",
        timestamp: Date.now(),
      });
      return false;
    }
  }

  private prepareLoadBoundary(): void {
    this.deps.prepareRuntimeForLoad();
    combatStopController.reset();
    worldTravelTransition.reset();
  }

  private applyLoadedState(): void {
    this.removeLegacyEnchantmentResources();
    migrateLegacyProductionMaterials(
      this.deps.inventoryManager,
      this.deps.heroId,
      this.deps.productionStorageId,
    );
    this.migrateRemovedEnergyConsumables();

    const balance = this.deps.currencyService.getBalance(
      this.deps.walletId,
      "currency_silver",
    );
    this.deps.resetSilverBalance(balance.ok ? balance.value : 0);
    this.deps.syncPlayerHealth();
    this.deps.resyncAll();
  }

  hasSave(): boolean {
    return this.deps.persistence.hasSave();
  }

  private removeLegacyEnchantmentResources(): void {
    for (const inventoryId of [
      this.deps.heroId,
      this.deps.bankId,
      this.deps.productionStorageId,
    ]) {
      for (const itemId of REMOVED_ENCHANTMENT_RESOURCE_IDS) {
        const quantity = this.deps.inventoryManager.getTotalQuantity(inventoryId, itemId);
        if (quantity > 0) {
          this.deps.inventoryManager.removeQuantity(inventoryId, itemId, quantity);
        }
      }
    }
  }

  private migrateRemovedEnergyConsumables(): void {
    for (const inventoryId of [this.deps.heroId, this.deps.bankId]) {
      const legacyQuantity = this.deps.inventoryManager.getTotalQuantity(
        inventoryId,
        "item_energy_potion",
      );
      if (legacyQuantity <= 0) continue;

      const removed = this.deps.inventoryManager.removeQuantity(
        inventoryId,
        "item_energy_potion",
        legacyQuantity,
      );
      if (removed.ok) {
        this.deps.inventoryManager.addQuantity(
          inventoryId,
          "item_health_potion",
          legacyQuantity,
        );
      }
    }
  }
}
