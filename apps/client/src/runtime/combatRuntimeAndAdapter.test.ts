import { describe, it, expect } from "vitest";
import { World, EventBus, createRuntimeServices } from "@game/core";
import {
  CombatService,
  CombatOrchestrator,
  DamageManager,
  DeathManager,
  TargetValidator,
  TargetManager,
  AutoAttackManager,
  AbilityManager,
  EffectManager,
  StatsManager,
  createDefaultStatRegistry,
  InventoryManager,
  EquipmentManager,
  CurrencyRegistry,
  CurrencyService,
  ExperienceService,
  FameService,
  MasteryService,
  DestinyBoardService,
  ProgressionOrchestrator,
  DurabilityStore,
  EquipmentStatSync,
  BiomeRegistry,
  BiomeResolver,
  WorldProgressionManager,
  ZoneManager,
  ExplorationManager,
  WorldCoordinator,
  asWalletId,
  asPlayerId,
  asCombatSessionId,
  asZoneDefinitionId,
  type DamageEventMap,
  type WorldIntegrationEventMap,
} from "@game/gameplay";
import { GameBridge } from "../game/GameBridge.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { CombatRewardRuntime } from "./CombatRewardRuntime.js";
import { setupCombatRewardAdapter } from "./combatRewardAdapter.js";
import { WorldRuntime } from "./WorldRuntime.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog.js";
import {
  MASTERY_DEFINITIONS,
  DESTINY_NODES,
} from "../data/progressionContentCatalog.js";
import { recalculateWeaponMasteryStats } from "./weaponMasteryStatSync.js";

