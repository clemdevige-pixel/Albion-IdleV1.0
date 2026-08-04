import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices, Mulberry32Rng } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { MonsterRepository } from "../../monsters/monster-repository.js";
import { MonsterFactory } from "../../monsters/monster-factory.js";
import { MonsterRuntime } from "../../monsters/monster-runtime.js";
import { asMonsterDefinitionId, asMonsterInstanceId } from "../../monsters/types.js";
import type { MonsterDefinition } from "../../monsters/types.js";
import { MonsterSpawnManager } from "../../monster-spawn/monster-spawn-manager.js";
import { asSpawnPointId, asSpawnGroupId } from "../../monster-spawn/spawn-types.js";
import type { SpawnPointConfig, SpawnGroupConfig } from "../../monster-spawn/spawn-types.js";
import { MonsterAIController } from "../../monster-ai/monster-ai-controller.js";
import { DamageManager } from "../../damage/damage-manager.js";
import { DeathManager } from "../../death/death-manager.js";
import { LootGenerator } from "../../death/loot-generator.js";
import { LootManager } from "../../death/loot-manager.js";
import { LootTransferService } from "../../death/loot-transfer.js";
import type { LootTableLike } from "../../death/types.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { EffectManager } from "../../effects/effect-manager.js";
import { AutoAttackManager } from "../../auto-attack/auto-attack-manager.js";
import { TargetManager } from "../../targeting/target-manager.js";
import { TargetValidator } from "../../targeting/target-validator.js";
import { AbilityManager } from "../../abilities/ability-manager.js";
import { CombatService } from "../../combat/combat-service.js";
import { ExperienceService } from "../../experience/experience-service.js";
import { FameService } from "../../fame/fame-service.js";
import { MasteryService } from "../../mastery/mastery-service.js";
import { DestinyBoardService } from "../../destiny-board/destiny-board-service.js";
import { ProgressionOrchestrator } from "../../progression/progression-orchestrator.js";
import { asMasteryId } from "../../experience/types.js";
import { MonsterIntegrationCoordinator } from "../monster-integration-coordinator.js";
import type {
  MonsterKillProcessedEvent,
  MonsterLootAwardedEvent,
  MonsterFameAwardedEvent,
  MonsterDespawnProcessedEvent,
  MonsterLifecycleCompleteEvent,
} from "../types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HEALTH = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const ATTACK_SPEED = "stat_attack_speed" as StatId;
const COMBAT_MASTERY = asMasteryId("mastery_combat");
const MON_DEF_ID = asMonsterDefinitionId("MON-SKELETON");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefinition(
  id: string = "MON-SKELETON",
  overrides: Partial<MonsterDefinition> = {},
): MonsterDefinition {
  return {
    id: asMonsterDefinitionId(id),
    name: "Skeleton Warrior",
    faction: "Undead",
    role: "Melee Fighter",
    tier: 4,
    baseStats: [
      { statId: MAX_HEALTH, baseValue: 50 },
      { statId: PHYSICAL_DAMAGE, baseValue: 10 },
      { statId: ATTACK_SPEED, baseValue: 1 },
    ],
    ...overrides,
  };
}

function makeLootTable(): LootTableLike {
  return {
    id: "loot_skeleton",
    entries: [
      { itemId: "bone_fragment", weight: 100, minQuantity: 1, maxQuantity: 3 },
    ],
    guaranteedDrops: ["silver_coin"],
    maxRolls: 1,
  };
}

function makeGroup(overrides: Partial<SpawnGroupConfig> = {}): SpawnGroupConfig {
  return {
    id: asSpawnGroupId("group-undead"),
    name: "Undead Group",
    populationCap: 5,
    ...overrides,
  };
}

function makePoint(overrides: Partial<SpawnPointConfig> = {}): SpawnPointConfig {
  return {
    id: asSpawnPointId("point-1"),
    definitionId: MON_DEF_ID,
    groupId: asSpawnGroupId("group-undead"),
    respawnDelayTicks: 3,
    enabled: true,
    ...overrides,
  };
}

interface TestContext {
  world: World;
  statsManager: StatsManager;
  repository: MonsterRepository;
  factory: MonsterFactory;
  runtime: MonsterRuntime;
  spawnManager: MonsterSpawnManager;
  aiController: MonsterAIController;
  damageManager: DamageManager;
  deathManager: DeathManager;
  lootManager: LootManager;
  lootTransfer: LootTransferService;
  inventoryManager: InventoryManager;
  effectManager: EffectManager;
  autoAttackManager: AutoAttackManager;
  targetManager: TargetManager;
  abilityManager: AbilityManager;
  combatService: CombatService;
  experienceService: ExperienceService;
  fameService: FameService;
  masteryService: MasteryService;
  destinyBoardService: DestinyBoardService;
  progressionOrchestrator: ProgressionOrchestrator;
  coordinator: MonsterIntegrationCoordinator;
  heroEntityId: EntityId;
}

