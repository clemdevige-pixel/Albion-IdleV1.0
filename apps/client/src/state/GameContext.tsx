import type { ProductionTier, SupportedProductionFamily } from "../data/productionFamilyCatalog";
import { useMemo, type ReactNode } from "react";
import { RuntimePersistence, type RuntimePersistenceDependencies } from "../runtime/RuntimePersistence.js";
import { EventBus } from "@game/core";
import { getInitialIslandWorkerHouseLevelDefinition } from "@game/data";
import { DungeonRuntime, PlayerIslandService, WorldSaveProvider, type AwakenedWeaponTier } from "@game/gameplay";
import { GameBridge } from "../game/GameBridge";
import { RefiningSaveProvider } from "../runtime/RefiningRuntime";
import { ConsumableRuntime } from "../runtime/ConsumableRuntime.js";
import { CombatRewardRuntime } from "../runtime/CombatRewardRuntime.js";
import { DungeonRewardRuntime } from "../runtime/DungeonRewardRuntime.js";
import { DungeonProgressionSaveProvider } from "../runtime/DungeonProgressionSaveProvider.js";
import { setupCombatRewardAdapter } from "../runtime/combatRewardAdapter.js";
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { combatStopController } from "../runtime/CombatStopController.js";
import { recalculateWeaponProgressionStats } from "../runtime/weaponMasteryStatSync.js";
import { DungeonCombatEncounterSource } from "../runtime/DungeonCombatEncounterSource.js";
import { DungeonCombatRuntimeRouter } from "../runtime/DungeonCombatRuntimeRouter.js";
import {
  DUNGEON_DEFINITIONS,
  resolveKeeperT4DungeonCombatProfile,
} from "../data/dungeonContentCatalog.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog.js";
import { getItemTier } from "../data/itemPower.js";
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
import { DungeonNavigationActions } from "./DungeonNavigationActions.js";
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

