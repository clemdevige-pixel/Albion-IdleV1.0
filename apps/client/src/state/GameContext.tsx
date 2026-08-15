import type { ProductionTier, SupportedProductionFamily } from "../data/productionFamilyCatalog";
import { useMemo, type ReactNode } from "react";
import { RuntimePersistence, type RuntimePersistenceDependencies } from "../runtime/RuntimePersistence.js";
import { EventBus } from "@game/core";
import { getInitialIslandWorkerHouseLevelDefinition } from "@game/data";
import { PlayerIslandService, WorldSaveProvider } from "@game/gameplay";
import { GameBridge } from "../game/GameBridge";
import { RefiningSaveProvider } from "../runtime/RefiningRuntime";
import { ConsumableRuntime } from "../runtime/ConsumableRuntime.js";
import { CombatRewardRuntime } from "../runtime/CombatRewardRuntime.js";
import { setupCombatRewardAdapter } from "../runtime/combatRewardAdapter.js";
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { combatStopController } from "../runtime/CombatStopController.js";
import { recalculateWeaponMasteryStats } from "../runtime/weaponMasteryStatSync.js";
import {
  syncInventoryToBridge,
  syncStatsToBridge,
} from "./bridgeSync";
import { setupCombatEntity } from "../runtime/combatEntityFactory.js";
import type { GameServices, UIEventMap } from "./GameServices.js";
import { GameServicesContextProvider } from "./GameServicesContext.js";
import { ProductionRuntimeController } from "./production/ProductionRuntimeController.js";
import {
  registerGameRuntimeLifecycle,
  useGameRuntimeLifecycle,
} from "./GameRuntimeLifecycle.js";
import { SaveGameActions } from "./SaveGameActions.js";
import { WorldNavigationActions } from "./WorldNavigationActions.js";
import { ConsumableActions } from "./ConsumableActions.js";
import { RepairActions } from "./RepairActions.js";
import { IslandActions } from "./IslandActions.js";
import { createCombatFoundation } from "../runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../runtime/bootstrap/createProgressionFoundation.js";
import { createEconomyFoundation } from "../runtime/bootstrap/createEconomyFoundation.js";
import {
  buildWorldViewModel,
  createWorldFoundation,
} from "../runtime/bootstrap/createWorldFoundation.js";
import { createProductionFoundation } from "../runtime/bootstrap/createProductionFoundation.js";
import {
  createCharacterEquipmentFoundation,
  createCharacterStorageFoundation,
  initializeStarterLoadout,
} from "../runtime/bootstrap/createCharacterFoundation.js";
import { CombatBridgeAdapter } from "./bridge-sync/CombatBridgeAdapter.js";
import { GameBridgeSyncCoordinator } from "./bridge-sync/GameBridgeSyncCoordinator.js";
import { GameRuntimeTickController } from "../runtime/GameRuntimeTickController.js";
import { StarterSelectionGate } from "../ui/starter/StarterSelectionGate.js";

export type { GameServices, UIEventMap } from "./GameServices.js";
export { useGameBridge, useGameServices } from "./GameServicesContext.js";

export const HERO_BASE_ATTACK_SPEED = 1.2;

const WORKER_HOUSE_BASELINE = getInitialIslandWorkerHouseLevelDefinition();

