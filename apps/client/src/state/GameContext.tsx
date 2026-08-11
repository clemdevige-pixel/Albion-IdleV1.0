import { useMemo, type ReactNode } from "react";
import { RuntimePersistence } from "../runtime/RuntimePersistence.js";
import { WorldRuntime } from "../runtime/WorldRuntime.js";
import { EventBus, World, createRuntimeServices } from "@game/core";
import {
  CombatService,
  CombatOrchestrator,
  DamageManager,
  HealthComponent,
  DeathManager,
  TargetManager,
  AutoAttackManager,
  EffectManager,
  AbilityManager,
  createDefaultStatRegistry,
  StatsManager,
  TargetValidator,
  InventoryManager,
  EquipmentManager,
  EquipmentStatSync,
  EnchantmentService,
  CurrencyRegistry,
  CurrencyService,
  VendorRegistry,
  VendorService,
  EconomyEventEmitter,
  TransactionRegistry,
  EconomyTransactionService,
  asEconomyTransactionId,
  asWalletId,
  asPlayerId,
  ExperienceService,
  FameService,
  MasteryService,
  DestinyBoardService,
  ProgressionOrchestrator,
  DurabilityStore,
  RepairStationRegistry,
  RepairCostResolver,
  RepairService,
  ZoneManager,
  BiomeRegistry,
  BiomeResolver,
  WorldProgressionManager,
  ExplorationManager,
  WorldCoordinator,
  ResourceRegistry,
  ResourceRuntime,
  ResourceNodeRegistry,
  ResourceNodeManager,
  GatheringManager,
  GatheringToolRegistry,
  GatheringCoordinator,
  RefiningManager,
  WorldSaveProvider,
} from "@game/gameplay";
import type { EntityId } from "@game/core";
import type { StatId, DamageEventMap, ZoneDefinitionId, WorldIntegrationEventMap, ItemInstanceId, WorldLocationSaveState } from "@game/gameplay";
import { WorkerRuntime } from "../runtime/WorkerRuntime.js";

