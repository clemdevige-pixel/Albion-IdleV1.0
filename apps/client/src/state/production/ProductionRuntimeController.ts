import type { ProductionTier } from "../../data/productionFamilyCatalog";
import type { EntityId } from "@game/core";
import type {
  CurrencyService,
  InventoryManager,
  ProgressionOrchestrator,
  ResourceFamily,
  WalletId,
  WorkerId,
} from "@game/gameplay";
import type { GameBridge, WorkerProfessionVM } from "../../game/GameBridge";
import type { ProductionFoundation } from "../../runtime/bootstrap/createProductionFoundation";
import type { CombatLoopState } from "../../runtime/CombatRuntime";
import {
  buildMasteryViewModels,
  getWorkerResourceLabel,
  syncInventoryToBridge,
  syncProgressionToBridge,
  syncWalletToBridge,
  syncWorkersToBridge,
  WORKER_PROFESSION_LABELS,
} from "../bridgeSync";
import { ProductionActions } from "./ProductionActions";
import { ProductionBridgeAdapter } from "./ProductionBridgeAdapter";

type ProductionFamily = "Wood" | "Ore" | "Hide" | "Fiber";

interface ProductionRuntimeControllerDependencies {
  readonly bridge: GameBridge;
  readonly foundation: ProductionFoundation;
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  readonly productionStorageId: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly getCurrentTick: () => number;
  readonly getCombatLoopState: () => CombatLoopState;
  readonly getGatheringTier: () => ProductionTier;
  readonly setGatheringTier: (tier: ProductionTier) => void;
  readonly getRefiningTier: (family: ProductionFamily) => ProductionTier;
  readonly setRefiningTier: (family: ProductionFamily, tier: ProductionTier) => void;
  readonly getCraftingTier: () => ProductionTier;
  readonly setCraftingTier: (tier: ProductionTier) => void;
  readonly setWorkerTier: (tier: ProductionTier) => void;
  readonly prepareCombatResumeAfterGathering: () => void;
}

/** Owns Production-to-UI synchronization and runtime event bindings. */
export class ProductionRuntimeController {
  readonly #dependencies: ProductionRuntimeControllerDependencies;
  readonly #bridgeAdapter: ProductionBridgeAdapter;
  readonly #actions: ProductionActions;
  readonly #unsubscribes: Array<() => void> = [];

