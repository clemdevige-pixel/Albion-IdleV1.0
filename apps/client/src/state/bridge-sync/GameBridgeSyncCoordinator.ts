import type { EntityId } from "@game/core";
import type {
  CurrencyService,
  DamageManager,
  DurabilityStore,
  EquipmentManager,
  InventoryManager,
  ProgressionOrchestrator,
  RepairCostResolver,
  StatsManager,
  VendorRegistry,
  WalletId,
} from "@game/gameplay";
import type { GameBridge } from "../../game/GameBridge";
import {
  buildMasteryViewModels,
  collectRepairPreviewData,
  syncAllToBridge,
  syncBankToBridge,
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncProgressionToBridge,
  syncRepairToBridge,
  syncStatsToBridge,
  syncVendorToBridge,
  syncWalletToBridge,
} from "../bridgeSync";

interface GameBridgeSyncCoordinatorDependencies {
  readonly bridge: GameBridge;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly statsManager: StatsManager;
  readonly damageManager: DamageManager;
  readonly currencyService: CurrencyService;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly durabilityStore: DurabilityStore;
  readonly repairCostResolver: RepairCostResolver;
  readonly vendorRegistry: VendorRegistry;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly walletId: WalletId;
  readonly vendorId: string;
  readonly getIncomeRate: () => number;
  readonly recalculateWeaponMasteryStats: () => void;
  readonly updateWorldBridge: () => void;
}

/**
 * Owns full gameplay-to-UI projection refreshes.
 *
 * Domain managers remain authoritative; this coordinator only translates their
 * current state into the compatibility bridge used by React and Phaser.
 */
export class GameBridgeSyncCoordinator {
  readonly #dependencies: GameBridgeSyncCoordinatorDependencies;

  constructor(dependencies: GameBridgeSyncCoordinatorDependencies) {
    this.#dependencies = dependencies;
  }

  syncInitialState(): void {
    const dependencies = this.#dependencies;
    const health = dependencies.damageManager.getHealth(dependencies.heroId);
    dependencies.bridge.updatePlayerHealth(
      health.currentHealth,
      health.maxHealth,
    );
    dependencies.updateWorldBridge();

    syncInventoryToBridge(
      dependencies.bridge,
      dependencies.inventoryManager,
      dependencies.heroId,
    );
    syncBankToBridge(
      dependencies.bridge,
      dependencies.inventoryManager,
      dependencies.bankId,
    );
    syncEquipmentToBridge(
      dependencies.bridge,
      dependencies.equipmentManager,
      dependencies.heroId,
    );
    syncStatsToBridge(
      dependencies.bridge,
      dependencies.statsManager,
      dependencies.heroId,
    );
    syncWalletToBridge(
      dependencies.bridge,
      dependencies.currencyService,
      dependencies.walletId,
      0,
    );
    syncVendorToBridge(
      dependencies.bridge,
      dependencies.vendorRegistry,
      dependencies.vendorId,
    );
    this.#syncProgression();
    this.#syncRepair();
  }

  syncAll(): void {
    const dependencies = this.#dependencies;
    dependencies.recalculateWeaponMasteryStats();
    const progression = dependencies.progressionOrchestrator
      .getFullProgressionState();

    syncAllToBridge(
      dependencies.bridge,
      dependencies.inventoryManager,
      dependencies.equipmentManager,
      dependencies.statsManager,
      dependencies.currencyService,
      dependencies.walletId,
      dependencies.getIncomeRate(),
      dependencies.vendorRegistry,
      dependencies.vendorId,
      dependencies.heroId,
      progression.totalFame,
      progression.overflowPool,
      buildMasteryViewModels(progression),
    );
    syncBankToBridge(
      dependencies.bridge,
      dependencies.inventoryManager,
      dependencies.bankId,
    );
    this.#syncRepair();
  }

  #syncProgression(): void {
    const dependencies = this.#dependencies;
    const progression = dependencies.progressionOrchestrator
      .getFullProgressionState();
    syncProgressionToBridge(
      dependencies.bridge,
      progression.totalFame,
      progression.overflowPool,
      buildMasteryViewModels(progression),
    );
  }

  #syncRepair(): void {
    const dependencies = this.#dependencies;
    syncRepairToBridge(
      dependencies.bridge,
      collectRepairPreviewData(
        dependencies.equipmentManager,
        dependencies.inventoryManager,
        dependencies.durabilityStore,
        dependencies.repairCostResolver,
        dependencies.heroId,
        1.0,
      ),
    );
  }
}