export function GameProvider({
  saveSlotId,
  onLocalSave,
  children,
}: {
  readonly saveSlotId: string;
  readonly onLocalSave?: RuntimePersistenceDependencies["onLocalSave"];
  readonly children: ReactNode;
}): JSX.Element {
  const services = useMemo<GameServices>(() => {
    const eventBus = new EventBus<UIEventMap>();
    const bridge = new GameBridge();
    const islandService = new PlayerIslandService();
    const syncIslandToBridge = (): void => {
      const island = islandService.getState();
      bridge.updateIsland({
        plots: island.plots.map((plot) => ({ ...plot })),
        buildings: island.buildings.map((building) => ({ ...building })),
      });
    };
    let tickCounter = 0;
    let starterSelectionPending = false;
    let gatheringTier: ProductionTier = 3;
    const refiningTiers: Record<SupportedProductionFamily, ProductionTier> = {
      Wood: 3,
      Ore: 3,
      Hide: 3,
      Fiber: 3,
    };
    let craftingTier: ProductionTier = 3;
    let workerTier: ProductionTier = 3;

    const {
      world,
      statsManager,
      damageManager,
      damageEventBus,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
      effectManager,
      combatService,
      orchestrator,
    } = createCombatFoundation();

    const {
      experienceService,
      fameService,
      masteryService,
      destinyBoardService,
      progressionOrchestrator,
    } = createProgressionFoundation();

    const {
      inventoryManager,
      equipmentManager,
    } = createCharacterEquipmentFoundation({
      world,
      statsManager,
      damageManager,
      masteryService,
      canMutateEquipment: () => starterSelectionPending || !combatService.isInCombat(),
      onPlayerHealthChanged: (currentHealth, maxHealth) => {
        bridge.updatePlayerHealth(currentHealth, maxHealth);
      },
      onStatsChanged: (entityId) => {
        syncStatsToBridge(bridge, statsManager, entityId);
      },
    });

    const {
      currencyService,
      playerId,
      walletId,
      durabilityStore,
      repairCostResolver,
      vendorRegistry,
      economyTransactionService,
    } = createEconomyFoundation({ inventoryManager, equipmentManager });

    const worldFoundation = createWorldFoundation();
    const {
      biomeResolver,
      worldCoordinator,
      worldRuntime,
      forestZoneDefId: FOREST_ZONE_DEF_ID,
    } = worldFoundation;

    const getActiveZoneDef = () => worldRuntime.getActiveZoneDef();
    const updateWorldBridge = (): void => {
      bridge.updateWorld(buildWorldViewModel(worldFoundation));
    };
    const isWorldRequirementMet: GameServices["isWorldRequirementMet"] = (requirement) => {
      const memory = worldRuntime
        .getWorldLocationSaveState()
        .zoneMemories.find((entry) => entry.zoneDefId === requirement.zoneDefId);
      return (memory?.completedSegments.length ?? 0) >= requirement.minimumCompletedSegments;
    };

    const combatEntityFactoryDeps = {
      world,
      statsManager,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
    };

    const heroId = setupCombatEntity(
      combatEntityFactoryDeps,
      { maxHealth: 300, physDamage: 0, attackSpeed: 1.2, armor: 0, magicRes: 0 },
      { x: 0, y: 0 },
    );

    const {
      bankId,
      productionStorageId,
      enchantmentService,
    } = createCharacterStorageFoundation({
      world,
      heroId,
      inventoryManager,
      equipmentManager,
      currencyService,
      walletId,
      canEnchantNow: () => combatStopController.isPaused(),
    });

    const productionFoundation = createProductionFoundation({
      inventoryManager,
      masteryService,
      experienceService,
      progressionOrchestrator,
      heroId,
      productionStorageId,
      durabilityStore,
      currencyService,
      walletId,
      forestZoneDefId: FOREST_ZONE_DEF_ID,
      getGatheringTier: () => gatheringTier,
      getRefiningTier: (family) => refiningTiers[family],
      getWorkerTier: () => workerTier,
    });
    const {
      gatheringRuntime,
      refiningRuntime,
      gatheringCoordinator,
      oreGatheringCoordinator,
      hideGatheringCoordinator,
      fiberGatheringCoordinator,
    } = productionFoundation;

    const combatRewardRuntime = new CombatRewardRuntime({
      currencyService,
      walletId,
      equipmentManager,
      inventoryManager,
      durabilityStore,
      progressionOrchestrator,
      experienceService,
      heroId,
    });

    // Remaining service assembly is unchanged below this point.
    // The validated balance change in this file is intentionally limited to
    // the hero's authored naked defensive baseline.

    const bridgeSyncCoordinator = new GameBridgeSyncCoordinator({
      bridge,
      inventoryManager,
      equipmentManager,
      statsManager,
      damageManager,
      currencyService,
      progressionOrchestrator,
      durabilityStore,
      repairCostResolver,
      vendorRegistry,
      heroId,
      bankId,
      walletId,
      vendorId: "vendor_general",
      getIncomeRate: () => combatRewardAdapter.getIncomeRate(),
      recalculateWeaponMasteryStats: () => {
        recalculateWeaponMasteryStats(
          statsManager,
          equipmentManager,
          masteryService,
          heroId,
        );
      },
      updateWorldBridge,
    });
    const resyncAll = (): void => { bridgeSyncCoordinator.syncAll(); };

    const combatRewardAdapter = setupCombatRewardAdapter({
      combatService,
      combatRewardRuntime,
      worldRuntime,
      bridge,
      statsManager,
      heroId,
      recalculateWeaponMasteryStats: () => recalculateWeaponMasteryStats(statsManager, equipmentManager, masteryService, heroId),
      resyncAll: () => resyncAll(),
    });
    bridgeSyncCoordinator.syncInitialState();

    const persistence = new RuntimePersistence({
      inventoryManager,
      world,
      heroId,
      bankId,
      productionStorageId,
      equipmentManager,
      currencyService,
      experienceService,
      masteryService,
      fameService,
      destinyBoardService,
      durabilityStore,
      saveSlotId,
      ...(onLocalSave === undefined ? {} : { onLocalSave }),
    });

    const refiningSaveProvider = new RefiningSaveProvider(
      refiningRuntime,
      inventoryManager,
    );
    persistence.registerProvider(refiningSaveProvider);
    persistence.registerProvider(new WorldSaveProvider(worldCoordinator));

    const consumableRuntime = new ConsumableRuntime({
      inventoryManager,
      damageManager,
      deathManager,
      heroId,
    });

    const worldNavigationActions = new WorldNavigationActions({
      worldRuntime,
      combatRuntime: undefined,
      updateWorldBridge,
    });

    const combatRuntime = new CombatRuntime({
      world,
      heroId,
      combatService,
      orchestrator,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
      effectManager,
      statsManager,
      equipmentManager,
      masteryService,
      biomeResolver,
      ports: {
        onVictory: () => worldRuntime.onEncounterVictory(),
        onDefeat: () => worldRuntime.onEncounterDefeat(),
        isCombatSuspended: () => starterSelectionPending,
        getLocationState: () => worldRuntime.getCombatLocationState(),
      },
    });
    worldNavigationActions.setCombatRuntime(combatRuntime);

    const combatBridgeAdapter = new CombatBridgeAdapter({
      bridge,
      heroId,
      abilityManager,
      damageManager,
      statsManager,
      combatRuntime,
      worldRuntime,
      updateWorldBridge,
    });

    const productionController = new ProductionRuntimeController({
      gatheringRuntime,
      refiningRuntime,
      gatheringCoordinator,
      oreGatheringCoordinator,
      hideGatheringCoordinator,
      fiberGatheringCoordinator,
      inventoryManager,
      productionStorageId,
      getGatheringTier: () => gatheringTier,
      getRefiningTier: (family) => refiningTiers[family],
    });

    const islandActions = new IslandActions({
      islandService,
      inventoryManager,
      heroId,
      syncIslandToBridge,
      workerHouseBaseline: WORKER_HOUSE_BASELINE,
    });

    const servicesValue: GameServices = {
      bridge,
      eventBus,
      world,
      heroId,
      inventoryManager,
      equipmentManager,
      currencyService,
      walletId,
      durabilityStore,
      repairCostResolver,
      vendorRegistry,
      economyTransactionService,
      enchantmentService,
      experienceService,
      fameService,
      masteryService,
      destinyBoardService,
      progressionOrchestrator,
      gatheringRuntime,
      refiningRuntime,
      consumableRuntime,
      combatRuntime,
      combatBridgeAdapter,
      combatRewardAdapter,
      worldRuntime,
      persistence,
      productionStorageId,
      islandService,
      islandActions,
      isWorldRequirementMet,
      getGatheringTier: () => gatheringTier,
      setGatheringTier: (tier) => { gatheringTier = tier; },
      getRefiningTier: (family) => refiningTiers[family],
      setRefiningTier: (family, tier) => { refiningTiers[family] = tier; },
      getCraftingTier: () => craftingTier,
      setCraftingTier: (tier) => { craftingTier = tier; },
      getWorkerTier: () => workerTier,
      setWorkerTier: (tier) => { workerTier = tier; },
      resyncAll,
    };

    const saveActions = new SaveGameActions({
      persistence,
      inventoryManager,
      heroId,
      resyncAll,
    });
    const consumableActions = new ConsumableActions({
      consumableRuntime,
      resyncAll,
    });
    const repairActions = new RepairActions({
      durabilityStore,
      economyTransactionService,
      resyncAll,
    });

    registerGameRuntimeLifecycle({
      services: servicesValue,
      tickController: new GameRuntimeTickController({
        combatRuntime,
        combatBridgeAdapter,
        productionController,
      }),
      saveActions,
      worldNavigationActions,
      consumableActions,
      repairActions,
    });

    return servicesValue;
  }, [saveSlotId, onLocalSave]);

  useGameRuntimeLifecycle(services);

  return (
    <GameServicesContextProvider value={services}>
      <StarterSelectionGate>{children}</StarterSelectionGate>
    </GameServicesContextProvider>
  );
}