  constructor(dependencies: ProductionRuntimeControllerDependencies) {
    this.#dependencies = dependencies;
    const foundation = dependencies.foundation;
    this.#bridgeAdapter = new ProductionBridgeAdapter({
      bridge: dependencies.bridge,
      inventoryManager: dependencies.inventoryManager,
      heroId: dependencies.heroId,
      productionStorageId: dependencies.productionStorageId,
      gatheringRuntime: foundation.gatheringRuntime,
      refiningRuntime: foundation.refiningRuntime,
      gatheringCoordinators: {
        Wood: foundation.gatheringCoordinator,
        Ore: foundation.oreGatheringCoordinator,
        Hide: foundation.hideGatheringCoordinator,
        Fiber: foundation.fiberGatheringCoordinator,
      },
      refiningManagers: {
        Wood: foundation.refiningManager,
        Ore: foundation.metalRefiningManager,
        Hide: foundation.leatherRefiningManager,
        Fiber: foundation.clothRefiningManager,
      },
      getCurrentTick: dependencies.getCurrentTick,
      getGatheringTier: dependencies.getGatheringTier,
      getRefiningTier: dependencies.getRefiningTier,
      getCraftingTier: dependencies.getCraftingTier,
    });
    this.#actions = new ProductionActions({
      bridge: dependencies.bridge,
      heroId: dependencies.heroId,
      inventoryManager: dependencies.inventoryManager,
      gatheringRuntime: foundation.gatheringRuntime,
      refiningRuntime: foundation.refiningRuntime,
      craftingRuntime: foundation.craftingRuntime,
      productionBridge: this.#bridgeAdapter,
      getCurrentTick: dependencies.getCurrentTick,
      getCombatLoopState: dependencies.getCombatLoopState,
      prepareCombatResumeAfterGathering: dependencies.prepareCombatResumeAfterGathering,
    });

    this.#bindEvents();
    this.syncAll();
  }

  syncAll(): void {
    for (const family of this.#families()) {
      this.#bridgeAdapter.syncGathering(family);
      this.#bridgeAdapter.syncRefining(family);
    }
    this.#bridgeAdapter.syncCrafting();
    this.syncWorkers();
  }

  syncActiveProduction(): void {
    const foundation = this.#dependencies.foundation;
    if (foundation.workerRuntime.hasActiveWorkerSession()) this.syncWorkers();
    if (foundation.gatheringCoordinator.getActiveSession() !== undefined) this.#bridgeAdapter.syncGathering("Wood");
    if (foundation.oreGatheringCoordinator.getActiveSession() !== undefined) this.#bridgeAdapter.syncGathering("Ore");
    if (foundation.hideGatheringCoordinator.getActiveSession() !== undefined) this.#bridgeAdapter.syncGathering("Hide");
    if (foundation.fiberGatheringCoordinator.getActiveSession() !== undefined) this.#bridgeAdapter.syncGathering("Fiber");
    if (foundation.refiningManager.getActiveSession() !== undefined) this.#bridgeAdapter.syncRefining("Wood");
    if (foundation.metalRefiningManager.getActiveSession() !== undefined) this.#bridgeAdapter.syncRefining("Ore");
    if (foundation.leatherRefiningManager.getActiveSession() !== undefined) this.#bridgeAdapter.syncRefining("Hide");
    if (foundation.clothRefiningManager.getActiveSession() !== undefined) this.#bridgeAdapter.syncRefining("Fiber");
  }

  tick(tick: number): void {
    const foundation = this.#dependencies.foundation;
    foundation.gatheringRuntime.tick(tick);
    foundation.refiningRuntime.tick(tick);
    foundation.workerRuntime.tick(tick);
    this.#actions.pollQueuedGathering();
  }

  toggleGathering(family: ProductionFamily): boolean { return this.#actions.toggleGathering(family); }
  returnToCombat(): boolean { return this.#actions.returnToCombat(); }

  performGatheringStrike(family: string, quality: "miss" | "correct" | "perfect"): boolean {
    return this.#actions.performGatheringStrike(family, quality);
  }

  toggleRefining(family: ProductionFamily): boolean { return this.#actions.toggleRefining(family); }
  craftEquipment(outputItemId: string): boolean { return this.#actions.craftEquipment(outputItemId); }

  setGatheringTier(tier: ProductionTier): boolean {
    const previousTier = this.#dependencies.getGatheringTier();
    if (tier === previousTier) {
      this.#bridgeAdapter.syncAllGathering();
      return true;
    }

    const foundation = this.#dependencies.foundation;
    const activeFamily = this.#families().find((family) => {
      switch (family) {
        case "Wood": return foundation.gatheringCoordinator.getActiveSession() !== undefined;
        case "Ore": return foundation.oreGatheringCoordinator.getActiveSession() !== undefined;
        case "Hide": return foundation.hideGatheringCoordinator.getActiveSession() !== undefined;
        case "Fiber": return foundation.fiberGatheringCoordinator.getActiveSession() !== undefined;
      }
    });

    if (activeFamily === undefined) {
      this.#dependencies.setGatheringTier(tier);
      this.#bridgeAdapter.syncAllGathering();
      return true;
    }

    foundation.gatheringRuntime.stopAllGathering();
    this.#dependencies.setGatheringTier(tier);

    const switched = foundation.gatheringRuntime.toggleGatheringFamily(
      activeFamily,
      this.#dependencies.getCurrentTick(),
    );

    if (switched.action !== "started") {
      this.#dependencies.setGatheringTier(previousTier);
      foundation.gatheringRuntime.toggleGatheringFamily(
        activeFamily,
        this.#dependencies.getCurrentTick(),
      );
      this.#bridgeAdapter.syncAllGathering();
      return false;
    }

    this.#bridgeAdapter.syncAllGathering();
    return true;
  }

  setRefiningTier(family: ProductionFamily, tier: ProductionTier): boolean {
    this.#dependencies.setRefiningTier(family, tier);
    this.#bridgeAdapter.syncRefining(family);
    return true;
  }

  setCraftingTier(tier: ProductionTier): boolean {
    this.#dependencies.setCraftingTier(tier);
    this.#bridgeAdapter.syncCrafting();
    return true;
  }

  recruitWorker(profession: WorkerProfessionVM): boolean {
    return this.#dependencies.foundation.workerRuntime.recruitWorker(profession).ok;
  }

  toggleWorker(workerId: WorkerId, tier: ProductionTier): boolean {
    const result = this.#dependencies.foundation.workerRuntime.toggleWorker(workerId, tier);
    this.syncWorkers();
    return result.ok;
  }

  syncWorkers(): void {
    const runtime = this.#dependencies.foundation.workerRuntime;
    const professionCapacity = runtime.getProfessionCapacity("woodcutter");
    syncWorkersToBridge(
      this.#dependencies.bridge,
      runtime.getAllWorkers(),
      (profession) => runtime.isSupportedWorkerProfession(profession),
      (workerId) => runtime.getWorkerSession(workerId),
      (workerId) => runtime.getAssignedTier(workerId),
      (xp, tier) => runtime.getWorkerMasteryDetails(xp, tier),
      runtime.getCapacity(),
      professionCapacity,
      runtime.getRecruitmentCost(),
    );
  }

  createWorkerSaveProvider() {
    return {
      providerId: "workers",
      save: () => this.#dependencies.foundation.workerRuntime.getSaveState(),
      load: (data: unknown): void => {
        this.#dependencies.foundation.workerRuntime.restoreSaveState(data);
        this.syncWorkers();
      },
    };
  }

  dispose(): void {
    for (const unsubscribe of this.#unsubscribes.splice(0)) unsubscribe();
  }

  #bindEvents(): void {
    const { foundation, bridge } = this.#dependencies;
    this.#unsubscribes.push(foundation.gatheringRuntime.subscribeGatherCompleted((event) => {
      syncInventoryToBridge(bridge, this.#dependencies.inventoryManager, this.#dependencies.heroId);
      this.#syncFamily(event.family);
      this.#bridgeAdapter.syncCrafting();
      this.#syncMasteryProgression();
      bridge.addEconomyNotification({
        id: `notif_gather_${String(Date.now())}`,
        type: event.added ? "success" : "error",
        message: event.added
          ? `+${String(event.quantityAdded)} ${event.itemLabel}`
          : "Inventaire plein : récolte non stockée",
        timestamp: Date.now(),
      });
    }));

    this.#unsubscribes.push(foundation.refiningRuntime.subscribeRefineCompleted((event) => {
      syncInventoryToBridge(bridge, this.#dependencies.inventoryManager, this.#dependencies.heroId);
      this.#syncFamily(event.family);
      this.#bridgeAdapter.syncCrafting();
    }));

    this.#unsubscribes.push(foundation.workerRuntime.subscribeCycleCompleted(() => {
      this.#syncMasteryProgression();
      syncInventoryToBridge(bridge, this.#dependencies.inventoryManager, this.#dependencies.heroId);
      this.syncAll();
    }));

    this.#unsubscribes.push(foundation.workerRuntime.subscribeDomainEvent((event) => {
      if (event.type === "recruit_success") {
        syncWalletToBridge(
          bridge,
          this.#dependencies.currencyService,
          this.#dependencies.walletId,
          bridge.wallet.incomeRate,
        );
        this.syncWorkers();
        bridge.addEconomyNotification({
          id: `notif_worker_recruit_${String(Date.now())}`,
          type: "success",
          message: `${event.displayName}, ${WORKER_PROFESSION_LABELS[event.profession]}, a rejoint l’île`,
          timestamp: Date.now(),
        });
      } else if (event.type === "recruit_insufficient_funds") {
        bridge.addEconomyNotification({
          id: `notif_worker_cost_${String(Date.now())}`,
          type: "error",
          message: "Argent insuffisant pour recruter ce worker",
          timestamp: Date.now(),
        });
      } else if (event.type === "storage_full") {
        bridge.addEconomyNotification({
          id: `notif_worker_storage_${String(event.workerId)}_${String(Date.now())}`,
          type: "error",
          message: `Stockage plein : production de ${getWorkerResourceLabel(event.profession, event.assignedTier)} non stockée`,
          timestamp: Date.now(),
        });
      }
    }));
  }

  #syncFamily(family: ResourceFamily): void {
    if (!this.#isSupportedFamily(family)) return;
    this.#bridgeAdapter.syncGathering(family);
    this.#bridgeAdapter.syncRefining(family);
  }

  #isSupportedFamily(family: ResourceFamily): family is ProductionFamily {
    return this.#families().includes(family as ProductionFamily);
  }

  #syncMasteryProgression(): void {
    const state = this.#dependencies.progressionOrchestrator.getFullProgressionState();
    syncProgressionToBridge(
      this.#dependencies.bridge,
      state.totalFame,
      state.overflowPool,
      buildMasteryViewModels(state),
    );
  }

  #families(): readonly ProductionFamily[] {
    return ["Wood", "Ore", "Hide", "Fiber"];
  }
}
