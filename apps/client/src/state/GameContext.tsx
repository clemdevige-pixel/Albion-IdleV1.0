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
import { CombatActivityRuntimeRouter } from "../runtime/CombatActivityRuntimeRouter.js";
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
import { RESEARCH_UNLOCK_IDS } from "../data/researchContentCatalog.js";
import { ADVANCED_WORKER_ORGANIZATION } from "../data/workerContentCatalog.js";
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
import { TowerNavigationActions } from "./TowerNavigationActions.js";
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
import { createFactionResearchFoundation } from "../runtime/bootstrap/createFactionResearchFoundation.js";
import { createFactionMasteryFoundation } from "../runtime/bootstrap/createFactionMasteryFoundation.js";
import { createFactionCapeFoundation } from "../runtime/bootstrap/createFactionCapeFoundation.js";
import { createFactionAchievementFoundation } from "../runtime/bootstrap/createFactionAchievementFoundation.js";
import { createFactionBestiaryFoundation } from "../runtime/bootstrap/createFactionBestiaryFoundation.js";
import { createAcademyRuntimeFoundation } from "../runtime/bootstrap/createAcademyRuntimeFoundation.js";
import { createAcademyPresentationFoundation } from "../runtime/bootstrap/createAcademyPresentationFoundation.js";
import { createBankExpansionFoundation } from "../runtime/bootstrap/createBankExpansionFoundation.js";
import { createResearchFoundation } from "../runtime/bootstrap/createResearchFoundation.js";
import { createExpeditionFoundation } from "../runtime/bootstrap/createExpeditionFoundation.js";
import { createExpeditionRecapFoundation } from "../runtime/bootstrap/createExpeditionRecapFoundation.js";
import { createResearchRecapFoundation } from "../runtime/bootstrap/createResearchRecapFoundation.js";
import { createFactionProgressionCoordinator } from "../runtime/bootstrap/createFactionProgressionCoordinator.js";
import { createDungeonResearchAccessFoundation } from "../runtime/bootstrap/createDungeonResearchAccessFoundation.js";
import { createTowerFoundation } from "../runtime/bootstrap/createTowerFoundation.js";
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
    const academyRuntimeFoundation = createAcademyRuntimeFoundation({ islandService });
    const dungeonRuntime = new DungeonRuntime(DUNGEON_DEFINITIONS);
    const towerFoundation = createTowerFoundation(saveSlotId);
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
    const factionMasteryFoundation = createFactionMasteryFoundation({
      masteryService,
      experienceService,
    });

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
          && !towerFoundation.combatRouter.isTowerActive()
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
    const factionResearchFoundation = createFactionResearchFoundation();

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
    const combatActivityRouter = new CombatActivityRuntimeRouter(
      dungeonCombatRouter,
      towerFoundation.combatRouter,
    );

    const heroId = setupCombatEntity(
      combatEntityFactoryDeps,
      { maxHealth: 300, physDamage: 0, attackSpeed: 1.2, armor: 0, magicRes: 0 },
      { x: 0, y: 0 },
    );
    factionResearchFoundation.bindRelicInventory({
      hasItem: (definition) => (
        inventoryManager.findEntriesByItemId(heroId, definition.inventoryItemId).length > 0
      ),
      grantItem: (definition) => inventoryManager.addEntry(heroId, definition.inventoryItemId).ok,
    });
    const factionCapeFoundation = createFactionCapeFoundation({
      damageManager,
      equipmentManager,
      heroId,
      getActiveFactionCombatContext: () => combatActivityRouter.getFactionCombatContext(),
    });

    const {
      bankId,
      bankTabCapacity,
      productionStorageId,
      enchantmentService,
    } = createCharacterStorageFoundation({
      world,
      heroId,
      inventoryManager,
      equipmentManager,
      currencyService,
      walletId,
      canEnchantNow: () => combatStopController.isPaused() && !combatActivityRouter.isActivityActive(),
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

    const researchFoundation = createResearchFoundation({
      relicService: factionResearchFoundation.relicService,
      currencyService,
      walletId,
      inventoryManager,
      productionStorageId,
      getAcademyTier: academyRuntimeFoundation.getResearchTier,
      isWorldProgressionComplete: worldFoundation.isWorldProgressionComplete,
    });
    const { researchService } = researchFoundation;
    const isTowerSystemUnlocked = (): boolean => (
      researchService.hasUnlock(RESEARCH_UNLOCK_IDS.towerSystem)
    );
    const bankExpansionFoundation = createBankExpansionFoundation({
      inventoryManager,
      bankId,
      bankTabCapacity,
      currencyService,
      walletId,
      isResearchUnlocked: () => researchService.hasUnlock(RESEARCH_UNLOCK_IDS.advancedBankManagement),
    });
    bankExpansionFoundation.reconcileResearchUnlock();
    const hasAdvancedWorkerOrganization = (): boolean => (
      researchService.hasUnlock(RESEARCH_UNLOCK_IDS.advancedWorkerOrganization)
    );
    const isInstantRefiningUnlocked = (): boolean => (
      researchService.hasUnlock(RESEARCH_UNLOCK_IDS.instantRefining)
    );
    const dungeonResearchAccessFoundation = createDungeonResearchAccessFoundation({
      dungeonRuntime,
      researchService,
    });
    const { expeditionService, rewardLedger } = createExpeditionFoundation({
      researchService,
      currencyService,
      walletId,
      inventoryManager,
      heroId,
      getFactionYieldBonusPercent: factionMasteryFoundation.getYieldBonusPercent,
    });
    const factionAchievementFoundation = createFactionAchievementFoundation({
      factionKnowledgeService: factionResearchFoundation.factionKnowledgeService,
      relicService: factionResearchFoundation.relicService,
      expeditionService,
      expeditionRewardLedger: rewardLedger,
      dungeonRuntime,
      masteryService,
    });
    const factionBestiaryFoundation = createFactionBestiaryFoundation({
      factionKnowledgeService: factionResearchFoundation.factionKnowledgeService,
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
      getWorkerCapacity: () => (
        hasAdvancedWorkerOrganization()
          ? ADVANCED_WORKER_ORGANIZATION.workerCapacity
          : WORKER_HOUSE_BASELINE.workerCapacity
      ),
      getWorkerProfessionCapacity: () => (
        hasAdvancedWorkerOrganization()
          ? ADVANCED_WORKER_ORGANIZATION.professionCapacity
          : 1
      ),
      getWorkerRecruitmentCost: () => (
        hasAdvancedWorkerOrganization()
          ? ADVANCED_WORKER_ORGANIZATION.recruitmentCost
          : WORKER_HOUSE_BASELINE.recruitmentCost
      ),
      isInstantRefiningUnlocked,
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
      onRawFactionFame: factionMasteryFoundation.awardRawFactionFame,
      isDungeonKeyLootUnlocked: dungeonResearchAccessFoundation.isDungeonSystemUnlocked,
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
    let syncProduction = (): void => {};
    const resyncAll = (): void => {
      bridgeSyncCoordinator.syncAll();
      syncIslandToBridge();
      syncProduction();
    };
    const academyPresentationFoundation = createAcademyPresentationFoundation({
      researchService,
      expeditionService,
      onMutation: resyncAll,
    });
    const researchRecapFoundation = createResearchRecapFoundation();
    const expeditionRecapFoundation = createExpeditionRecapFoundation();
    const factionProgressionCoordinator = createFactionProgressionCoordinator({
      factionResearchFoundation,
      researchService,
      expeditionService,
      reconcileResearchEffects: researchFoundation.reconcileResearchEffects,
      onResearchCompletion: (researchId) => {
        bankExpansionFoundation.reconcileResearchUnlock();
        researchRecapFoundation.present(researchId);
        resyncAll();
      },
      onExpeditionCompletion: (completed) => {
        expeditionRecapFoundation.present(completed);
        resyncAll();
      },
    });

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
      isTowerActive: () => towerFoundation.combatRouter.isTowerActive(),
      onMonsterKilled: factionProgressionCoordinator.recordMonsterKill,
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
    persistence.registerProvider(factionResearchFoundation.factionKnowledgeService);
    persistence.registerProvider(factionResearchFoundation.relicService);
    persistence.registerProvider(researchService);
    persistence.registerProvider(expeditionService);
    persistence.registerProvider(rewardLedger);
    persistence.registerProvider(new DungeonProgressionSaveProvider(dungeonRuntime));
    persistence.registerProvider(towerFoundation.saveProvider);

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
    const reconcileLoadedBankExpansion = (): void => {
      const changed = bankExpansionFoundation.reconcileResearchUnlock();
      if (changed) resyncAll();
    };
    const loadGame = (): boolean => {
      const loaded = saveGameActions.load();
      if (loaded) {
        factionProgressionCoordinator.reconcile();
        reconcileLoadedBankExpansion();
      }
      return loaded;
    };
    const hasSave = (): boolean => saveGameActions.hasSave();
    const exportSave = (): string => saveGameActions.exportSave();
    const importSave = (raw: string): boolean => {
      const imported = saveGameActions.importSave(raw);
      if (imported) {
        factionProgressionCoordinator.reconcile();
        reconcileLoadedBankExpansion();
      }
      return imported;
    };
    const purchaseNextBankTab: GameServices["purchaseNextBankTab"] = () => {
      const result = bankExpansionFoundation.purchaseNextTab();
      if (result.ok) {
        resyncAll();
        saveGame();
        bridge.addEconomyNotification({
          id: `notif_bank_extension_${String(result.tabNumber)}_${String(Date.now())}`,
          type: "success",
          message: `Banque ${String(result.tabNumber)} débloquée`,
          timestamp: Date.now(),
        });
      } else if (result.reason === "insufficient_silver") {
        bridge.addEconomyNotification({
          id: `notif_bank_extension_failed_${String(Date.now())}`,
          type: "error",
          message: "Silver insuffisant pour cette extension de banque.",
          timestamp: Date.now(),
        });
      }
      return result;
    };

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
      spawnEnemyOverride: () => combatActivityRouter.spawnEnemyOverride(combatEntityFactoryDeps),
      ports: {
        onVictory: () => combatActivityRouter.onVictory(() => {
          const res = worldRuntime.advanceVictory();
          factionProgressionCoordinator.onWorldProgress();
          updateWorldBridge();
          return res;
        }),
        onDefeat: () => combatActivityRouter.onDefeat(() => {
          worldRuntime.advanceDefeat();
          updateWorldBridge();
          bridge.setCombatState("defeat");
        }),
        getLocationState: () => {
          const zone = getActiveZoneDef();
          return {
            zoneIndex: worldRuntime.currentZoneIndex,
            segmentIndex: worldRuntime.currentSegment,
            encounterIndex: combatActivityRouter.getEncounterIndex(worldRuntime.currentEncounter),
            zoneDefId: zone.defId,
            zoneName: zone.name,
            highestUnlockedSegment: worldRuntime.highestUnlockedSegment,
            farmMode: worldRuntime.farmMode,
          };
        },
        isCombatSuspended: () => starterSelectionPending || gatheringRuntime.isHeroGathering(),
        flowPolicy: combatActivityRouter.flowPolicy,
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
      canStartDungeon: () => !towerFoundation.combatRouter.isTowerActive(),
      canAccessDungeonContent: dungeonResearchAccessFoundation.canAccessDefinition,
      onStateChanged: resyncAll,
    });

    const towerNavigationActions = new TowerNavigationActions({
      progression: towerFoundation.progressionService,
      towerRouter: towerFoundation.combatRouter,
      activityRouter: combatActivityRouter,
      equipmentManager,
      heroId,
      combatRuntime,
      stopController: combatStopController,
      bridge,
      isCombatSuspended: () => starterSelectionPending || gatheringRuntime.isHeroGathering(),
      isTowerUnlocked: isTowerSystemUnlocked,
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
    });
    syncProduction = () => { productionController.syncAll(); };
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
      tickParallelProgression: factionProgressionCoordinator.advance,
      isHeroGathering: () => gatheringRuntime.isHeroGathering(),
      presentGatheringState: () => { bridge.setCombatState("idle"); },
      syncProjectedSegmentRates: () => {
        combatBridgeAdapter.syncProjectedSegmentRates();
      },
      updateZoneElapsed: (seconds) => { bridge.updateZoneElapsed(seconds); },
      tickCombat: (deltaSeconds, tick) => {
        combatBridgeAdapter.presentTick(combatRuntime.tick(deltaSeconds, tick));
        dungeonNavigationActions.flushPendingStart();
        towerNavigationActions.flushPendingStart();
      },
    });
    registerGameRuntimeLifecycle(bridge, {
      tick: () => { runtimeTickController.tick(); },
      tickIntervalMs: TICK_INTERVAL,
      persistence,
      syncPresentation: resyncAll,
      dispose: () => {
        unsubscribeDamageEvents();
        factionCapeFoundation.dispose();
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
      getAcademyModel: academyPresentationFoundation.getModel,
      startAcademyResearch: academyPresentationFoundation.startResearch,
      startAcademyExpedition: academyPresentationFoundation.startExpedition,
      getBankExpansionModel: bankExpansionFoundation.getModel,
      purchaseNextBankTab,
      subscribeResearchRecap: researchRecapFoundation.subscribe,
      getResearchRecap: researchRecapFoundation.getSnapshot,
      dismissResearchRecap: researchRecapFoundation.dismiss,
      subscribeExpeditionRecap: expeditionRecapFoundation.subscribe,
      getExpeditionRecap: expeditionRecapFoundation.getSnapshot,
      dismissExpeditionRecap: expeditionRecapFoundation.dismiss,
      getFactionAchievements: factionAchievementFoundation.getAllProgress,
      getBestiaryKnowledge: factionBestiaryFoundation.getKnowledge,
      getRelicProgress: (relicId) => factionResearchFoundation.relicService.getProgress(relicId),
      isDungeonSystemUnlocked: dungeonResearchAccessFoundation.isDungeonSystemUnlocked,
      isTowerSystemUnlocked,
      selectTowerCheckpoint: (floor) => towerNavigationActions.selectCheckpoint(floor),
      startTower: () => towerNavigationActions.requestStart(),
      abandonTower: () => towerNavigationActions.abandon(),
      isTowerActive: () => towerFoundation.combatRouter.isTowerActive(),
      getTowerState: () => towerNavigationActions.getState(),
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
      isInstantRefiningUnlocked,
      setGatheringTier: (tier) => productionController.setGatheringTier(tier),
      setRefiningTier: (family, tier) => productionController.setRefiningTier(family, tier),
      setCraftingTier: (tier) => productionController.setCraftingTier(tier),
      craftEquipment: (outputItemId) => productionController.craftEquipment(outputItemId),
      recruitWorker: (profession) => productionController.recruitWorker(profession),
      toggleWorker: (profession, tier) => productionController.toggleWorker(profession, tier),
      constructIslandBuilding: (definitionId, plotId) => (
        islandActions.constructBuilding(definitionId, plotId)
      ),
      moveIslandBuilding: (buildingInstanceId, targetPlotId) => (
        islandActions.moveBuilding(buildingInstanceId, targetPlotId)
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
