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
import { CLIENT_ABILITIES } from "../data/weaponContentCatalog.js";
import { getWeaponAttackSpeed } from "../data/itemPower.js";
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
          zoneDefId: WORLD_ZONE_IDS.forest,
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

  it("Weapon rebalance pass 1: verifies theoretical sustained DPS and cooldowns for T4 weapons", () => {
    // 1. Broadsword T4
    const broadswordStats = resolveEquipmentInfo("item_weapon_sword_t4_broadsword")!.stats!;
    const broadswordSpeed = getWeaponAttackSpeed("item_weapon_sword_t4_broadsword")!;
    const broadswordAutoDps = broadswordStats.stat_physical_damage! * broadswordSpeed;
    const broadswordAbility = CLIENT_ABILITIES["ability_sword_heroic_strike"]!;
    expect(broadswordAbility.cooldown).toBe(8);
    const broadswordAbilityDps = (broadswordStats.stat_physical_damage! * (1 + broadswordAbility.bonusDamageRatio)) / broadswordAbility.cooldown;
    const broadswordTotalDps = broadswordAutoDps + broadswordAbilityDps;
    expect(broadswordTotalDps).toBeCloseTo(106.41, 1);

    // 2. Longbow T4
    const longbowStats = resolveEquipmentInfo("item_weapon_bow_t4_longbow")!.stats!;
    const longbowSpeed = getWeaponAttackSpeed("item_weapon_bow_t4_longbow")!;
    const longbowAutoDps = longbowStats.stat_physical_damage! * longbowSpeed;
    const longbowAbility = CLIENT_ABILITIES["ability_bow_aimed_shot"]!;
    expect(longbowAbility.cooldown).toBe(5);
    const longbowAbilityDps = (longbowStats.stat_physical_damage! * (1 + longbowAbility.bonusDamageRatio)) / longbowAbility.cooldown;
    const longbowTotalDps = longbowAutoDps + longbowAbilityDps;
    expect(longbowTotalDps).toBeCloseTo(112.20, 1);

    // 3. Badon T4
    const badonStats = resolveEquipmentInfo("item_weapon_bow_t4_badon")!.stats!;
    const badonSpeed = getWeaponAttackSpeed("item_weapon_bow_t4_badon")!;
    const badonAutoDps = badonStats.stat_physical_damage! * badonSpeed;
    const badonAbility = CLIENT_ABILITIES["ability_bow_aimed_shot"]!;
    expect(badonAbility.cooldown).toBe(5);
    const badonAbilityDps = (badonStats.stat_physical_damage! * (1 + badonAbility.bonusDamageRatio)) / badonAbility.cooldown;
    const badonTotalDps = badonAutoDps + badonAbilityDps;
    expect(badonTotalDps).toBeCloseTo(114.84, 1);

    // 4. Spiked Gauntlets T4
    const gauntletsStats = resolveEquipmentInfo("item_weapon_gloves_t4_spiked_gauntlets")!.stats!;
    const gauntletsSpeed = getWeaponAttackSpeed("item_weapon_gloves_t4_spiked_gauntlets")!;
    const gauntletsAutoDps = gauntletsStats.stat_physical_damage! * gauntletsSpeed;
    const gauntletsAbility = CLIENT_ABILITIES["ability_gloves_shockwave"]!;
    expect(gauntletsAbility.cooldown).toBe(6);
    const gauntletsAbilityDps = (gauntletsStats.stat_physical_damage! * (1 + gauntletsAbility.bonusDamageRatio)) / gauntletsAbility.cooldown;
    const gauntletsTotalDps = gauntletsAutoDps + gauntletsAbilityDps;
    expect(gauntletsTotalDps).toBeCloseTo(112.20, 1);

    // 5. Fire Staff T4
    const fireStaffStats = resolveEquipmentInfo("item_weapon_staff_t4_infernal")!.stats!;
    const fireStaffSpeed = getWeaponAttackSpeed("item_weapon_staff_t4_infernal")!;
    const fireStaffAutoDps = fireStaffStats.stat_magical_damage! * fireStaffSpeed;
    const fireStaffAbility = CLIENT_ABILITIES["ability_fire_fireball"]!;
    expect(fireStaffAbility.cooldown).toBe(5);
    const fireStaffAbilityDps = (fireStaffStats.stat_magical_damage! * (1 + fireStaffAbility.bonusDamageRatio)) / fireStaffAbility.cooldown;
    const fireStaffTotalDps = fireStaffAutoDps + fireStaffAbilityDps;
    expect(fireStaffTotalDps).toBeCloseTo(111.60, 1);
  });

  it("Weapon rebalance data consistency check: resolveEquipmentInfo and getItemDefinition stats match", () => {
    const weaponIds = [
      "item_weapon_sword_t3_broadsword",
      "item_weapon_sword_t4_broadsword",
      "item_weapon_bow_t3_longbow",
      "item_weapon_bow_t4_longbow",
      "item_weapon_bow_t4_badon",
      "item_weapon_staff_t3_infernal",
      "item_weapon_staff_t4_infernal",
      "item_weapon_gloves_t3_spiked_gauntlets",
      "item_weapon_gloves_t4_spiked_gauntlets",
    ];

    for (const itemId of weaponIds) {
      const eqInfo = resolveEquipmentInfo(itemId);
      const itemDef = getItemDefinition(itemId);
      expect(eqInfo).toBeDefined();
      expect(itemDef).toBeDefined();

      if (eqInfo?.stats?.stat_physical_damage !== undefined) {
        expect(itemDef?.stats?.stat_physical_damage).toBe(eqInfo.stats.stat_physical_damage);
      }
      if (eqInfo?.stats?.stat_magical_damage !== undefined) {
        expect(itemDef?.stats?.stat_magical_damage).toBe(eqInfo.stats.stat_magical_damage);
      }
    }
  });
});
