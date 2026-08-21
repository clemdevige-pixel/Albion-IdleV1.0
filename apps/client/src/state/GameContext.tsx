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
        || (!combatService.isInCombat() && dungeonRuntime.activeRun?.status !== "active")
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
      experienceService,
      awakenedWeaponService,
      heroId,
    });
    const dungeonRewardRuntime = new DungeonRewardRuntime(
      dungeonRuntime,
      inventoryManager,
      heroId,
    );

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
        recalculateWeaponProgressionStats(
          statsManager,
          equipmentManager,
          masteryService,
          heroId,
          awakenedWeaponService,
        );
        damageManager.syncMaxHealth(heroId);
        const health = damageManager.getHealth(heroId);
        bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
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
      dungeonRewardRuntime,
      worldRuntime,
      bridge,
      statsManager,
      heroId,
      recalculateWeaponMasteryStats: () => recalculateWeaponProgressionStats(
        statsManager,
        equipmentManager,
        masteryService,
        heroId,
        awakenedWeaponService,
      ),
      resyncAll: () => resyncAll(),
      isDungeonActive: () => dungeonCombatRouter.isDungeonActive(),
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
      isWorldRequirementMet,
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
      awakenedWeaponService,
      experienceService,
      masteryService,
      fameService,
      destinyBoardService,
      durabilityStore,
      saveSlotId,
      ...(onLocalSave === undefined ? {} : { onLocalSave }),
    });
    persistence.registerProvider(islandService);
    persistence.registerProvider(new DungeonProgressionSaveProvider(dungeonRuntime));

    const refiningSaveProvider = new RefiningSaveProvider(
      refiningRuntime,
      inventoryManager,
      () => productionStorageId,
    );
    persistence.registerProvider(refiningSaveProvider);
    starterSelectionPending = !persistence.hasSave();

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

    const notifyAwakeningFailure = (reason: string): void => {
      const message = reason === "insufficient_attunement"
        ? "Attunement insuffisant pour cette modification."
        : reason === "insufficient_silver"
          ? "Silver insuffisant pour cette modification."
          : reason === "trait_slot_locked"
            ? "Ce slot de trait n'est pas encore débloqué."
            : reason === "trait_offer_pending"
              ? "Choisissez d'abord une proposition de trait en attente."
              : "Impossible de modifier cette arme éveillée dans l'état actuel.";
      bridge.addEconomyNotification({
        id: `notif_awakening_failed_${String(Date.now())}`,
        type: "error",
        message,
        timestamp: Date.now(),
      });
    };
    const getEquippedAwakenedInstanceId = () => {
      const weapon = equipmentManager.getEquippedItem(heroId, "weapon");
      return weapon?.enchantment === 4 ? weapon.instanceId : undefined;
    };
    const afterAwakeningMutation = (): void => {
      resyncAll();
      saveGame();
    };
    const improveAwakenedTrait: GameServices["improveAwakenedTrait"] = (traitIndex) => {
      const instanceId = getEquippedAwakenedInstanceId();
      if (instanceId === undefined) return false;
      const result = awakenedWeaponService.improveTrait(
        instanceId,
        traitIndex,
        walletId,
        () => world.services.rng.nextFloat(),
      );
      if (!result.ok) {
        notifyAwakeningFailure(result.reason);
        return false;
      }
      afterAwakeningMutation();
      return true;
    };
    const beginAwakenedTraitOffer: GameServices["beginAwakenedTraitOffer"] = (targetIndex) => {
      const instanceId = getEquippedAwakenedInstanceId();
      if (instanceId === undefined) return false;
      const result = awakenedWeaponService.beginTraitOffer(
        instanceId,
        targetIndex,
        walletId,
        () => world.services.rng.nextFloat(),
      );
      if (!result.ok) {
        notifyAwakeningFailure(result.reason);
        return false;
      }
      afterAwakeningMutation();
      return true;
    };
    const resolveAwakenedTraitOffer: GameServices["resolveAwakenedTraitOffer"] = (traitId) => {
      const instanceId = getEquippedAwakenedInstanceId();
      if (instanceId === undefined) return false;
      const result = awakenedWeaponService.resolveTraitOffer(instanceId, traitId);
      if (!result.ok) {
        notifyAwakeningFailure(result.reason);
        return false;
      }
      afterAwakeningMutation();
      return true;
    };
    const resetAwakenedWeapon: GameServices["resetAwakenedWeapon"] = () => {
      const instanceId = getEquippedAwakenedInstanceId();
      if (instanceId === undefined) return false;
      const result = awakenedWeaponService.reset(instanceId);
      if (!result.ok) {
        notifyAwakeningFailure(result.reason);
        return false;
      }
      afterAwakeningMutation();
      return true;
    };

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
      spawnEnemyOverride: () => dungeonCombatRouter.spawnEnemyOverride(combatEntityFactoryDeps),
      ports: {
        onVictory: () => dungeonCombatRouter.onVictory(() => {
          const res = worldRuntime.advanceVictory();
          updateWorldBridge();
          return res;
        }),
        onDefeat: () => dungeonCombatRouter.onDefeat(() => {
          worldRuntime.advanceDefeat();
          updateWorldBridge();
          bridge.setCombatState("defeat");
        }),
        getLocationState: () => {
          const zone = getActiveZoneDef();
          return {
            zoneIndex: worldRuntime.currentZoneIndex,
            segmentIndex: worldRuntime.currentSegment,
            encounterIndex: dungeonCombatRouter.getEncounterIndex(worldRuntime.currentEncounter),
            zoneDefId: zone.defId,
            zoneName: zone.name,
            highestUnlockedSegment: worldRuntime.highestUnlockedSegment,
            farmMode: worldRuntime.farmMode,
          };
        },
        isCombatSuspended: () => starterSelectionPending || gatheringRuntime.isHeroGathering(),
        flowPolicy: dungeonCombatRouter.flowPolicy,
      },
    });

    const worldNavigationActions = new WorldNavigationActions({
      worldRuntime,
      combatRuntime,
      bridge,
      updateWorldBridge,
    });

    const dungeonNavigationActions = new DungeonNavigationActions({
      dungeonRuntime,
      inventoryManager,
      equipmentManager,
      heroId,
      combatRuntime,
      stopController: combatStopController,
      bridge,
      isCombatSuspended: () => starterSelectionPending || gatheringRuntime.isHeroGathering(),
      onStateChanged: resyncAll,
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
      getCombatLoopState: () => combatRuntime.getLoopState(),
      getGatheringTier: () => gatheringTier,
      setGatheringTier: (tier) => { gatheringTier = tier; },
      getRefiningTier: (family) => refiningTiers[family],
      setRefiningTier: (family, tier) => { refiningTiers[family] = tier; },
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

    const selectStarterWeapon = (itemId: string): boolean => {
      if (!starterSelectionPending) return false;
      const initialized = initializeStarterLoadout({
        heroId,
        inventoryManager,
        equipmentManager,
        durabilityStore,
        masteryService,
        weaponItemId: itemId,
      });
      if (!initialized) return false;

      starterSelectionPending = false;
      recalculateWeaponProgressionStats(
        statsManager,
        equipmentManager,
        masteryService,
        heroId,
        awakenedWeaponService,
      );
      resyncAll();
      saveGame();
      return true;
    };

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
        dungeonNavigationActions.flushPendingStart();
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
      enchantmentService, awakenedWeaponService,
      statsManager, currencyService, economyTransactionService, vendorRegistry,
      walletId, playerId, worldCoordinator,
      improveAwakenedTrait,
      beginAwakenedTraitOffer,
      resolveAwakenedTraitOffer,
      resetAwakenedWeapon,
      needsStarterSelection: () => starterSelectionPending,
      selectStarterWeapon,
      isWorldRequirementMet,
      startDungeon: (definitionId) => dungeonNavigationActions.requestStart(definitionId),
      abandonDungeon: () => dungeonNavigationActions.abandon(),
      isDungeonActive: () => dungeonCombatRouter.isDungeonActive(),
      getDungeonState: () => dungeonNavigationActions.getState(),
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
      setGatheringTier: (tier) => productionController.setGatheringTier(tier),
      setRefiningTier: (family, tier) => productionController.setRefiningTier(family, tier),
      setCraftingTier: (tier) => productionController.setCraftingTier(tier),
      craftEquipment: (outputItemId) => productionController.craftEquipment(outputItemId),
      recruitWorker: (profession) => productionController.recruitWorker(profession),
      toggleWorker: (profession, tier) => productionController.toggleWorker(profession, tier),
      constructIslandBuilding: (definitionId, plotId) => (
        islandActions.constructBuilding(definitionId, plotId)
      ),
      upgradeIslandBuilding: (definitionId) => islandActions.upgradeBuilding(definitionId),
      getIslandLevel: () => islandService.getState().level,
      upgradeIslandLevel: () => islandActions.upgradeIslandLevel(),
      repairAll: () => repairActions.repairAll(),
      saveGame, loadGame, hasSave, exportSave, importSave,
    };
  }, [saveSlotId, onLocalSave]);

  useGameRuntimeLifecycle(services);

  return (
    <GameServicesContextProvider services={services}>
      <StarterSelectionGate>{children}</StarterSelectionGate>
    </GameServicesContextProvider>
  );
}
