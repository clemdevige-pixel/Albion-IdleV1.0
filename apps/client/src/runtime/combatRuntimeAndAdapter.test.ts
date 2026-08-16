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
import { getItemDefinition } from "../panels/ItemVisual.js";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";
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

  const orchestrator = new CombatOrchestrator({ combatService, effectManager, abilityManager });
  orchestrator.initialize();

  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo, () => {});
  const inventoryManager = new InventoryManager(world, () => undefined);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({ id: "currency_silver", enabled: true, minValue: 0, maxValue: null, acquisitionSources: ["Loot"], spendingSources: ["Vendor"] });
  const currencyService = new CurrencyService(currencyRegistry);
  const playerId = asPlayerId("player_1");
  const walletId = asWalletId("wallet_1");
  currencyService.createWallet(walletId, playerId);
  currencyService.credit(walletId, "currency_silver", 1000, "Loot");

  const experienceService = new ExperienceService();
  const fameService = new FameService(experienceService);
  const masteryService = new MasteryService(experienceService);
  const destinyBoardService = new DestinyBoardService(experienceService);
  const progressionOrchestrator = new ProgressionOrchestrator(experienceService, fameService, masteryService, destinyBoardService);
  progressionOrchestrator.initialize({ masteryDefinitions: MASTERY_DEFINITIONS, destinyNodes: DESTINY_NODES });

  const durabilityStore = new DurabilityStore();
  const heroId = setupCombatEntity(
    { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
    { maxHealth: 100, physDamage: 50, attackSpeed: 2.0, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 20);
  equipmentManager.attachEquipment(heroId);
  const starterWeaponId = "item_weapon_sword_t3_broadsword";
  const addedStarter = inventoryManager.addQuantity(heroId, starterWeaponId, 1, { itemId: starterWeaponId, stackable: false, maxStack: 1 });
  if (!addedStarter.ok || addedStarter.value.remainder !== 0) throw new Error("Failed to seed starter weapon for combat regression test");
  const equippedStarter = equipmentManager.equipFromInventory(heroId, 0);
  if (!equippedStarter.ok) throw new Error("Failed to equip starter weapon for combat regression test");

  const biomeRegistry = new BiomeRegistry();
  const biomeResolver = new BiomeResolver(biomeRegistry);
  const zoneManager = new ZoneManager();
  const worldProgressionManager = new WorldProgressionManager();
  const explorationManager = new ExplorationManager();
  const worldCoordinator = new WorldCoordinator({ zoneManager, progressionManager: worldProgressionManager, explorationManager, biomeRegistry, biomeResolver, eventBus: new EventBus<WorldIntegrationEventMap>() });

  const worldRuntime = new WorldRuntime({ zoneManager, progressionManager: worldProgressionManager, worldCoordinator });

  const combatRewardRuntime = new CombatRewardRuntime({ currencyService, walletId, equipmentManager, inventoryManager, durabilityStore, progressionOrchestrator, experienceService, heroId });

  return { world, bridge, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager, effectManager, combatService, orchestrator, inventoryManager, equipmentManager, currencyService, walletId, masteryService, heroId, worldRuntime, combatRewardRuntime };
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
        getLocationState: () => ({ zoneIndex: 0, segmentIndex: 0, encounterIndex: 0, zoneDefId: WORLD_ZONE_IDS.forest, zoneName: "Forest", highestUnlockedSegment: 0, farmMode: false }),
      },
    });

    const firstTick = combatRuntime.tick(0.5, 1);
    expect(firstTick.combatState).toBe("combat");

    const session = env.combatService.getActiveSession();
    expect(session).toBeDefined();

    const enemies = session?.participants.enemies;
    if (enemies !== undefined && enemies[0] !== undefined) env.damageManager.getHealth(enemies[0]).currentHealth = 5;

    const tickResult = combatRuntime.tick(0.5, 2);
    expect(tickResult.combatState).toBe("victory");
  });

  it("does not heal the hero when a farm loop completes without changing zone or segment", () => {
    const env = createTestEnvironment();
    let encounterIndex = 4;

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
        onVictory: () => {
          encounterIndex = 0;
          // WorldRuntime currently reports segment completion through this flag
          // even when Farm keeps the player on the same segment.
          return { enteredNewSegment: true };
        },
        onDefeat: () => {},
        isCombatSuspended: () => false,
        getLocationState: () => ({
          zoneIndex: 0,
          segmentIndex: 2,
          encounterIndex,
          zoneDefId: WORLD_ZONE_IDS.forest,
          zoneName: "Forest",
          highestUnlockedSegment: 2,
          farmMode: true,
        }),
      },
    });

    combatRuntime.tick(0.5, 1);
    const session = env.combatService.getActiveSession();
    const enemyId = session?.participants.enemies[0];
    if (enemyId === undefined) throw new Error("Expected active farm encounter");
    env.damageManager.getHealth(enemyId).currentHealth = 5;

    expect(combatRuntime.tick(0.5, 2).combatState).toBe("victory");
    env.damageManager.getHealth(env.heroId).currentHealth = 40;

    const nextEncounter = combatRuntime.tick(0.5, 3);
    expect(nextEncounter.playerHealth?.currentHealth).toBe(40);
    expect(nextEncounter.playerHealth?.maxHealth).toBe(100);
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
      recalculateWeaponMasteryStats: () => recalculateWeaponMasteryStats(env.statsManager, env.equipmentManager, env.masteryService, env.heroId),
      resyncAll: () => resyncAll(),
    });
    const sessionId = asCombatSessionId("combat_test");
    const before = env.currencyService.getBalance(env.walletId, "currency_silver");
    if (!before.ok) throw new Error("Wallet missing");
    env.combatService.events.publish("enemyKilled", { sessionId, entityId: env.heroId });
    const after = env.currencyService.getBalance(env.walletId, "currency_silver");
    if (!after.ok) throw new Error("Wallet missing");
    expect(after.value).toBeGreaterThan(before.value);
    adapter.dispose();
  });

  it("combatRewardAdapter subscription lifecycle", () => {
    const env = createTestEnvironment();
    const adapter = setupCombatRewardAdapter({ combatService: env.combatService, combatRewardRuntime: env.combatRewardRuntime, worldRuntime: env.worldRuntime, bridge: env.bridge, statsManager: env.statsManager, heroId: env.heroId, recalculateWeaponMasteryStats: () => {}, resyncAll: () => {} });
    adapter.dispose();
    const before = env.currencyService.getBalance(env.walletId, "currency_silver"); if (!before.ok) throw new Error("Wallet missing");
    env.combatService.events.publish("enemyKilled", { sessionId: asCombatSessionId("combat_test"), entityId: env.heroId });
    const after = env.currencyService.getBalance(env.walletId, "currency_silver"); if (!after.ok) throw new Error("Wallet missing");
    expect(after.value).toBe(before.value);
  });

  it("resetSilverBalance baseline", () => {
    const env = createTestEnvironment();
    const current = env.currencyService.getBalance(env.walletId, "currency_silver"); if (!current.ok) throw new Error("Wallet missing");
    expect(current.value).toBe(1000);
  });

  it("weapon presentation stats remain sourced from resolved equipment data", () => {
    const itemId = "item_weapon_sword_t3_broadsword";
    const visual = getItemDefinition(itemId);
    const resolved = resolveEquipmentInfo(itemId);
    expect(visual).toBeDefined();
    expect(resolved?.slot).toBe("weapon");
    expect(visual?.stats).toEqual(resolved?.stats);
  });
});
