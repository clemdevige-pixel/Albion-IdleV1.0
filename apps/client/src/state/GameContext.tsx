import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { RuntimeLifecycle } from "../runtime/RuntimeLifecycle.js";
import { RuntimePersistence } from "../runtime/RuntimePersistence.js";
import { WorldRuntime } from "../runtime/WorldRuntime.js";
import { EventBus, World, createRuntimeServices } from "@game/core";
import {
  CombatService,
  CombatOrchestrator,
  DamageManager,
  HealthComponent,
  EnergyComponent,
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
  asMasteryId,
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
  getEncounterRewards,
} from "@game/gameplay";
import type { EntityId } from "@game/core";
import type { StatId, DamageEventMap, WalletId, PlayerId, ZoneDefinitionId, WorldIntegrationEventMap, ItemInstanceId, ResourceFamily, WorldLocationSaveState } from "@game/gameplay";
import { WorkerRuntime } from "../runtime/WorkerRuntime.js";

import { SEGMENTS_PER_ZONE, ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { GameBridge, type GameBridgeState, type WorldVM, type WorkerProfessionVM } from "../game/GameBridge";
import { GatheringRuntime } from "../runtime/GatheringRuntime";
import { RefiningRuntime } from "../runtime/RefiningRuntime";
import { CraftingRuntime } from "../runtime/CraftingRuntime";
import { ConsumableRuntime } from "../runtime/ConsumableRuntime.js";
import { CombatRewardRuntime } from "../runtime/CombatRewardRuntime.js";
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
  syncCraftingToBridge,
  syncGatheringToBridge,
  syncRefiningToBridge,
  syncAbilitiesToBridge,
  WORKER_PROFESSION_LABELS,
  getWorkerResourceLabel,
  syncAllToBridge,
  buildMasteryViewModels,
} from "./bridgeSync";
import {
  EQUIPMENT_CRAFT_RECIPES,
  getWoodRecipe,
  getMetalRecipe,
  getLeatherRecipe,
  getClothRecipe,
} from "../data/refiningRecipes";
import {
  getItemPower,
} from "../data/itemPower";
import {
  WEAPON_VENDOR_OFFERS,
} from "../data/weaponContentCatalog";
import {
  ENCHANTMENT_MATERIAL_NAMES,
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
  SWORD_MASTERY_ID,
  BROADSWORD_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  FIBER_GATHERING_MASTERY_ID,
  MASTERY_DEFINITIONS,
  getMasteryDisplayName,
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

/** Event map for the UI-layer event bus. Starts empty; later phases add entries. */
export type UIEventMap = Record<string, unknown>;

/**
 * Minimal game services exposed to the React UI layer.
 */
export interface GameServices {
  readonly eventBus: EventBus<UIEventMap>;
  readonly bridge: GameBridge;
  readonly orchestrator: CombatOrchestrator;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly enchantmentService: EnchantmentService;
  readonly statsManager: StatsManager;
  readonly currencyService: CurrencyService;
  readonly economyTransactionService: EconomyTransactionService;
  readonly vendorRegistry: VendorRegistry;
  readonly walletId: WalletId;
  readonly playerId: PlayerId;
  readonly worldCoordinator: WorldCoordinator;
  readonly useConsumable: (itemId: string) => boolean;
  readonly usePrimaryAbility: () => boolean;
  readonly setPrimaryAbilityAutoCast: (enabled: boolean) => void;
  readonly resumeExploration: () => boolean;
  readonly selectSegment: (segmentNumber: number) => boolean;
  readonly setSegmentFarmMode: (enabled: boolean) => void;
  readonly selectZone: (zoneNumber: number, segmentNumber?: number) => boolean;
  readonly returnToCombat: () => boolean;
  readonly toggleGathering: () => boolean;
  readonly performGatheringStrike: (
    resourceFamily: string,
    quality: "miss" | "correct" | "perfect",
  ) => boolean;
  readonly toggleOreGathering: () => boolean;
  readonly toggleHideGathering: () => boolean;
  readonly toggleFiberGathering: () => boolean;
  readonly toggleRefining: () => boolean;
  readonly toggleMetalRefining: () => boolean;
  readonly toggleLeatherRefining: () => boolean;
  readonly toggleClothRefining: () => boolean;
  readonly refineAllAvailable: () => boolean;
  readonly setProductionTier: (tier: 3 | 4) => boolean;
  readonly craftEquipment: (outputItemId: string) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (profession: WorkerProfessionVM) => boolean;
  readonly repairAll: () => boolean;
  readonly saveGame: () => void;
  readonly loadGame: () => boolean;
  readonly hasSave: () => boolean;
}


const GameServiceContext = createContext<GameServices | null>(null);

// -- Stat ids ---------------------------------------------------------------

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
export const HERO_BASE_ATTACK_SPEED = 1.2;

/** Internal refs for cleanup — not exposed to consumers. */
interface CleanupRef {
  _tickFn?: () => void;
  _tickInterval?: number;
  _disposeServices?: () => void;
  _persistence?: RuntimePersistence;
}

// -- Helper: collect repair preview data ------------------------------------

function collectRepairPreviewData(
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager,
  durabilityStore: DurabilityStore,
  repairCostResolver: RepairCostResolver,
  heroId: EntityId,
  stationModifier: number,
): { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] {
  const items: { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] = [];

  const addIfDamaged = (instanceId: string, itemId: string): void => {
    const durability = durabilityStore.get(instanceId as Parameters<typeof durabilityStore.get>[0]);
    if (durability === undefined || durability.current >= durability.max) {
      return;
    }
    const info = resolveRepairableInfo(itemId);
    if (info === undefined) {
      return;
    }
    const cost = repairCostResolver.resolveCost(
      info.equipmentCategory,
      info.itemTier,
      durability.current,
      durability.max,
      stationModifier,
    );
    items.push({
      instanceId,
      itemId,
      currentDurability: durability.current,
      maxDurability: durability.max,
      repairCost: cost.ok ? cost.value : 0,
    });
  };

  // Check equipped items
  for (const entry of equipmentManager.getEquipped(heroId).values()) {
    addIfDamaged(entry.instanceId, entry.itemId);
  }

  // Check inventory items
  for (const slot of inventoryManager.listSlots(heroId)) {
    if (slot.entry !== undefined) {
      addIfDamaged(slot.entry.instanceId, slot.entry.itemId);
    }
  }

  return items;
}

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
    let syncWeaponMasteryStats: ((entityId: EntityId) => void) | undefined;
    const equipmentStatSync = new EquipmentStatSync(
      statsManager,
      resolveEquipmentInfo,
      (entityId, changedStats) => {
        syncWeaponMasteryStats?.(entityId);
        if (
          changedStats.includes(STAT_MAX_HEALTH) &&
          world.hasComponent(entityId, HealthComponent)
        ) {
          damageManager.syncMaxHealth(entityId);
          const health = damageManager.getHealth(entityId);
          bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
        }
        if (
          changedStats.includes("stat_max_energy" as StatId) &&
          world.hasComponent(entityId, EnergyComponent)
        ) {
          abilityManager.syncMaxEnergy(entityId);
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

    /**
     * Rebuild the weapon-only damage granted by mastery IP.
     * +100 bonus IP = +20% of the weapon's own primary damage.
     * Hero base damage, attack speed and defensive stats are never scaled.
     */
    syncWeaponMasteryStats = (entityId: EntityId): void => {
      recalculateWeaponMasteryStats(
        statsManager,
        equipmentManager,
        masteryService,
        entityId,
      );
    };

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
    equipmentManager.attachEquipment(heroId);
    const enchantmentService = new EnchantmentService({
      inventoryManager,
      currencyService,
      walletId,
      inventoryOwnerId: heroId,
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
      heroId,
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
      heroId,
      getProductionTier: () => productionTier,
    });

    const craftingRuntime = new CraftingRuntime({
      inventoryManager,
      heroId,
      durabilityStore,
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });

    const workerRuntime = new WorkerRuntime({
      inventoryManager,
      heroId,
      currencyService,
      walletId,
      experienceService,
      getProductionTier: () => productionTier,
      getRequiredGatheringMasteryForTier,
    });

    // The starter sword unlocks its mastery and becomes the active Fame target.
    const starterSwordPosition = 0;
    const starterSword = inventoryManager.addEntry(
      heroId,
      "item_weapon_sword_t3_broadsword",
      starterSwordPosition,
    );
    if (starterSword.ok) {
      durabilityStore.attach(starterSword.value.instanceId, 100);
      equipmentManager.equipFromInventory(heroId, starterSwordPosition);
      masteryService.discoverMastery(SWORD_MASTERY_ID);
      masteryService.discoverMastery(BROADSWORD_MASTERY_ID);
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

    // --- Track income rate -------------------------------------------------------
    let lastSilver = 1000;
    let incomeRate = 0;

    // --- Helper: full bridge resync after any mutation ---------------------------
    const resyncAll = (): void => {
      syncWeaponMasteryStats?.(heroId);
      const pState = progressionOrchestrator.getFullProgressionState();
      syncAllToBridge(
        bridge, inventoryManager, equipmentManager, statsManager,
        currencyService, walletId, incomeRate, vendorRegistry, "vendor_general",
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

    combatService.events.subscribe("enemyKilled", () => {
      bridge.incrementEnemiesKilled();

      const encounterRewards = getEncounterRewards(
        worldRuntime.currentZoneIndex,
        worldRuntime.currentSegment,
        worldRuntime.currentEncounter,
      );

      const rewardResult = combatRewardRuntime.processEnemyKilledReward(
        encounterRewards.silver,
        encounterRewards.fame,
      );

      incomeRate = rewardResult.newBalance - lastSilver;
      lastSilver = rewardResult.newBalance;

      bridge.addTransaction({
        id: `loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "credit",
        description: `Loot: +${String(rewardResult.silverEarned)} Silver`,
        amount: rewardResult.silverEarned,
        timestamp: Date.now(),
      });
      bridge.addEconomyNotification({
        id: `notif_silver_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `+${String(rewardResult.silverEarned)} Silver from loot`,
        timestamp: Date.now(),
      });

      if (rewardResult.fameEarned !== undefined) {
        syncWeaponMasteryStats?.(heroId);
        syncStatsToBridge(bridge, statsManager, heroId);

        const masteryName = getMasteryDisplayName(rewardResult.fameEarned.weaponId);
        bridge.addEconomyNotification({
          id: `notif_fame_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
          type: "success",
          message: `+${String(rewardResult.fameEarned.amount)} Fame · ${masteryName}`,
          timestamp: Date.now(),
        });
      }

      if (rewardResult.equipmentDropped !== undefined) {
        const formattedName = rewardResult.equipmentDropped.itemId
          .replace("item_", "")
          .replace(/_/g, " ");
        bridge.addEconomyNotification({
          id: `notif_loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
          type: "success",
          message: `Loot: ${formattedName}`,
          timestamp: Date.now(),
        });
      }

      if (rewardResult.enchantmentMaterialDropped !== undefined) {
        const matId = rewardResult.enchantmentMaterialDropped.itemId;
        const matName = ENCHANTMENT_MATERIAL_NAMES[matId] ?? matId;
        bridge.addEconomyNotification({
          id: `notif_enchantment_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
          type: "success",
          message: `Rare : ${matName}`,
          timestamp: Date.now(),
        });
      }

      resyncAll();
    });

    // --- Persistence setup -------------------------------------------------------
    const persistence = new RuntimePersistence({
      inventoryManager,
      world,
      heroId,
      bankId,
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

    const syncGathering = (): void => {
      const recipe = getWoodRecipe(productionTier);
      syncGatheringToBridge(
        (vm) => { bridge.updateGathering(vm); },
        gatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(WOOD_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(WOOD_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Bois de pin" : "Bois de bouleau",
        "Wood",
        "resource_wood",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Wood").strikesUsed,
      );
    };

    const syncOreGathering = (): void => {
      const recipe = getMetalRecipe(productionTier);
      syncGatheringToBridge(
        (vm) => { bridge.updateOreGathering(vm); },
        oreGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(ORE_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(ORE_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Minerai de fer" : "Minerai de cuivre",
        "Ore",
        "resource_ore",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Ore").strikesUsed,
      );
    };

    const syncHideGathering = (): void => {
      const recipe = getLeatherRecipe(productionTier);
      syncGatheringToBridge(
        (vm) => { bridge.updateHideGathering(vm); },
        hideGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(HIDE_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(HIDE_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Peau épaisse" : "Peau robuste",
        "Hide",
        "resource_hide",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Hide").strikesUsed,
      );
    };

    const syncFiberGathering = (): void => {
      const recipe = getClothRecipe(productionTier);
      syncGatheringToBridge(
        (vm) => { bridge.updateFiberGathering(vm); },
        fiberGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(FIBER_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(FIBER_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Fibre fine" : "Fibre de lin",
        "Fiber",
        "resource_fiber",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Fiber").strikesUsed,
      );
    };

    const getHeroGatheringMasteryLevel = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number =>
      masteryService.getMasteryState(masteryId)?.level ?? 0;

    const getHeroGatheringMasteryModifier = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number =>
      Math.max(
        0.5,
        1 - Math.min(100, getHeroGatheringMasteryLevel(masteryId)) * 0.005,
      );

    const getHeroGatheringDurationTicks = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number => {
      const baseTicks = productionTier === 4 ? 36 : 24;
      const toolModifier = productionTier === 4 ? 0.85 : 1;
      return Math.max(
        1,
        Math.ceil(baseTicks * toolModifier * getHeroGatheringMasteryModifier(masteryId)),
      );
    };

    const syncMasteryProgression = (): void => {
      const state = progressionOrchestrator.getFullProgressionState();
      syncProgressionToBridge(
        bridge,
        state.totalFame,
        state.overflowPool,
        buildMasteryViewModels(state),
      );
    };

    const syncAllGathering = (): void => {
      syncGathering();
      syncOreGathering();
      syncHideGathering();
      syncFiberGathering();
    };

    const toggleGathering = (): boolean => {
      const res = gatheringRuntime.toggleGathering(tickCounter);
      if (res.action === "stopped") {
        syncAllGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncAllGathering();
        return true;
      }
      return false;
    };

    const returnToCombat = (): boolean => {
      if (gatheringRuntime.isHeroGathering()) {
        gatheringRuntime.stopAllGathering();
        syncAllGathering();
        bridge.setCombatState("walking");
        return true;
      }
      return false;
    };

    const toggleOreGathering = (): boolean => {
      const res = gatheringRuntime.toggleOreGathering(tickCounter);
      if (res.action === "stopped") {
        syncAllGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncAllGathering();
        return true;
      }
      return false;
    };

    const toggleHideGathering = (): boolean => {
      const res = gatheringRuntime.toggleHideGathering(tickCounter);
      if (res.action === "stopped") {
        syncAllGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncAllGathering();
        return true;
      }
      return false;
    };

    const toggleFiberGathering = (): boolean => {
      const res = gatheringRuntime.toggleFiberGathering(tickCounter);
      if (res.action === "stopped") {
        syncAllGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncAllGathering();
        return true;
      }
      return false;
    };

    const performGatheringStrike = (
      resourceFamily: string,
      quality: "miss" | "correct" | "perfect",
    ): boolean => {
      const res = gatheringRuntime.performGatheringStrike(
        resourceFamily as ResourceFamily,
        quality,
        tickCounter,
      );
      if (res.ok) {
        if (resourceFamily === "Wood") syncGathering();
        else if (resourceFamily === "Ore") syncOreGathering();
        else if (resourceFamily === "Hide") syncHideGathering();
        else syncFiberGathering();
        return true;
      }
      return false;
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

    const syncRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateRefining(vm); },
        refiningManager.getActiveSession(),
        tickCounter,
        getWoodRecipe(productionTier),
        refiningRuntime.getReservedInputs("Wood"),
        inventoryManager,
        heroId,
      );
    };

    const syncMetalRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateMetalRefining(vm); },
        metalRefiningManager.getActiveSession(),
        tickCounter,
        getMetalRecipe(productionTier),
        refiningRuntime.getReservedInputs("Ore"),
        inventoryManager,
        heroId,
      );
    };

    const syncLeatherRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateLeatherRefining(vm); },
        leatherRefiningManager.getActiveSession(),
        tickCounter,
        getLeatherRecipe(productionTier),
        refiningRuntime.getReservedInputs("Hide"),
        inventoryManager,
        heroId,
      );
    };

    const syncClothRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateClothRefining(vm); },
        clothRefiningManager.getActiveSession(),
        tickCounter,
        getClothRecipe(productionTier),
        refiningRuntime.getReservedInputs("Fiber"),
        inventoryManager,
        heroId,
      );
    };

    const toggleRefining = (): boolean => {
      const res = refiningRuntime.toggleRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncGathering();
      syncRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleMetalRefining = (): boolean => {
      const res = refiningRuntime.toggleMetalRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncOreGathering();
      syncMetalRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleLeatherRefining = (): boolean => {
      const res = refiningRuntime.toggleLeatherRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncHideGathering();
      syncLeatherRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleClothRefining = (): boolean => {
      const res = refiningRuntime.toggleClothRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncFiberGathering();
      syncClothRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const refineAllAvailable = (): boolean => {
      return refiningRuntime.refineAllAvailable(tickCounter).startedAtLeastOne;
    };

    syncRefining();
    syncMetalRefining();
    syncLeatherRefining();
    syncClothRefining();

    const syncCrafting = (): void => {
      syncCraftingToBridge(
        bridge,
        inventoryManager,
        heroId,
        productionTier,
        {
          woodItemId: getWoodRecipe(productionTier).outputItemId,
          metalItemId: getMetalRecipe(productionTier).outputItemId,
          leatherItemId: getLeatherRecipe(productionTier).outputItemId,
          clothItemId: getClothRecipe(productionTier).outputItemId,
        },
        getItemPower,
        EQUIPMENT_CRAFT_RECIPES,
      );
    };

    const craftEquipment = (outputItemId: string): boolean => {
      const res = craftingRuntime.craftEquipment(outputItemId);
      if (!res.ok) return false;

      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      bridge.addEconomyNotification({
        id: `notif_craft_${String(Date.now())}`,
        type: "success",
        message: `Fabriqué : ${res.recipeName} · ${String(res.itemPower)} IP`,
        timestamp: Date.now(),
      });
      return true;
    };

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

    const saveGame = (): void => {
      persistence.save(tickCounter);
      bridge.addEconomyNotification({
        id: `notif_save_${String(Date.now())}`,
        type: "success",
        message: "Game saved",
        timestamp: Date.now(),
      });
    };

    const loadGame = (): boolean => {
      if (!persistence.hasSave()) {
        return false;
      }
      persistence.load();

      // After load, re-read wallet balance
      const balResult = currencyService.getBalance(walletId, "currency_silver");
      lastSilver = balResult.ok ? balResult.value : 0;
      incomeRate = 0;

      // Re-sync health after load (stats may have changed)
      const hHealth = damageManager.getHealth(heroId);
      bridge.updatePlayerHealth(hHealth.currentHealth, hHealth.maxHealth);

      resyncAll();

      bridge.addEconomyNotification({
        id: `notif_load_${String(Date.now())}`,
        type: "success",
        message: "Game loaded",
        timestamp: Date.now(),
      });
      return true;
    };

    const hasSave = (): boolean => persistence.hasSave();

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
      abilityManager,
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

    // Store tick function, persistence, and disposal for useEffect
    (bridge as unknown as CleanupRef)._tickFn = tickFn;
    (bridge as unknown as CleanupRef)._tickInterval = TICK_INTERVAL;
    (bridge as unknown as CleanupRef)._persistence = persistence;
    (bridge as unknown as CleanupRef)._disposeServices = () => {
      orchestrator.dispose();
      progressionOrchestrator.dispose();
      worldCoordinator.dispose();
      gatheringCoordinator.dispose();
      oreGatheringCoordinator.dispose();
      hideGatheringCoordinator.dispose();
      fiberGatheringCoordinator.dispose();
    };

    const useConsumable = (itemId: string): boolean => {
      const result = consumableRuntime.useConsumable(itemId);
      if (!result.ok) {
        if (result.reason === "cooldown") {
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
            message: "Impossible à utiliser : ressource déjà pleine",
            timestamp: Date.now(),
          });
        }
        return false;
      }

      if (result.itemId === "item_health_potion") {
        syncConsumables();
        if (result.currentHealth !== undefined && result.maxHealth !== undefined) {
          bridge.updatePlayerHealth(result.currentHealth, result.maxHealth);
        }
      }
      const message = result.itemId === "item_health_potion"
        ? `Potion de soin : +${String(result.restored)} PV`
        : `Potion d'énergie : +${String(result.restored)} énergie`;
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      bridge.addEconomyNotification({
        id: `notif_consumable_${String(Date.now())}`,
        type: "success",
        message,
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
      eventBus, bridge, orchestrator, heroId, bankId, inventoryManager, equipmentManager,
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

  const initialLoadAttemptedRef = useRef(false);

  // Start tick loop and setup auto-load / auto-save persistence listeners
  useEffect(() => {
    const b = services.bridge as unknown as CleanupRef;
    const lifecycle = new RuntimeLifecycle();
    const persistence = b._persistence!;
    lifecycle.start(b._tickFn!, b._tickInterval);

    // Auto-load existing save once on startup after runtime services and providers are ready
    if (!initialLoadAttemptedRef.current) {
      initialLoadAttemptedRef.current = true;
      try {
        if (services.hasSave()) {
          const success = services.loadGame();
          if (!success) {
            persistence.setLoadFailed(true);
            console.error("[Persistence] Auto-load failed: save slot existed but load returned false");
          }
        }
      } catch (err) {
        persistence.setLoadFailed(true);
        console.error("[Persistence] Failed during initial save check or load:", err);
      }
    }

    const stopAutosave = persistence.startAutosave(() => services.saveGame());

    return () => {
      lifecycle.stop();
      stopAutosave();
      const dispose = b._disposeServices as (() => void) | undefined;
      if (dispose !== undefined) {
        dispose();
      }
    };
  }, [services]);

  return (
    <GameServiceContext.Provider value={services}>{children}</GameServiceContext.Provider>
  );
}

/**
 * Hook to access game services from any React component.
 */
export function useGameServices(): GameServices {
  const ctx = useContext(GameServiceContext);
  if (ctx === null) {
    throw new Error("useGameServices must be used within a GameProvider");
  }
  return ctx;
}

/**
 * Hook to subscribe to GameBridge state updates.
 */
export function useGameBridge(): GameBridgeState {
  const { bridge } = useGameServices();
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}