function createTestEnvironment() {
  const runtimeServices = createRuntimeServices();
  const world = new World(runtimeServices);
  const bridge = new GameBridge();

  const statRegistry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, statRegistry);
  const damageManager = new DamageManager(world, statsManager);
  const damageEventBus = new EventBus<DamageEventMap>();
  damageManager.setEventBus(damageEventBus);

  const deathManager = new DeathManager(world, damageManager);
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();

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

  const equipmentStatSync = new EquipmentStatSync(
    statsManager,
    resolveEquipmentInfo,
    () => {},
  );
  const inventoryManager = new InventoryManager(world, () => undefined);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({
    id: "currency_silver",
    enabled: true,
    minValue: 0,
    maxValue: null,
    acquisitionSources: ["Loot"],
    spendingSources: ["Vendor"],
  });
  const currencyService = new CurrencyService(currencyRegistry);
  const playerId = asPlayerId("player_1");
  const walletId = asWalletId("wallet_1");
  currencyService.createWallet(walletId, playerId);
  currencyService.credit(walletId, "currency_silver", 1000, "Loot");

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
  progressionOrchestrator.initialize({
    masteryDefinitions: MASTERY_DEFINITIONS,
    destinyNodes: DESTINY_NODES,
  });

  const durabilityStore = new DurabilityStore();

  const heroId = setupCombatEntity(
    {
      world,
      statsManager,
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      abilityManager,
    },
    {
      maxHealth: 100,
      physDamage: 50,
      attackSpeed: 2.0,
      armor: 0,
      magicRes: 0,
    },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 20);
  equipmentManager.attachEquipment(heroId);

  const biomeRegistry = new BiomeRegistry();
  const biomeResolver = new BiomeResolver(biomeRegistry);
  const zoneManager = new ZoneManager();
  const worldProgressionManager = new WorldProgressionManager();
  const explorationManager = new ExplorationManager();
  const worldCoordinator = new WorldCoordinator({
    zoneManager,
    progressionManager: worldProgressionManager,
    explorationManager,
    biomeRegistry,
    biomeResolver,
    eventBus: new EventBus<WorldIntegrationEventMap>(),
  });

  const worldRuntime = new WorldRuntime({
    zoneManager,
    progressionManager: worldProgressionManager,
    worldCoordinator,
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

  return {
    world,
    bridge,
    statsManager,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
    effectManager,
    combatService,
    orchestrator,
    inventoryManager,
    equipmentManager,
    currencyService,
    walletId,
    masteryService,
    heroId,
    worldRuntime,
    combatRewardRuntime,
  };
}

describe("combatRuntimeAndAdapter regression suite", () => {
  it("CombatRuntime same-tick victory", () => {
    const env = createTestEnvironment();

    const combatRuntime = new CombatRuntime({
      world: env.world,
      heroId: env.heroId,
      combatService: env.combatService,
      orchestrator: env.orchestrator,
      damageManager: env.damageManager,
      deathManager: env.deathManager,
      targetManager: env.targetManager,
      autoAttackManager: env.autoAttackManager,
      abilityManager: env.abilityManager,
      effectManager: env.effectManager,
      statsManager: env.statsManager,
      equipmentManager: env.equipmentManager,
      biomeResolver: new BiomeResolver(new BiomeRegistry()),
      ports: {
        onVictory: () => ({ enteredNewSegment: true }),
        onDefeat: () => {},
        isCombatSuspended: () => false,
        getLocationState: () => ({
          zoneIndex: 0,
          segmentIndex: 0,
          encounterIndex: 0,
          zoneDefId: asZoneDefinitionId("forest"),
          zoneName: "Forest",
          highestUnlockedSegment: 0,
          farmMode: false,
        }),
      },
    });

    // 1. Initial tick to spawn enemy
    const firstTick = combatRuntime.tick(0.5, 1);
    expect(firstTick.combatState).toBe("combat");

    const session = env.combatService.getActiveSession();
    expect(session).toBeDefined();

    // 2. Reduce active enemy health to 5 HP so next auto-attack hit is lethal
    const enemies = session?.participants.enemies;
    if (enemies !== undefined && enemies[0] !== undefined) {
      env.damageManager.getHealth(enemies[0]).currentHealth = 5;
    }

    // 3. Tick combat: hero auto-attack (50 damage) kills enemy and same-tick victory is returned
    const tickResult = combatRuntime.tick(0.5, 2);
    expect(tickResult.combatState).toBe("victory");
  });

  it("combatRewardAdapter reward execution", () => {
    const env = createTestEnvironment();

    const adapter = setupCombatRewardAdapter({
      combatService: env.combatService,
      combatRewardRuntime: env.combatRewardRuntime,
      worldRuntime: env.worldRuntime,
      bridge: env.bridge,
      statsManager: env.statsManager,
      heroId: env.heroId,
      recalculateWeaponMasteryStats: () =>
        recalculateWeaponMasteryStats(
          env.statsManager,
          env.equipmentManager,
          env.masteryService,
          env.heroId,
        ),
      resyncAll: () => {},
    });

    const initialKills = env.bridge.enemiesKilled;
    const initialTransactions = env.bridge.transactionHistory.length;

    // Publish enemyKilled event once
    env.combatService.events.publish("enemyKilled", {
      sessionId: asCombatSessionId("test_session"),
      entityId: env.heroId,
    });

    expect(env.bridge.enemiesKilled).toBe(initialKills + 1);
    expect(env.bridge.transactionHistory.length).toBe(initialTransactions + 1);
    expect(adapter.getIncomeRate()).toBeGreaterThan(0);
  });

  it("combatRewardAdapter subscription lifecycle", () => {
    const env = createTestEnvironment();

    const adapter = setupCombatRewardAdapter({
      combatService: env.combatService,
      combatRewardRuntime: env.combatRewardRuntime,
      worldRuntime: env.worldRuntime,
      bridge: env.bridge,
      statsManager: env.statsManager,
      heroId: env.heroId,
      recalculateWeaponMasteryStats: () => {},
      resyncAll: () => {},
    });

    // Simulate external UI cleanup pass (without disposing adapter)
    const initialKills = env.bridge.enemiesKilled;

    // Verify subscriber on surviving combatService instance remains functional
    env.combatService.events.publish("enemyKilled", {
      sessionId: asCombatSessionId("test_session_2"),
      entityId: env.heroId,
    });

    expect(env.bridge.enemiesKilled).toBe(initialKills + 1);

    // Explicit disposal when service lifecycle ends
    adapter.dispose();
    env.combatService.events.publish("enemyKilled", {
      sessionId: asCombatSessionId("test_session_3"),
      entityId: env.heroId,
    });
    // Kills count should not increment after adapter disposal
    expect(env.bridge.enemiesKilled).toBe(initialKills + 1);
  });

  it("resetSilverBalance baseline", () => {
    const env = createTestEnvironment();

    const adapter = setupCombatRewardAdapter({
      combatService: env.combatService,
      combatRewardRuntime: env.combatRewardRuntime,
      worldRuntime: env.worldRuntime,
      bridge: env.bridge,
      statsManager: env.statsManager,
      heroId: env.heroId,
      recalculateWeaponMasteryStats: () => {},
      resyncAll: () => {},
    });

    // 1. Reset baseline to restored save balance (1500 silver)
    adapter.resetSilverBalance(1500);
    expect(adapter.getLastSilver()).toBe(1500);
    expect(adapter.getIncomeRate()).toBe(0);

    // 2. Set currency balance to 1500 to match restored save state
    env.currencyService.credit(env.walletId, "currency_silver", 500, "Loot");

    // 3. Trigger enemyKilled reward event
    env.combatService.events.publish("enemyKilled", {
      sessionId: asCombatSessionId("test_session_4"),
      entityId: env.heroId,
    });

    // Reward for zone 0 / segment 0 is 10 silver
    expect(adapter.getIncomeRate()).toBe(10);
    expect(adapter.getLastSilver()).toBe(1510);
  });
});