import { SEGMENTS_PER_ZONE, ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { GameBridge, type WorldVM, type WorkerProfessionVM } from "../game/GameBridge";
import { GatheringRuntime } from "../runtime/GatheringRuntime";
import { RefiningRuntime, RefiningSaveProvider } from "../runtime/RefiningRuntime";
import { CraftingRuntime } from "../runtime/CraftingRuntime";
import { ConsumableRuntime } from "../runtime/ConsumableRuntime.js";
import { CombatRewardRuntime } from "../runtime/CombatRewardRuntime.js";
import { setupCombatRewardAdapter } from "../runtime/combatRewardAdapter.js";
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { calculateProjectedSegmentRates } from "../runtime/projectedRateCalculator.js";
import { recalculateWeaponMasteryStats } from "../runtime/weaponMasteryStatSync.js";
import { resolveEnvironmentPresentation } from "../data/environmentPresentation";
import {
  syncInventoryToBridge,
  syncBankToBridge,
  syncEquipmentToBridge,
  syncStatsToBridge,
  syncWalletToBridge,
  syncVendorToBridge,
  syncProgressionToBridge,
  syncRepairToBridge,
  syncWorkersToBridge,
  syncAbilitiesToBridge,
  WORKER_PROFESSION_LABELS,
  getWorkerResourceLabel,
  syncAllToBridge,
  buildMasteryViewModels,
  collectRepairPreviewData,
} from "./bridgeSync";
import {
  EQUIPMENT_CRAFT_RECIPES,
} from "../data/refiningRecipes";
import {
  getItemPower,
} from "../data/itemPower";
import {
  WEAPON_VENDOR_OFFERS,
  resolveWeaponMastery,
} from "../data/weaponContentCatalog";
import {
  GENERAL_VENDOR_FIXED_OFFERS,
  REPAIR_COST_DEFINITIONS,
} from "../data/economyContentCatalog";
import {
  resolveEquipmentInfo,
  resolveEnchantmentItemInfo,
  resolveItemStackInfo,
  resolveRepairableInfo,
} from "../data/itemContentCatalog";
import {
  WOOD_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  FIBER_GATHERING_MASTERY_ID,
  MASTERY_DEFINITIONS,
  DESTINY_NODES,
  getRequiredGatheringMasteryForTier,
} from "../data/progressionContentCatalog";
import {
  BIOME_BY_ZONE,
  BIOME_DEFINITIONS,
  WORLD_ZONE_IDS,
  WORLD_ZONE_ORDER,
  ZONE_DEFINITIONS,
  ZONE_UNLOCK_DEFINITIONS,
} from "../data/worldContentCatalog";
import { setupResourceContentCatalog } from "../data/resourceContentCatalog";
import { setupCombatEntity } from "../runtime/combatEntityFactory.js";
import { isProductionMaterial } from "../runtime/ProductionStorage.js";
import type { GameServices, UIEventMap } from "./GameServices.js";
import { GameServicesContextProvider } from "./GameServicesContext.js";
import { ProductionBridgeAdapter } from "./production/ProductionBridgeAdapter.js";
import { ProductionActions } from "./production/ProductionActions.js";
import {
  registerGameRuntimeLifecycle,
  useGameRuntimeLifecycle,
} from "./GameRuntimeLifecycle.js";
import { SaveGameActions } from "./SaveGameActions.js";

export type { GameServices, UIEventMap } from "./GameServices.js";
export { useGameBridge, useGameServices } from "./GameServicesContext.js";

// -- Stat ids ---------------------------------------------------------------

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
export const HERO_BASE_ATTACK_SPEED = 1.2;

// -- Constants -------------------------------------------------------------

const WORKER_RECRUITMENT_COST = 250;
const WORKER_CAPACITY = 4;

export function GameProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const services = useMemo<GameServices>(() => {
    const eventBus = new EventBus<UIEventMap>();
    const bridge = new GameBridge();

    // --- Build the ECS world --------------------------------------------------
    const runtimeServices = createRuntimeServices();
    const world = new World(runtimeServices);

    // --- Stat registry --------------------------------------------------------
    const statRegistry = createDefaultStatRegistry();
    const statsManager = new StatsManager(world, statRegistry);

    // --- Managers --------------------------------------------------------------
    const damageManager = new DamageManager(world, statsManager);
    const damageEventBus = new EventBus<DamageEventMap>();
    damageManager.setEventBus(damageEventBus);

    const deathManager = new DeathManager(world, damageManager);
    const targetValidator = new TargetValidator(world);
    const targetManager = new TargetManager(world, targetValidator);
    const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
    const abilityManager = new AbilityManager(world, statsManager);
    const effectManager = new EffectManager();

    // --- Combat service & orchestrator ----------------------------------------
    const combatService = new CombatService(
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      statsManager,
    );

    const orchestrator = new CombatOrchestrator({
      combatService,
      effectManager,
      abilityManager,
    });
    orchestrator.initialize();

    // --- Equipment stat sync --------------------------------------------------
    const syncWeaponMasteryStats = (entityId: EntityId): void => {
      recalculateWeaponMasteryStats(
        statsManager,
        equipmentManager,
        masteryService,
        entityId,
      );
    };
    const equipmentStatSync = new EquipmentStatSync(
      statsManager,
      resolveEquipmentInfo,
      (entityId, changedStats) => {
        syncWeaponMasteryStats(entityId);
        if (
          changedStats.includes(STAT_MAX_HEALTH) &&
          world.hasComponent(entityId, HealthComponent)
        ) {
          damageManager.syncMaxHealth(entityId);
          const health = damageManager.getHealth(entityId);
          bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
        }
        syncStatsToBridge(bridge, statsManager, entityId);
      },
    );

    // --- Inventory & Equipment managers ----------------------------------------
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

    // --- Currency & Economy setup (early — RepairService needs it) ---------------
    const currencyRegistry = new CurrencyRegistry();
    currencyRegistry.register({
      id: "currency_silver",
      enabled: true,
      minValue: 0,
      maxValue: null,
      acquisitionSources: ["Loot", "VendorSale", "Quest"],
      spendingSources: ["Vendor", "Building", "Craft", "Worker"],
    });

    const currencyService = new CurrencyService(currencyRegistry);
    const playerId = asPlayerId("player_1");
    const walletId = asWalletId("wallet_1");
    currencyService.createWallet(walletId, playerId);
    // Start with 1000 silver
    currencyService.credit(walletId, "currency_silver", 1000, "Loot");

    // --- Progression systems ---------------------------------------------------
    const experienceService = new ExperienceService();
    const fameService = new FameService(experienceService);
    const masteryService = new MasteryService(experienceService);
    const destinyBoardService = new DestinyBoardService(experienceService);
    const progressionOrchestrator = new ProgressionOrchestrator(
      experienceService,
      fameService,
      masteryService,
      destinyBoardService,
    );

    // Initialize progression with mastery definitions
    progressionOrchestrator.initialize({
      masteryDefinitions: MASTERY_DEFINITIONS,
      destinyNodes: DESTINY_NODES,
    });
    masteryService.discoverMastery(WOOD_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(ORE_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(HIDE_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(FIBER_GATHERING_MASTERY_ID);

    // --- Durability & Repair systems -------------------------------------------
    const durabilityStore = new DurabilityStore();
    const repairStationRegistry = new RepairStationRegistry();
    repairStationRegistry.register({
      stationId: "station_general",
      locationType: "city",
      repairModifier: 1.0,
      enabled: true,
    });

    const repairCostResolver = new RepairCostResolver();
    for (const def of REPAIR_COST_DEFINITIONS) {
      repairCostResolver.register(def);
    }

    const repairService = new RepairService(
      repairCostResolver,
      repairStationRegistry,
      currencyService,
      inventoryManager,
      equipmentManager,
      durabilityStore,
      resolveRepairableInfo,
    );

    // --- World systems ---------------------------------------------------------
    const biomeRegistry = new BiomeRegistry();
    for (const definition of BIOME_DEFINITIONS) {
      biomeRegistry.register(definition);
    }

    const biomeResolver = new BiomeResolver(biomeRegistry);
    const zoneManager = new ZoneManager();

    const FOREST_ZONE_DEF_ID = WORLD_ZONE_IDS.forest;
    const _SWAMP_ZONE_DEF_ID = WORLD_ZONE_IDS.swamp;
    const _HIGHLAND_ZONE_DEF_ID = WORLD_ZONE_IDS.highland;
    const _STEPPE_ZONE_DEF_ID = WORLD_ZONE_IDS.steppe;
    const _MOUNTAIN_ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
    void _SWAMP_ZONE_DEF_ID;
    void _HIGHLAND_ZONE_DEF_ID;
    void _STEPPE_ZONE_DEF_ID;
    void _MOUNTAIN_ZONE_DEF_ID;

    for (const definition of ZONE_DEFINITIONS) {
      zoneManager.registerDefinition(definition);
    }

    for (const [zoneId, biomeId] of BIOME_BY_ZONE) {
      biomeResolver.associate(zoneId, biomeId);
    }

    const progressionManager = new WorldProgressionManager();
    for (const definition of ZONE_UNLOCK_DEFINITIONS) {
      progressionManager.registerUnlockDefinition(definition);
    }

    const explorationManager = new ExplorationManager();
    const worldEventBus = new EventBus<WorldIntegrationEventMap>();
    const worldCoordinator = new WorldCoordinator({
      zoneManager,
      biomeRegistry,
      biomeResolver,
      progressionManager,
      explorationManager,
      eventBus: worldEventBus,
    });

    worldCoordinator.initialize();
    worldCoordinator.changeZone(FOREST_ZONE_DEF_ID, 0);

    const worldRuntime = new WorldRuntime({
      zoneManager,
      progressionManager,
      worldCoordinator,
    });

    // Zone definitions ordered for progression
    const ZONE_ORDER: readonly ZoneDefinitionId[] = WORLD_ZONE_ORDER;

    function getActiveZoneDef(): { defId: ZoneDefinitionId; tier: number; name: string } {
      return worldRuntime.getActiveZoneDef();
    }

    function updateWorldBridge(): void {
      const zone = worldRuntime.getActiveZoneDef();
      const biome = biomeResolver.resolve(zone.defId);
      const saveState = worldRuntime.getWorldLocationSaveState();
      const vm: WorldVM = {
        zoneIndex: worldRuntime.currentZoneIndex + 1,
        zoneCount: ZONE_ORDER.length,
        canGoPreviousZone: worldRuntime.currentZoneIndex > 0,
        canGoNextZone:
          worldRuntime.currentZoneIndex + 1 < ZONE_ORDER.length
          && progressionManager.isUnlocked(ZONE_ORDER[worldRuntime.currentZoneIndex + 1]!),
        pendingZoneIndex:
          worldRuntime.pendingZone === null ? null : worldRuntime.pendingZone + 1,
        zones: ZONE_ORDER.map((zoneDefId, index) => {
          const definition = zoneManager.registry.get(zoneDefId);
          const zoneBiome = biomeResolver.resolve(zoneDefId);
          const memory = saveState.zoneMemories[index]!;
          const isActive = index === worldRuntime.currentZoneIndex;

          return {
            zoneIndex: index + 1,
            zoneName: definition?.name ?? "Unknown",
            biomeName: zoneBiome?.name ?? "Unknown",
            isUnlocked: progressionManager.isUnlocked(zoneDefId),
            isActive,
            segmentIndex: memory.currentSegment + 1,
            unlockedSegmentCount: memory.highestUnlockedSegment + 1,
            completedSegments: [...memory.completedSegments].map(
              (segment) => segment + 1,
            ),
          };
        }),
        zoneName: zone.name,
        zoneDefId: zone.defId,
        biomeName: biome?.name ?? "Unknown",
        biomeTheme: biome?.theme ?? "Nature",
        environmentVisualManifestId: resolveEnvironmentPresentation(
          zone.defId,
        ),
        segmentIndex: worldRuntime.currentSegment + 1,
        segmentCount: SEGMENTS_PER_ZONE,
        encounterIndex: worldRuntime.currentEncounter + 1,
        encounterCount: ENCOUNTERS_PER_SEGMENT,
        unlockedSegmentCount: worldRuntime.highestUnlockedSegment + 1,
        completedSegments: [...worldRuntime.completedSegments].map(
          (segment) => segment + 1,
        ),
        pendingSegmentIndex:
          worldRuntime.pendingZone !== null
            ? (worldRuntime.pendingZoneSegment ?? 0) + 1
            : worldRuntime.pendingSegment === null
              ? null
              : worldRuntime.pendingSegment + 1,
        farmMode: worldRuntime.farmMode,
        encounterType:
          worldRuntime.currentEncounter === ENCOUNTERS_PER_SEGMENT - 1
            ? "boss"
            : "normal",
        zoneProgress: Math.floor(
          ((worldRuntime.currentSegment * ENCOUNTERS_PER_SEGMENT +
            worldRuntime.currentEncounter) /
            (SEGMENTS_PER_ZONE * ENCOUNTERS_PER_SEGMENT)) *
            100,
        ),
        isFirstVisit: !explorationManager.isDiscovered(zone.defId),
      };
      bridge.updateWorld(vm);
    }

    const combatEntityFactoryDeps = {
      world,
      statsManager,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
    };

    // --- Create hero ----------------------------------------------------------
    const heroId = setupCombatEntity(
      combatEntityFactoryDeps,
      { maxHealth: 500, physDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
      { x: 0, y: 0 },
    );

    // --- Attach inventory & equipment to hero -----------------------------------
    inventoryManager.createInventory(heroId, 24);
    const bankId = world.createEntity();
    inventoryManager.createInventory(bankId, 64);
    const productionStorageId = world.createEntity();
    inventoryManager.createInventory(productionStorageId, 256);
    equipmentManager.attachEquipment(heroId);
    const enchantmentService = new EnchantmentService({
      inventoryManager,
      currencyService,
      walletId,
      inventoryOwnerId: heroId,
      resolveMaterialOwnerId: (itemId) =>
        isProductionMaterial(itemId) ? productionStorageId : heroId,
      resolveItemInfo: resolveEnchantmentItemInfo,
      findEquippedEntry: (instanceId: ItemInstanceId) =>
        [...equipmentManager.getEquipped(heroId).values()]
          .find((entry) => entry.instanceId === instanceId),
      changeEquippedEnchantment: (
        instanceId: ItemInstanceId,
        enchantment,
      ) => equipmentManager.changeEquippedEnchantment(
        heroId,
        instanceId,
        enchantment,
      ),
    });

    // --- Gathering vertical slice ---------------------------------------------
    const resourceRegistry = new ResourceRegistry();
    const resourceRuntime = new ResourceRuntime();
    const resourceNodeRegistry = new ResourceNodeRegistry();
    const resourceNodeManager = new ResourceNodeManager();
    const gatheringManager = new GatheringManager(resourceRegistry);
    const oreGatheringManager = new GatheringManager(resourceRegistry);
    const hideGatheringManager = new GatheringManager(resourceRegistry);
    const fiberGatheringManager = new GatheringManager(resourceRegistry);
    const gatheringToolRegistry = new GatheringToolRegistry();

    const {
      birchNode,
      copperNode,
      pineNode,
      ironNode,
      sturdyHideNode,
      thickHideNode,
      linenFiberNode,
      fineFiberNode,
      starterAxe,
      tier4Axe,
      starterPickaxe,
      tier4Pickaxe,
      starterSkinningKnife,
      tier4SkinningKnife,
      starterSickle,
      tier4Sickle,
    } = setupResourceContentCatalog({
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      gatheringToolRegistry,
      forestZoneDefId: FOREST_ZONE_DEF_ID,
    });

    // Production nodes model renewable reserves. Without this lifecycle hook,
    // their finite runtime charge pool eventually reaches zero during a long
    // session and subsequent gathering cycles can no longer start.
    resourceRuntime.events.subscribe("resourceDepleted", ({ resourceId }) => {
      resourceRuntime.restore(resourceId);
    });
    const gatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      gatheringManager,
      gatheringToolRegistry,
    );
    const oreGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      oreGatheringManager,
      gatheringToolRegistry,
    );
    const hideGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      hideGatheringManager,
      gatheringToolRegistry,
    );
    const fiberGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      fiberGatheringManager,
      gatheringToolRegistry,
    );

    const gatheringRuntime = new GatheringRuntime({
      gatheringCoordinator,
      gatheringManager,
      oreGatheringCoordinator,
      oreGatheringManager,
      hideGatheringCoordinator,
      hideGatheringManager,
      fiberGatheringCoordinator,
      fiberGatheringManager,
      inventoryManager,
      masteryService,
      experienceService,
      progressionOrchestrator,
      productionStorageId,
      nodesAndTools: {
        birchNodeId: birchNode.id,
        pineNodeId: pineNode.id,
        copperNodeId: copperNode.id,
        ironNodeId: ironNode.id,
        sturdyHideNodeId: sturdyHideNode.id,
        thickHideNodeId: thickHideNode.id,
        linenFiberNodeId: linenFiberNode.id,
        fineFiberNodeId: fineFiberNode.id,
        starterAxe,
        tier4Axe,
        starterPickaxe,
        tier4Pickaxe,
        starterSkinningKnife,
        tier4SkinningKnife,
        starterSickle,
        tier4Sickle,
      },
      getProductionTier: () => productionTier,
    });
    const refiningManager = new RefiningManager();
    const metalRefiningManager = new RefiningManager();
    const leatherRefiningManager = new RefiningManager();
    const clothRefiningManager = new RefiningManager();

    const refiningRuntime = new RefiningRuntime({
      refiningManager,
      metalRefiningManager,
      leatherRefiningManager,
      clothRefiningManager,
      inventoryManager,
      productionStorageId,
      getProductionTier: () => productionTier,
    });

    const craftingRuntime = new CraftingRuntime({
      inventoryManager,
      heroId,
      productionStorageId,
      durabilityStore,
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });

    const workerRuntime = new WorkerRuntime({
      inventoryManager,
      productionStorageId,
      currencyService,
      walletId,
      experienceService,
      getProductionTier: () => productionTier,
      getRequiredGatheringMasteryForTier,
    });

    // The starter sword unlocks its mastery and becomes the active Fame target.
    const starterSwordItemId = "item_weapon_sword_t3_broadsword";
    const starterSwordMasteryRoute = resolveWeaponMastery(starterSwordItemId);
    if (starterSwordMasteryRoute === undefined) {
      throw new Error("Starter Broadsword mastery route is missing from weapon content catalog");
    }
    const starterSwordPosition = 0;
    const starterSword = inventoryManager.addEntry(
      heroId,
      starterSwordItemId,
      starterSwordPosition,
    );
    if (starterSword.ok) {
      durabilityStore.attach(starterSword.value.instanceId, 100);
      equipmentManager.equipFromInventory(heroId, starterSwordPosition);
      masteryService.discoverMastery(starterSwordMasteryRoute.familyId);
      masteryService.discoverMastery(starterSwordMasteryRoute.weaponId);
    }

    // Alternative starter weapons remain unequipped in the hero inventory.
    // This lets a new character immediately test every implemented weapon
    // profile without granting their masteries before first use.
    for (const starterWeaponId of [
      "item_weapon_bow_t3_longbow",
      "item_weapon_staff_t3_fire",
    ]) {
      const starterWeapon = inventoryManager.addEntry(
        heroId,
        starterWeaponId,
      );
      if (starterWeapon.ok) {
        durabilityStore.attach(starterWeapon.value.instanceId, 100);
      }
    }

    // --- Vendor setup ------------------------------------------------------------
    const vendorRegistry = new VendorRegistry();
    vendorRegistry.register({
      vendorId: "vendor_general",
      role: "buy_and_sell",
      enabled: true,
      offers: [
        ...GENERAL_VENDOR_FIXED_OFFERS,
        ...WEAPON_VENDOR_OFFERS,
      ],
    });

    const vendorService = new VendorService(
      vendorRegistry,
      currencyService,
      inventoryManager,
      equipmentManager,
      resolveItemStackInfo,
    );

    // --- Economy transaction pipeline --------------------------------------------
    const economyEvents = new EconomyEventEmitter();
    const transactionRegistry = new TransactionRegistry();
    const economyTransactionService = new EconomyTransactionService(
      currencyRegistry,
      currencyService,
      vendorService,
      repairService,
      transactionRegistry,
      economyEvents,
    );

    // --- Initialize bridge with starting values --------------------------------
    const heroHealth = damageManager.getHealth(heroId);
    bridge.updatePlayerHealth(heroHealth.currentHealth, heroHealth.maxHealth);
    updateWorldBridge();

    // --- Sync all panels to bridge ----------------------------------------------
    syncInventoryToBridge(bridge, inventoryManager, heroId);
    syncBankToBridge(bridge, inventoryManager, bankId);
    syncEquipmentToBridge(bridge, equipmentManager, heroId);
    syncStatsToBridge(bridge, statsManager, heroId);
    syncWalletToBridge(bridge, currencyService, walletId, 0);
    syncVendorToBridge(bridge, vendorRegistry, "vendor_general");

    const progressionState = progressionOrchestrator.getFullProgressionState();
    syncProgressionToBridge(
      bridge,
      progressionState.totalFame,
      progressionState.overflowPool,
      buildMasteryViewModels(progressionState),
    );
    syncRepairToBridge(bridge, collectRepairPreviewData(equipmentManager, inventoryManager, durabilityStore, repairCostResolver, heroId, 1.0));

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

    // --- Helper: full bridge resync after any mutation ---------------------------
    const resyncAll = (): void => {
      recalculateWeaponMasteryStats(statsManager, equipmentManager, masteryService, heroId);
      const pState = progressionOrchestrator.getFullProgressionState();
      syncAllToBridge(
        bridge, inventoryManager, equipmentManager, statsManager,
        currencyService, walletId, combatRewardAdapter.getIncomeRate(), vendorRegistry, "vendor_general",
        heroId, pState.totalFame, pState.overflowPool,
        buildMasteryViewModels(pState),
      );
      syncBankToBridge(bridge, inventoryManager, bankId);
      syncRepairToBridge(bridge, collectRepairPreviewData(equipmentManager, inventoryManager, durabilityStore, repairCostResolver, heroId, 1.0));
    };

    // --- Subscribe to damage events -> bridge ----------------------------------
    damageEventBus.subscribe("HealthChanged", (evt) => {
      if (evt.entityId === heroId) {
        bridge.updatePlayerHealth(evt.newHealth, evt.maxHealth);
      } else {
        bridge.updateEnemyHealth(evt.newHealth, evt.maxHealth);
      }
    });

    damageEventBus.subscribe("DamageDealt", (evt) => {
      const target = evt.target === heroId ? "player" as const : "enemy" as const;
      bridge.addDamageNumber(evt.finalDamage, target);
    });

    // --- Persistence setup -------------------------------------------------------
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
    });

    // --- Save/Load functions ---------------------------------------------------
    let tickCounter = 0;
    let productionTier: 3 | 4 = 3;

    const getEquippedWeaponId = (): string | undefined =>
      bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId ?? undefined;

    const syncProjectedSegmentRates = (): void => {
      const rates = calculateProjectedSegmentRates({
        physicalDamage: statsManager.getStat(heroId, STAT_PHYSICAL_DAMAGE).computed,
        magicalDamage: statsManager.getStat(heroId, STAT_MAGICAL_DAMAGE).computed,
        attackSpeed: statsManager.getStat(heroId, STAT_ATTACK_SPEED).computed,
        equippedWeaponId: getEquippedWeaponId(),
        primaryAbilityAutoCast: combatRuntime.isAutoCastEnabled(),
        currentZoneIndex: worldRuntime.currentZoneIndex,
        currentSegment: worldRuntime.currentSegment,
      });

      bridge.updateSegmentRates(rates.silverPerHour, rates.famePerHour);
    };

    const syncAbilities = (): void => {
      syncAbilitiesToBridge(
        bridge,
        abilityManager,
        heroId,
        getEquippedWeaponId(),
        combatRuntime.isAutoCastEnabled(),
      );
    };

    const usePrimaryAbility = (): boolean => {
      if (bridge.combatState !== "combat") return false;
      const ok = combatRuntime.usePrimaryAbility();
      syncAbilities();
      return ok;
    };

    const setPrimaryAbilityAutoCast = (enabled: boolean): void => {
      combatRuntime.setPrimaryAbilityAutoCast(enabled);
      syncAbilities();
    };

    gatheringRuntime.subscribeGatherCompleted((evt) => {
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      if (evt.family === "Wood") {
        syncGathering();
        syncRefining();
      } else if (evt.family === "Ore") {
        syncOreGathering();
        syncMetalRefining();
      } else if (evt.family === "Hide") {
        syncHideGathering();
        syncLeatherRefining();
      } else if (evt.family === "Fiber") {
        syncFiberGathering();
        syncClothRefining();
      }
      syncCrafting();
      syncMasteryProgression();
      bridge.addEconomyNotification({
        id: `notif_gather_${String(Date.now())}`,
        type: evt.added ? "success" : "error",
        message: evt.added
          ? `+${String(evt.quantityAdded)} ${evt.itemLabel}`
          : "Inventaire plein : récolte non stockée",
        timestamp: Date.now(),
      });
    });

    const productionBridge = new ProductionBridgeAdapter({
      bridge,
      inventoryManager,
      heroId,
      productionStorageId,
      gatheringRuntime,
      refiningRuntime,
      gatheringCoordinators: {
        Wood: gatheringCoordinator,
        Ore: oreGatheringCoordinator,
        Hide: hideGatheringCoordinator,
        Fiber: fiberGatheringCoordinator,
      },
      refiningManagers: {
        Wood: refiningManager,
        Ore: metalRefiningManager,
        Hide: leatherRefiningManager,
        Fiber: clothRefiningManager,
      },
      getCurrentTick: () => tickCounter,
      getProductionTier: () => productionTier,
    });

    const syncGathering = (): void => { productionBridge.syncGathering("Wood"); };
    const syncOreGathering = (): void => { productionBridge.syncGathering("Ore"); };
    const syncHideGathering = (): void => { productionBridge.syncGathering("Hide"); };
    const syncFiberGathering = (): void => { productionBridge.syncGathering("Fiber"); };
    const productionActions = new ProductionActions({
      bridge,
      heroId,
      inventoryManager,
      gatheringRuntime,
      refiningRuntime,
      craftingRuntime,
      productionBridge,
      getCurrentTick: () => tickCounter,
      prepareCombatResumeAfterGathering: () => { prepareCombatResumeAfterGathering(); },
    });

    const syncMasteryProgression = (): void => {
      const state = progressionOrchestrator.getFullProgressionState();
      syncProgressionToBridge(
        bridge,
        state.totalFame,
        state.overflowPool,
        buildMasteryViewModels(state),
      );
    };

    const toggleGathering = (): boolean => productionActions.toggleGathering("Wood");
    const returnToCombat = (): boolean => productionActions.returnToCombat();
    const toggleOreGathering = (): boolean => productionActions.toggleGathering("Ore");
    const toggleHideGathering = (): boolean => productionActions.toggleGathering("Hide");
    const toggleFiberGathering = (): boolean => productionActions.toggleGathering("Fiber");

    const performGatheringStrike = (
      resourceFamily: string,
      quality: "miss" | "correct" | "perfect",
    ): boolean => {
      return productionActions.performGatheringStrike(resourceFamily, quality);
    };

    syncGathering();
    syncOreGathering();
    syncHideGathering();
    syncFiberGathering();


    refiningRuntime.subscribeRefineCompleted((evt) => {
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      if (evt.family === "Wood") {
        syncGathering();
        syncRefining();
      } else if (evt.family === "Ore") {
        syncOreGathering();
        syncMetalRefining();
      } else if (evt.family === "Hide") {
        syncHideGathering();
        syncLeatherRefining();
      } else if (evt.family === "Fiber") {
        syncFiberGathering();
        syncClothRefining();
      }
      syncCrafting();
    });

    const syncRefining = (): void => { productionBridge.syncRefining("Wood"); };
    const syncMetalRefining = (): void => { productionBridge.syncRefining("Ore"); };
    const syncLeatherRefining = (): void => { productionBridge.syncRefining("Hide"); };
    const syncClothRefining = (): void => { productionBridge.syncRefining("Fiber"); };

    const toggleRefining = (): boolean => productionActions.toggleRefining("Wood");
    const toggleMetalRefining = (): boolean => productionActions.toggleRefining("Ore");
    const toggleLeatherRefining = (): boolean => productionActions.toggleRefining("Hide");
    const toggleClothRefining = (): boolean => productionActions.toggleRefining("Fiber");
    const refineAllAvailable = (): boolean => productionActions.refineAllAvailable();

    syncRefining();
    syncMetalRefining();
    syncLeatherRefining();
    syncClothRefining();

    const syncCrafting = (): void => { productionBridge.syncCrafting(); };

    const craftEquipment = (outputItemId: string): boolean =>
      productionActions.craftEquipment(outputItemId);

    const setProductionTier = (tier: 3 | 4): boolean => {
      productionTier = tier;
      syncGathering();
      syncOreGathering();
      syncHideGathering();
      syncFiberGathering();
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      return true;
    };
    syncMetalRefining();
    syncCrafting();

    const syncWorkers = (): void => {
      syncWorkersToBridge(
        bridge,
        workerRuntime.getAllWorkers(),
        (profession) => workerRuntime.isSupportedWorkerProfession(profession),
        (wId) => workerRuntime.getWorkerSession(wId),
        (wId) => workerRuntime.getAssignedTier(wId),
        (xp, tier) => workerRuntime.getWorkerMasteryDetails(xp, tier),
        WORKER_CAPACITY,
        WORKER_RECRUITMENT_COST,
      );
    };

    workerRuntime.subscribeCycleCompleted(() => {
      syncMasteryProgression();
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncGathering();
      syncOreGathering();
      syncHideGathering();
      syncFiberGathering();
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      syncWorkers();
    });

    workerRuntime.subscribeDomainEvent((evt) => {
      if (evt.type === "recruit_success") {
        syncWalletToBridge(
          bridge,
          currencyService,
          walletId,
          bridge.wallet.incomeRate,
        );
        syncWorkers();
        bridge.addEconomyNotification({
          id: `notif_worker_recruit_${String(Date.now())}`,
          type: "success",
          message: `${evt.displayName}, ${WORKER_PROFESSION_LABELS[evt.profession]}, a rejoint l’île`,
          timestamp: Date.now(),
        });
      } else if (evt.type === "recruit_insufficient_funds") {
        bridge.addEconomyNotification({
          id: `notif_worker_cost_${String(Date.now())}`,
          type: "error",
          message: "Argent insuffisant pour recruter ce worker",
          timestamp: Date.now(),
        });
      } else if (evt.type === "storage_full") {
        bridge.addEconomyNotification({
          id: `notif_worker_storage_${String(evt.workerId)}_${String(Date.now())}`,
          type: "error",
          message: `Stockage plein : production de ${getWorkerResourceLabel(evt.profession, evt.assignedTier)} non stockée`,
          timestamp: Date.now(),
        });
      }
    });

    const recruitWorker = (profession: WorkerProfessionVM): boolean => {
      const result = workerRuntime.recruitWorker(profession);
      return result.ok;
    };

    const toggleWorker = (profession: WorkerProfessionVM): boolean => {
      const result = workerRuntime.toggleWorker(profession);
      syncWorkers();
      return result.ok;
    };

    const workerSaveProvider = {
      providerId: "workers",
      save: () => workerRuntime.getSaveState(),
      load: (data: unknown): void => {
        workerRuntime.restoreSaveState(data);
        syncWorkers();
      },
    };
    persistence.registerProvider(workerSaveProvider);
    syncWorkers();

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

    // --- Start combat runtime --------------------------------------------------
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

    const restoreHeroHealth = (): void => combatRuntime.restoreHeroHealth();

    const interruptEncounterForTravel = (): void => {
      combatRuntime.interruptEncounter();
      bridge.setCombatState("walking");
    };

    const prepareCombatResumeAfterGathering = (): void => {
      const resumeSegment = worldRuntime.farmMode
        ? worldRuntime.currentSegment
        : worldRuntime.highestUnlockedSegment;

      interruptEncounterForTravel();
      worldRuntime.selectSegment(resumeSegment + 1);
      restoreHeroHealth();
      updateWorldBridge();
    };

    const selectSegment = (segmentNumber: number): boolean => {
      if (!worldRuntime.selectSegment(segmentNumber)) {
        return false;
      }

      interruptEncounterForTravel();
      restoreHeroHealth();
      updateWorldBridge();
      return true;
    };

    const setSegmentFarmMode = (enabled: boolean): void => {
      worldRuntime.setSegmentFarmMode(enabled);
      updateWorldBridge();
    };

    const selectZone = (zoneNumber: number, segmentNumber?: number): boolean => {
      if (!worldRuntime.selectZone(zoneNumber, segmentNumber)) {
        return false;
      }

      interruptEncounterForTravel();
      restoreHeroHealth();
      updateWorldBridge();
      return true;
    };

    const resumeExploration = (): boolean => {
      const ok = combatRuntime.resumeExploration();
      if (ok) {
        bridge.setCombatState("walking");
      }
      return ok;
    };

    const getWorldLocationSaveState = (): WorldLocationSaveState => {
      return worldRuntime.getWorldLocationSaveState();
    };

    const setWorldLocationSaveState = (
      savedLocation: WorldLocationSaveState | undefined,
    ): void => {
      interruptEncounterForTravel();
      worldRuntime.setWorldLocationSaveState(savedLocation);
      restoreHeroHealth();
      updateWorldBridge();
      bridge.setCombatState("walking");
    };

    const worldSaveProvider = new WorldSaveProvider(
      worldCoordinator,
      getWorldLocationSaveState,
      setWorldLocationSaveState,
    );
    persistence.registerProvider(worldSaveProvider);

    const initialCombat = combatRuntime.initialize();
    if (initialCombat.activeEnemy) {
      bridge.setEnemyPresentation(initialCombat.activeEnemy.name, initialCombat.activeEnemy.visualManifestId);
      bridge.updateEnemyHealth(initialCombat.activeEnemy.currentHealth, initialCombat.activeEnemy.maxHealth);
    }
    bridge.setCombatState(initialCombat.combatState);
    syncAbilities();

    const consumableRuntime = new ConsumableRuntime({
      inventoryManager,
      damageManager,
      deathManager,
      heroId,
    });

    // --- Combat tick function (started in useEffect to survive StrictMode) ----
    const TICK_INTERVAL = 500;
    const DT = 0.5;
    const tickState = { accumulator: 0 };

    const syncConsumables = (): void => {
      bridge.updateConsumables(consumableRuntime.getState());
    };
    syncConsumables();

    const tickFn = (): void => {
      tickCounter += 1;
      if (consumableRuntime.tick(DT)) {
        syncConsumables();
      }
      gatheringRuntime.tick(tickCounter);
      refiningRuntime.tick(tickCounter);
      workerRuntime.tick(tickCounter);
      if (workerRuntime.hasActiveWorkerSession()) {
        syncWorkers();
      }
      if (gatheringCoordinator.getActiveSession() !== undefined) {
        syncGathering();
      }
      if (refiningManager.getActiveSession() !== undefined) {
        syncRefining();
      }
      if (oreGatheringCoordinator.getActiveSession() !== undefined) {
        syncOreGathering();
      }
      if (metalRefiningManager.getActiveSession() !== undefined) {
        syncMetalRefining();
      }
      if (hideGatheringCoordinator.getActiveSession() !== undefined) syncHideGathering();
      if (fiberGatheringCoordinator.getActiveSession() !== undefined) syncFiberGathering();
      if (leatherRefiningManager.getActiveSession() !== undefined) syncLeatherRefining();
      if (clothRefiningManager.getActiveSession() !== undefined) syncClothRefining();

      const heroIsGathering = gatheringRuntime.isHeroGathering();
      if (heroIsGathering) {
        bridge.setCombatState("idle");
        return;
      }

      syncProjectedSegmentRates();

      tickState.accumulator += TICK_INTERVAL;
      bridge.updateZoneElapsed(tickState.accumulator / 1000);

      const combatResult = combatRuntime.tick(DT, tickCounter);

      if (combatResult.spawnedEnemy !== undefined) {
        const newEnemyHealth = damageManager.getHealth(combatResult.spawnedEnemy.id);
        bridge.updateEnemyHealth(newEnemyHealth.currentHealth, newEnemyHealth.maxHealth);
        bridge.setEnemyPresentation(combatResult.spawnedEnemy.name, combatResult.spawnedEnemy.visualManifestId);
        updateWorldBridge();
      } else if (combatResult.activeEnemy !== undefined && combatResult.activeEnemy.id !== 0) {
        bridge.updateEnemyHealth(combatResult.activeEnemy.currentHealth, combatResult.activeEnemy.maxHealth);
      }

      if (combatResult.playerHealth !== undefined) {
        bridge.updatePlayerHealth(combatResult.playerHealth.currentHealth, combatResult.playerHealth.maxHealth);
      }

      if (combatResult.combatState !== undefined) {
        bridge.setCombatState(combatResult.combatState);
      }

      if (combatResult.activeEffects !== undefined) {
        bridge.setActiveEffects(
          combatResult.activeEffects.map((eff) => ({
            id: eff.id,
            name: eff.definitionId,
            type: eff.effectType,
            remainingDuration: eff.remainingDuration,
          })),
        );
      }

      syncAbilities();
    };

    registerGameRuntimeLifecycle(bridge, {
      tick: tickFn,
      tickIntervalMs: TICK_INTERVAL,
      persistence,
      dispose: () => {
        orchestrator.dispose();
        progressionOrchestrator.dispose();
        worldCoordinator.dispose();
        gatheringCoordinator.dispose();
        oreGatheringCoordinator.dispose();
        hideGatheringCoordinator.dispose();
        fiberGatheringCoordinator.dispose();
      },
    });

    const useConsumable = (itemId: string): boolean => {
      const result = consumableRuntime.useConsumable(itemId);
      if (!result.ok) {
        if (result.reason === "hero_dead") {
          bridge.addEconomyNotification({
            id: `notif_consumable_dead_${String(Date.now())}`,
            type: "error",
            message: "Action impossible : le héros est vaincu.",
            timestamp: Date.now(),
          });
        } else if (result.reason === "cooldown") {
          bridge.addEconomyNotification({
            id: `notif_consumable_cooldown_${String(Date.now())}`,
            type: "error",
            message: `Potion indisponible : ${String(Math.ceil(result.remainingSeconds))} s`,
            timestamp: Date.now(),
          });
        } else if (result.reason === "resource_full") {
          bridge.addEconomyNotification({
            id: `notif_consumable_full_${String(Date.now())}`,
            type: "error",
            message: "Impossible à utiliser : points de vie déjà au maximum",
            timestamp: Date.now(),
          });
        }
        return false;
      }

      syncConsumables();
      if (result.currentHealth !== undefined && result.maxHealth !== undefined) {
        bridge.updatePlayerHealth(result.currentHealth, result.maxHealth);
      }
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      bridge.addEconomyNotification({
        id: `notif_consumable_${String(Date.now())}`,
        type: "success",
        message: `Potion de soin : +${String(result.restored)} PV`,
        timestamp: Date.now(),
      });
      return true;
    };

    const repairAll = (): boolean => {
      const txId = asEconomyTransactionId(
        `tx_repair_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
      );
      const result = economyTransactionService.execute({
        type: "bulk_equipment_repair",
        transactionId: txId,
        playerId,
        playerEntityId: heroId,
        walletId,
        stationId: "station_general",
      });

      if (!result.ok) {
        bridge.addEconomyNotification({
          id: `notif_${txId}`,
          type: "error",
          message: result.code === "repair_nothing_to_repair"
            ? "Aucun équipement à réparer"
            : `Réparation impossible : ${result.code.replace("repair_", "")}`,
          timestamp: Date.now(),
        });
        return false;
      }

      const totalCost = result.effects.type === "bulk_equipment_repair"
        ? result.effects.outcome.totalCost
        : 0;
      bridge.addTransaction({
        id: txId,
        type: "repair",
        description: "Réparation complète de l’équipement",
        amount: totalCost,
        timestamp: Date.now(),
      });
      bridge.addEconomyNotification({
        id: `notif_${txId}`,
        type: "success",
        message: `Équipement réparé · ${String(totalCost)} Silver`,
        timestamp: Date.now(),
      });
      resyncAll();
      return true;
    };

    return {
      eventBus, bridge, orchestrator, heroId, bankId, productionStorageId, inventoryManager, equipmentManager,
      enchantmentService,
      statsManager, currencyService, economyTransactionService, vendorRegistry,
      walletId, playerId, worldCoordinator, useConsumable, usePrimaryAbility,
      setPrimaryAbilityAutoCast, resumeExploration,
      selectSegment, setSegmentFarmMode, selectZone, returnToCombat,
      toggleGathering, performGatheringStrike,
      toggleOreGathering, toggleHideGathering, toggleFiberGathering,
      toggleRefining, toggleMetalRefining, toggleLeatherRefining, toggleClothRefining,
      refineAllAvailable,
      setProductionTier, craftEquipment, recruitWorker, toggleWorker, repairAll,
      saveGame, loadGame, hasSave,
    };
  }, []);

  useGameRuntimeLifecycle(services);

  return (
    <GameServicesContextProvider services={services}>
      {children}
    </GameServicesContextProvider>
  );
}