function setupFullIntegration(): TestContext {
  const world = new World(createRuntimeServices());
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const rng = new Mulberry32Rng(42);

  // Monster subsystem
  const repository = new MonsterRepository();
  const factory = new MonsterFactory(world, statsManager, repository);
  const runtime = new MonsterRuntime(factory);
  const spawnManager = new MonsterSpawnManager(runtime);

  // Targeting
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);

  // Damage & Death
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);

  // Effects
  const effectManager = new EffectManager();

  // Auto-attack
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);

  // Abilities
  const abilityManager = new AbilityManager(world, statsManager);

  // AI Controller
  const aiController = new MonsterAIController({
    deathManager,
    effectManager,
    abilityManager,
    autoAttackManager,
    targetManager,
  });

  // Combat
  const combatService = new CombatService(
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    statsManager,
  );

  // Loot
  const lootGenerator = new LootGenerator(rng);
  const lootManager = new LootManager(lootGenerator);
  const inventoryManager = new InventoryManager(world);
  const lootTransfer = new LootTransferService(inventoryManager);

  // Progression
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

  // Register mastery definitions
  progressionOrchestrator.initialize({
    masteryDefinitions: [
      {
        id: "mastery_combat",
        category: "combat",
        maxLevel: 10,
        experiencePerLevel: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
      },
    ],
    destinyNodes: [],
  });

  // Register monster definition
  repository.register(makeDefinition());

  // Create hero entity with full components
  const heroEntityId = world.createEntity();
  statsManager.attachStats(heroEntityId);
  statsManager.setBaseStat(heroEntityId, MAX_HEALTH, 1000);
  statsManager.setBaseStat(heroEntityId, PHYSICAL_DAMAGE, 100);
  statsManager.setBaseStat(heroEntityId, ATTACK_SPEED, 1);
  damageManager.attachHealth(heroEntityId);
  deathManager.attachDeath(heroEntityId);
  targetManager.attachTargeting(heroEntityId);
  autoAttackManager.attachAutoAttack(heroEntityId);
  inventoryManager.createInventory(heroEntityId, 20);

  // Create the integration coordinator
  const coordinator = new MonsterIntegrationCoordinator({
    monsterRuntime: runtime,
    monsterAI: aiController,
    spawnManager,
    combatService,
    deathManager,
    lootManager,
    lootTransfer,
    progressionOrchestrator,
    targetManager,
  });

  coordinator.setHeroEntity(heroEntityId);
  coordinator.registerLootTable(MON_DEF_ID, makeLootTable());
  coordinator.registerRewardConfig(MON_DEF_ID, {
    fameAmount: 50,
    targetMasteryId: COMBAT_MASTERY,
    category: "combat",
  });

  coordinator.initialize();

  return {
    world,
    statsManager,
    repository,
    factory,
    runtime,
    spawnManager,
    aiController,
    damageManager,
    deathManager,
    lootManager,
    lootTransfer,
    inventoryManager,
    effectManager,
    autoAttackManager,
    targetManager,
    abilityManager,
    combatService,
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
    progressionOrchestrator,
    coordinator,
    heroEntityId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MonsterIntegrationCoordinator", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupFullIntegration();
  });

  // ── Spawn → AI Registration ────────────────────────────────────────────

  describe("spawn integration", () => {
    it("registers spawned monster with AI controller", () => {
      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const entry = ctx.aiController.getEntry(spawnResult.value.instanceId);
      expect(entry).toBeDefined();
      expect(entry?.behaviorState).toBe("idle");
    });

    it("attaches death component on spawn", () => {
      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      // DeathManager.isDead should work (means component was attached)
      expect(ctx.deathManager.isDead(spawnResult.value.entityId)).toBe(false);
    });

    it("spawns via spawn manager on tick", () => {
      ctx.spawnManager.registerGroup(makeGroup());
      ctx.spawnManager.registerSpawnPoint(makePoint());

      const spawned = ctx.spawnManager.tick(0);
      expect(spawned).toBe(1);

      // AI should have one registered monster
      expect(ctx.aiController.registeredCount()).toBe(1);
    });
  });

  // ── Monster Death Pipeline ─────────────────────────────────────────────

  describe("death pipeline", () => {
    it("processes manual monster death with loot and fame", () => {
      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const instanceId = spawnResult.value.instanceId;

      // Track events
      const killEvents: MonsterKillProcessedEvent[] = [];
      const lootEvents: MonsterLootAwardedEvent[] = [];
      const fameEvents: MonsterFameAwardedEvent[] = [];
      const despawnEvents: MonsterDespawnProcessedEvent[] = [];

      ctx.coordinator.events.subscribe("monsterKillProcessed", (e) => killEvents.push(e));
      ctx.coordinator.events.subscribe("monsterLootAwarded", (e) => lootEvents.push(e));
      ctx.coordinator.events.subscribe("monsterFameAwarded", (e) => fameEvents.push(e));
      ctx.coordinator.events.subscribe("monsterDespawnProcessed", (e) => despawnEvents.push(e));

      const result = ctx.coordinator.processMonsterDeath(instanceId, ctx.heroEntityId);
      expect(result.ok).toBe(true);

      // Kill event fired
      expect(killEvents).toHaveLength(1);
      expect(killEvents[0]?.definitionId).toBe(MON_DEF_ID);
      expect(killEvents[0]?.killerEntityId).toBe(ctx.heroEntityId);

      // Loot awarded
      expect(lootEvents).toHaveLength(1);
      expect(lootEvents[0]?.receiverEntityId).toBe(ctx.heroEntityId);
      // Guaranteed drop should be present
      const allDrops = [
        ...lootEvents[0]!.loot.guaranteedDrops,
        ...lootEvents[0]!.loot.drops,
      ];
      expect(allDrops.some((d) => d.itemId === "silver_coin")).toBe(true);

      // Fame awarded
      expect(fameEvents).toHaveLength(1);
      expect(fameEvents[0]?.fame.fameAwarded).toBe(50);
      expect(fameEvents[0]?.fame.masteryId).toBe(COMBAT_MASTERY);

      // Despawn processed (transition: alive -> dead -> despawned)
      expect(despawnEvents).toHaveLength(1);
    });

    it("unregisters monster from AI on despawn", () => {
      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const instanceId = spawnResult.value.instanceId;
      expect(ctx.aiController.registeredCount()).toBe(1);

      ctx.coordinator.processMonsterDeath(instanceId);

      expect(ctx.aiController.registeredCount()).toBe(0);
    });

    it("returns error for non-existent monster", () => {
      const result = ctx.coordinator.processMonsterDeath(
        asMonsterInstanceId("nonexistent"),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("monster_not_found");
      }
    });
  });

  // ── Fame Accumulation ──────────────────────────────────────────────────

  describe("fame progression", () => {
    it("accumulates fame across multiple kills", () => {
      // Kill 3 monsters
      for (let i = 0; i < 3; i++) {
        const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
        expect(spawnResult.ok).toBe(true);
        if (!spawnResult.ok) return;
        ctx.coordinator.processMonsterDeath(spawnResult.value.instanceId);
      }

      // 3 kills * 50 fame = 150 total
      const totalFame = ctx.fameService.getTotalFameEarned(COMBAT_MASTERY);
      expect(totalFame).toBe(150);
    });

    it("levels up mastery when enough fame earned", () => {
      // Level 1 requires 100 XP. Kill 2 monsters (100 fame).
      for (let i = 0; i < 2; i++) {
        const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
        expect(spawnResult.ok).toBe(true);
        if (!spawnResult.ok) return;
        ctx.coordinator.processMonsterDeath(spawnResult.value.instanceId);
      }

      const progress = ctx.experienceService.getMasteryProgress(COMBAT_MASTERY);
      expect(progress).toBeDefined();
      expect(progress!.level).toBe(1);
    });
  });

  // ── Spawn → Death → Respawn Cycle ──────────────────────────────────────

  describe("full spawn-death-respawn cycle", () => {
    it("completes spawn → death → respawn timer → respawn", () => {
      ctx.spawnManager.registerGroup(makeGroup());
      ctx.spawnManager.registerSpawnPoint(makePoint({ respawnDelayTicks: 3 }));

      // Tick 0: initial spawn
      let spawned = ctx.spawnManager.tick(0);
      expect(spawned).toBe(1);
      expect(ctx.runtime.activeCount()).toBe(1);

      const instances = ctx.runtime.getAliveInstances();
      expect(instances).toHaveLength(1);
      const instanceId = instances[0]!.instanceId;

      // Kill the monster
      ctx.coordinator.processMonsterDeath(instanceId);
      expect(ctx.runtime.activeCount()).toBe(0);

      // Tick 1: pending respawn queued, timer starts
      spawned = ctx.spawnManager.tick(1);
      expect(spawned).toBe(0); // respawn timer just started

      // Tick 2, 3: still cooling down
      spawned = ctx.spawnManager.tick(2);
      expect(spawned).toBe(0);
      spawned = ctx.spawnManager.tick(3);
      expect(spawned).toBe(0);

      // Tick 4: respawn timer expired (started at tick 1, delay = 3)
      spawned = ctx.spawnManager.tick(4);
      expect(spawned).toBe(1);
      expect(ctx.runtime.activeCount()).toBe(1);

      // AI controller has the new monster registered
      expect(ctx.aiController.registeredCount()).toBe(1);
    });
  });

  // ── Lifecycle Complete Event ───────────────────────────────────────────

  describe("lifecycle complete event", () => {
    it("emits monsterLifecycleComplete after despawn", () => {
      const events: MonsterLifecycleCompleteEvent[] = [];
      ctx.coordinator.events.subscribe("monsterLifecycleComplete", (e) => events.push(e));

      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      ctx.coordinator.processMonsterDeath(spawnResult.value.instanceId);

      expect(events).toHaveLength(1);
      expect(events[0]?.definitionId).toBe(MON_DEF_ID);
    });
  });

  // ── No Loot Table / No Reward Config ───────────────────────────────────

  describe("missing configurations", () => {
    it("skips loot when no loot table registered", () => {
      const otherDefId = asMonsterDefinitionId("MON-GHOST");
      ctx.repository.register(makeDefinition("MON-GHOST", { name: "Ghost" }));
      // No loot table registered for MON-GHOST

      ctx.coordinator.registerRewardConfig(otherDefId, {
        fameAmount: 30,
        targetMasteryId: COMBAT_MASTERY,
        category: "combat",
      });

      const spawnResult = ctx.runtime.spawn(otherDefId);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const lootEvents: MonsterLootAwardedEvent[] = [];
      ctx.coordinator.events.subscribe("monsterLootAwarded", (e) => lootEvents.push(e));

      ctx.coordinator.processMonsterDeath(spawnResult.value.instanceId);

      // No loot event should fire
      expect(lootEvents).toHaveLength(0);
    });

    it("skips fame when no reward config registered", () => {
      const otherDefId = asMonsterDefinitionId("MON-WRAITH");
      ctx.repository.register(makeDefinition("MON-WRAITH", { name: "Wraith" }));
      // No reward config registered for MON-WRAITH

      ctx.coordinator.registerLootTable(otherDefId, makeLootTable());

      const spawnResult = ctx.runtime.spawn(otherDefId);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      const fameEvents: MonsterFameAwardedEvent[] = [];
      ctx.coordinator.events.subscribe("monsterFameAwarded", (e) => fameEvents.push(e));

      ctx.coordinator.processMonsterDeath(spawnResult.value.instanceId);

      expect(fameEvents).toHaveLength(0);
    });
  });

  // ── Dispose ────────────────────────────────────────────────────────────

  describe("dispose", () => {
    it("stops processing events after dispose", () => {
      ctx.coordinator.dispose();

      // Spawn a monster — AI registration should NOT happen
      const spawnResult = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawnResult.ok).toBe(true);
      if (!spawnResult.ok) return;

      // AI controller should have no entries
      expect(ctx.aiController.registeredCount()).toBe(0);
    });
  });

  // ── Multiple Monsters ─────────────────────────────────────────────────

  describe("multiple concurrent monsters", () => {
    it("handles multiple monsters independently", () => {
      const spawn1 = ctx.runtime.spawn(MON_DEF_ID);
      const spawn2 = ctx.runtime.spawn(MON_DEF_ID);
      expect(spawn1.ok).toBe(true);
      expect(spawn2.ok).toBe(true);
      if (!spawn1.ok || !spawn2.ok) return;

      expect(ctx.aiController.registeredCount()).toBe(2);

      // Kill first monster
      ctx.coordinator.processMonsterDeath(spawn1.value.instanceId);
      expect(ctx.aiController.registeredCount()).toBe(1);

      // Second monster still alive
      const instance2 = ctx.runtime.getInstance(spawn2.value.instanceId);
      expect(instance2.ok).toBe(true);
      if (instance2.ok) {
        expect(instance2.value.state).toBe("alive");
      }

      // Kill second monster
      ctx.coordinator.processMonsterDeath(spawn2.value.instanceId);
      expect(ctx.aiController.registeredCount()).toBe(0);

      // Total fame: 2 * 50 = 100
      expect(ctx.fameService.getTotalFameEarned(COMBAT_MASTERY)).toBe(100);
    });
  });
});