function isAwakenedWeaponTier(value: number | undefined): value is AwakenedWeaponTier {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}

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
    const dungeonRuntime = new DungeonRuntime(DUNGEON_DEFINITIONS);
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
    const awakenedWeaponServiceRef: {
      current: ReturnType<typeof createEconomyFoundation>["awakenedWeaponService"] | undefined;
    } = { current: undefined };

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
      getAwakenedWeaponService: () => awakenedWeaponServiceRef.current,
      canMutateEquipment: () => (
        starterSelectionPending
        || (
          dungeonRuntime.activeRun?.status !== "active"
          && (combatStopController.isPaused() || !combatService.isInCombat())
        )
      ),
      onPlayerHealthChanged: (currentHealth, maxHealth) => {
        bridge.updatePlayerHealth(currentHealth, maxHealth);
      },
      onStatsChanged: (entityId) => {
        syncStatsToBridge(bridge, statsManager, entityId);
      },
    });

    const {
      currencyService,
      awakenedWeaponService,
      playerId,
      walletId,
      durabilityStore,
      repairCostResolver,
      vendorRegistry,
      economyTransactionService,
    } = createEconomyFoundation({ inventoryManager, equipmentManager });
    awakenedWeaponServiceRef.current = awakenedWeaponService;

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

    const dungeonEncounterSource = new DungeonCombatEncounterSource(
      dungeonRuntime,
      resolveKeeperT4DungeonCombatProfile,
    );
    const dungeonCombatRouter = new DungeonCombatRuntimeRouter(
      dungeonRuntime,
      dungeonEncounterSource,
    );

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
      canEnchantNow: () => combatStopController.isPaused() && !dungeonCombatRouter.isDungeonActive(),
      onEnchantmentCommitted: (result) => {
        if (result.toLevel !== 4) return;
        const definition = resolveEquipmentInfo(result.itemId);
        const tier = getItemTier(result.itemId);
        if (definition?.slot !== "weapon" || !isAwakenedWeaponTier(tier)) return;
        if (!awakenedWeaponService.has(result.instanceId)) {
          awakenedWeaponService.registerFresh(result.instanceId, tier);
        }
      },
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
      masteryService,
      eventBus,
    });

    const dungeonRewardRuntime = new DungeonRewardRuntime({
      dungeonRuntime,
      inventoryManager,
      heroId,
      bridge,
    });

    const {
      biomeResolver: dungeonBiomeResolver,
    } = createWorldFoundation();

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
      spawnEnemyOverride: () => dungeonCombatRouter.spawnEnemyOverride(),
      ports: {
        onVictory: () => {
          const dungeonResult = dungeonCombatRouter.onVictory();
          if (dungeonResult !== undefined) return dungeonResult;
          return worldRuntime.onVictory();
        },
        onDefeat: () => {
          if (dungeonCombatRouter.onDefeat()) return;
          worldRuntime.onDefeat();
        },
        getLocationState: () => {
          const dungeonLocation = dungeonCombatRouter.getLocationState();
          if (dungeonLocation !== undefined) return dungeonLocation;
          const activeZone = getActiveZoneDef();
          return {
            zoneIndex: worldRuntime.currentZoneIndex,
            segmentIndex: worldRuntime.currentSegment,
            encounterIndex: worldRuntime.currentEncounter,
            zoneDefId: activeZone.id,
            zoneName: activeZone.name,
            highestUnlockedSegment: worldRuntime.highestUnlockedSegment,
            farmMode: worldRuntime.farmMode,
          };
        },
        isCombatSuspended: () => productionFoundation.isCombatSuspended(),
      },
    });

    const combatBridgeAdapter = new CombatBridgeAdapter(bridge, combatRuntime);
    const bridgeSyncCoordinator = new GameBridgeSyncCoordinator({
      bridge,
      worldRuntime,
      inventoryManager,
      equipmentManager,
      statsManager,
      currencyService,
      walletId,
      heroId,
      bankId,
      productionStorageId,
      durabilityStore,
      masteryService,
      destinyBoardService,
      awakenedWeaponService,
      combatStopController,
      dungeonRuntime,
      islandService,
      craftingTier: () => craftingTier,
      gatheringTier: () => gatheringTier,
      workerTier: () => workerTier,
      refiningTier: (family) => refiningTiers[family],
    });

    const worldNavigationActions = new WorldNavigationActions({
      worldRuntime,
      combatRuntime,
      bridge,
      updateWorldBridge,
    });
    const dungeonNavigationActions = new DungeonNavigationActions({
      dungeonRuntime,
      combatRuntime,
      worldRuntime,
      bridge,
      updateWorldBridge,
    });

    const consumableRuntime = new ConsumableRuntime({
      inventoryManager,
      heroId,
      damageManager,
      deathManager,
      bridge,
    });

    const consumableActions = new ConsumableActions({
      consumableRuntime,
      combatRuntime,
    });
    const repairActions = new RepairActions({
      equipmentManager,
      inventoryManager,
      durabilityStore,
      repairCostResolver,
      economyTransactionService,
      walletId,
      heroId,
      bridge,
      combatRuntime,
    });

    const islandActions = new IslandActions({
      islandService,
      bridge,
      syncIslandToBridge,
    });

    const runtimePersistence = new RuntimePersistence({
      saveSlotId,
      world,
      worldRuntime,
      inventoryManager,
      equipmentManager,
      statsManager,
      currencyService,
      walletId,
      bankId,
      productionStorageId,
      durabilityStore,
      masteryService,
      destinyBoardService,
      awakenedWeaponService,
      refiningRuntime,
      dungeonProgressionSaveProvider: new DungeonProgressionSaveProvider(dungeonRuntime),
      worldSaveProvider: new WorldSaveProvider(),
      refiningSaveProvider: new RefiningSaveProvider(refiningRuntime),
      islandService,
      bridge,
      combatRuntime,
      combatStopController,
    });

    const saveGameActions = new SaveGameActions({
      runtimePersistence,
      bridge,
    });

    const productionRuntimeController = new ProductionRuntimeController({
      productionFoundation,
      worldNavigationActions,
      bridge,
    });

    const gameRuntimeTickController = new GameRuntimeTickController({
      combatRuntime,
      combatBridgeAdapter,
      bridgeSyncCoordinator,
      productionRuntimeController,
      combatRewardRuntime,
      dungeonRewardRuntime,
    });

    const teardownCombatRewards = setupCombatRewardAdapter({
      combatService,
      combatRewardRuntime,
      eventBus,
    });

    const unregisterRuntimeLifecycle = registerGameRuntimeLifecycle({
      runtimePersistence,
      gameRuntimeTickController,
      teardownCombatRewards,
    });

    const starterLoadoutInitialized = initializeStarterLoadout({
      heroId,
      inventoryManager,
      equipmentManager,
      durabilityStore,
      masteryService,
    });
    starterSelectionPending = !starterLoadoutInitialized;

    const servicesValue: GameServices = {
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
      inventoryManager,
      equipmentManager,
      masteryService,
      destinyBoardService,
      progressionOrchestrator,
      experienceService,
      fameService,
      currencyService,
      awakenedWeaponService,
      playerId,
      walletId,
      durabilityStore,
      repairCostResolver,
      vendorRegistry,
      economyTransactionService,
      islandService,
      dungeonRuntime,
      worldRuntime,
      gatheringRuntime,
      refiningRuntime,
      gatheringCoordinator,
      oreGatheringCoordinator,
      hideGatheringCoordinator,
      fiberGatheringCoordinator,
      combatRuntime,
      combatRewardRuntime,
      dungeonRewardRuntime,
      productionStorageId,
      bankId,
      heroId,
      bridge,
      eventBus,
      worldNavigationActions,
      dungeonNavigationActions,
      consumableActions,
      repairActions,
      islandActions,
      runtimePersistence,
      saveGameActions,
      productionRuntimeController,
      gameRuntimeTickController,
      isWorldRequirementMet,
      getCraftingTier: () => craftingTier,
      setCraftingTier: (tier) => { craftingTier = tier; },
      getGatheringTier: () => gatheringTier,
      setGatheringTier: (tier) => { gatheringTier = tier; },
      getWorkerTier: () => workerTier,
      setWorkerTier: (tier) => { workerTier = tier; },
      getRefiningTier: (family) => refiningTiers[family],
      setRefiningTier: (family, tier) => { refiningTiers[family] = tier; },
      recalculateWeaponProgressionStats: () => {
        recalculateWeaponProgressionStats(
          statsManager,
          equipmentManager,
          masteryService,
          heroId,
          awakenedWeaponService,
        );
      },
      syncInventoryToBridge: () => {
        syncInventoryToBridge(bridge, inventoryManager, heroId);
      },
    };

    return servicesValue;
  }, [saveSlotId, onLocalSave]);

  useGameRuntimeLifecycle(services);

  return (
    <GameServicesContextProvider value={services}>
      <StarterSelectionGate>{children}</StarterSelectionGate>
    </GameServicesContextProvider>
  );
}
