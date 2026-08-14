import type { EntityId } from "@game/core";
import type { CurrencyService, InventoryManager, WalletId } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { combatStopController } from "../runtime/CombatStopController";
import { migrateLegacyProductionMaterials } from "../runtime/ProductionStorage";

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

    // A save is a new combat lifecycle boundary. Never inherit a pending stop
    // or paused state from the runtime that existed before the load.
    combatStopController.reset();
    this.deps.persistence.load();
    this.applyLoadedState();

    this.deps.bridge.addEconomyNotification({
      id: `notif_load_${String(Date.now())}`,
      type: "success",
      message: this.deps.persistence.getLastLoadSource() === "backup"
        ? "Backup save restored"
        : "Game loaded",
      timestamp: Date.now(),
    });
    return true;
  }

  exportSave(): string {
    this.deps.persistence.save(this.deps.getCurrentTick());
    return this.deps.persistence.exportSave();
  }

  importSave(raw: string): boolean {
    try {
      combatStopController.reset();
      this.deps.persistence.importSave(raw);
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

  private applyLoadedState(): void {
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
