import type { ProductionTier } from "../data/productionFamilyCatalog";
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
    let gatheringTier: ProductionTier = 3;
    let refiningTier: ProductionTier = 3;
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
      canMutateEquipment: () => !combatService.isInCombat(),
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
      { maxHealth: 500, physDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
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
      getRefiningTier: () => refiningTier,
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

    initializeStarterLoadout({
      heroId,
      inventoryManager,
      equipmentManager,
      durabilityStore,
      masteryService,
    });

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
    const resyncAll = (): void => {
      bridgeSyncCoordinator.syncAll();
      syncIslandToBridge();
    };

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
    syncIslandToBridge();

    const islandActions = new IslandActions({
      islandService,
      inventoryManager,
      productionStorageId,
      currencyService,
      walletId,
      bridge,
      resyncAll,
    });

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
    persistence.registerProvider(islandService);

    const refiningSaveProvider = new RefiningSaveProvider(
      refiningRuntime,
      inventoryManager,
      () => productionStorageId,
    );
    persistence.registerProvider(refiningSaveProvider);

    const saveGameActions = new SaveGameActions({
      bridge,
      persistence,
      inventoryManager,
      currencyService,
      walletId,
      heroId,
      bankId,
      productionStorageId,
      getCurrentTick: () => tickCounter,
      resetSilverBalance: (balance) => { combatRewardAdapter.resetSilverBalance(balance); },
      syncPlayerHealth: () => {
        const health = damageManager.getHealth(heroId);
        bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
      },
      resyncAll,
    });

    const saveGame = (): void => { saveGameActions.save(); };
    const loadGame = (): boolean => saveGameActions.load();
    const hasSave = (): boolean => saveGameActions.hasSave();
    const exportSave = (): string => saveGameActions.exportSave();
    const importSave = (raw: string): boolean => saveGameActions.importSave(raw);

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
        onVictory: () => {
          const res = worldRuntime.advanceVictory();
          updateWorldBridge();
          return res;
        },
        onDefeat: () => {
          worldRuntime.advanceDefeat();
          updateWorldBridge();
          bridge.setCombatState("defeat");
        },
        getLocationState: () => {
          const zone = getActiveZoneDef();
          return {
            zoneIndex: worldRuntime.currentZoneIndex,
            segmentIndex: worldRuntime.currentSegment,
            encounterIndex: worldRuntime.currentEncounter,
            zoneDefId: zone.defId,
            zoneName: zone.name,
            highestUnlockedSegment: worldRuntime.highestUnlockedSegment,
            farmMode: worldRuntime.farmMode,
          };
        },
        isCombatSuspended: () => gatheringRuntime.isHeroGathering(),
      },
    });

    const worldNavigationActions = new WorldNavigationActions({
      worldRuntime,
      combatRuntime,
      bridge,
      updateWorldBridge,
    });

    const productionController = new ProductionRuntimeController({
      bridge,
      foundation: productionFoundation,
      inventoryManager,
      heroId,
      productionStorageId,
      currencyService,
      walletId,
      progressionOrchestrator,
      getCurrentTick: () => tickCounter,
      getGatheringTier: () => gatheringTier,
      setGatheringTier: (tier) => { gatheringTier = tier; },
      getRefiningTier: () => refiningTier,
      setRefiningTier: (tier) => { refiningTier = tier; },
      getCraftingTier: () => craftingTier,
      setCraftingTier: (tier) => { craftingTier = tier; },
      setWorkerTier: (tier) => { workerTier = tier; },
      prepareCombatResumeAfterGathering: () => {
        worldNavigationActions.prepareCombatResumeAfterGathering();
      },
      workerCapacity: WORKER_HOUSE_BASELINE.workerCapacity,
      workerRecruitmentCost: WORKER_HOUSE_BASELINE.recruitmentCost,
    });
    persistence.registerProvider(productionController.createWorkerSaveProvider());

    const worldSaveProvider = new WorldSaveProvider(
      worldCoordinator,
      () => worldNavigationActions.getWorldLocationSaveState(),
      (savedLocation) => {
        worldNavigationActions.setWorldLocationSaveState(savedLocation);
      },
    );
    persistence.registerProvider(worldSaveProvider);

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
    const unsubscribeDamageEvents = combatBridgeAdapter.bindDamageEvents(
      damageEventBus,
    );

    const initialCombat = combatRuntime.initialize();
    combatBridgeAdapter.presentInitialCombat(initialCombat);

    const useWeaponAbility = (slotIndex: number): boolean =>
      combatBridgeAdapter.useWeaponAbility(slotIndex);
    const usePrimaryAbility = (): boolean => useWeaponAbility(0);
    const setPrimaryAbilityAutoCast = (enabled: boolean): void => {
      combatBridgeAdapter.setPrimaryAbilityAutoCast(enabled);
    };

    const consumableRuntime = new ConsumableRuntime({
      inventoryManager,
      damageManager,
      deathManager,
      heroId,
    });

    const TICK_INTERVAL = 500;
    const DT = 0.5;
    const syncConsumables = (): void => {
      bridge.updateConsumables(consumableRuntime.getState());
    };
    syncConsumables();

    const consumableActions = new ConsumableActions({
      runtime: consumableRuntime,
      bridge,
      syncConsumables,
      syncInventory: () => {
        syncInventoryToBridge(bridge, inventoryManager, heroId);
      },
    });

    const runtimeTickController = new GameRuntimeTickController({
      tickIntervalMs: TICK_INTERVAL,
      deltaSeconds: DT,
      advanceTick: () => {
        tickCounter += 1;
        return tickCounter;
      },
      tickConsumables: (deltaSeconds) => consumableRuntime.tick(deltaSeconds),
      syncConsumables,
      tickProduction: (tick) => { productionController.tick(tick); },
      syncActiveProduction: () => {
        productionController.syncActiveProduction();
      },
      isHeroGathering: () => gatheringRuntime.isHeroGathering(),
      presentGatheringState: () => { bridge.setCombatState("idle"); },
      syncProjectedSegmentRates: () => {
        combatBridgeAdapter.syncProjectedSegmentRates();
      },
      updateZoneElapsed: (seconds) => { bridge.updateZoneElapsed(seconds); },
      tickCombat: (deltaSeconds, tick) => {
        combatBridgeAdapter.presentTick(combatRuntime.tick(deltaSeconds, tick));
      },
    });

    registerGameRuntimeLifecycle(bridge, {
      tick: () => { runtimeTickController.tick(); },
      tickIntervalMs: TICK_INTERVAL,
      persistence,
      dispose: () => {
        unsubscribeDamageEvents();
        combatRewardAdapter.dispose();
        productionController.dispose();
        orchestrator.dispose();
        progressionOrchestrator.dispose();
        worldCoordinator.dispose();
        gatheringCoordinator.dispose();
        oreGatheringCoordinator.dispose();
        hideGatheringCoordinator.dispose();
        fiberGatheringCoordinator.dispose();
      },
    });

    const repairActions = new RepairActions({
      economyTransactionService,
      bridge,
      playerId,
      heroId,
      walletId,
      resyncAll,
    });

    return {
      eventBus, bridge, orchestrator, heroId, bankId, productionStorageId, inventoryManager, equipmentManager,
      enchantmentService,
      statsManager, currencyService, economyTransactionService, vendorRegistry,
      walletId, playerId, worldCoordinator,
      useConsumable: (itemId) => consumableActions.use(itemId),
      useWeaponAbility,
      usePrimaryAbility,
      setPrimaryAbilityAutoCast,
      resumeExploration: () => worldNavigationActions.resumeExploration(),
      selectSegment: (segmentNumber) => worldNavigationActions.selectSegment(segmentNumber),
      setSegmentFarmMode: (enabled) => worldNavigationActions.setSegmentFarmMode(enabled),
      selectZone: (zoneNumber, segmentNumber) => (
        worldNavigationActions.selectZone(zoneNumber, segmentNumber)
      ),
      returnToCombat: () => productionController.returnToCombat(),
      toggleGathering: (family) => productionController.toggleGathering(family),
      performGatheringStrike: (resourceFamily, quality) => (
        productionController.performGatheringStrike(resourceFamily, quality)
      ),
      toggleRefining: (family) => productionController.toggleRefining(family),
      refineAllAvailable: () => productionController.refineAllAvailable(),
      setGatheringTier: (tier) => productionController.setGatheringTier(tier),
      setRefiningTier: (tier) => productionController.setRefiningTier(tier),
      setCraftingTier: (tier) => productionController.setCraftingTier(tier),
      craftEquipment: (outputItemId) => productionController.craftEquipment(outputItemId),
      recruitWorker: (profession) => productionController.recruitWorker(profession),
      toggleWorker: (profession, tier) => productionController.toggleWorker(profession, tier),
      constructIslandBuilding: (definitionId, plotId) => (
        islandActions.constructBuilding(definitionId, plotId)
      ),
      repairAll: () => repairActions.repairAll(),
      saveGame, loadGame, hasSave, exportSave, importSave,
    };
  }, [saveSlotId, onLocalSave]);

  useGameRuntimeLifecycle(services);

  return (
    <GameServicesContextProvider services={services}>
      {children}
    </GameServicesContextProvider>
  );
}
