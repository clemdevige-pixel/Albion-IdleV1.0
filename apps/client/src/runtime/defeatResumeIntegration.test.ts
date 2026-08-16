import { afterEach, describe, expect, it } from "vitest";
import type { EquipmentManager } from "@game/gameplay";
import { GameBridge } from "../game/GameBridge.js";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";
import { WorldNavigationActions } from "../state/WorldNavigationActions.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { combatStopController } from "./CombatStopController.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation.js";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation.js";

const BLUE_ZONE_IDS = [
  WORLD_ZONE_IDS.forest,
  WORLD_ZONE_IDS.swamp,
  WORLD_ZONE_IDS.highland,
  WORLD_ZONE_IDS.steppe,
  WORLD_ZONE_IDS.mountain,
] as const;

function createScenario(zoneDefId: string) {
  const combat = createCombatFoundation();
  const world = createWorldFoundation();
  const bridge = new GameBridge();

  if (zoneDefId === WORLD_ZONE_IDS.amberwood) {
    for (const blueZoneId of BLUE_ZONE_IDS) {
      world.progressionManager.markCompleted(blueZoneId);
    }
  }

  const heroId = setupCombatEntity(
    {
      world: combat.world,
      statsManager: combat.statsManager,
      damageManager: combat.damageManager,
      deathManager: combat.deathManager,
      targetManager: combat.targetManager,
      autoAttackManager: combat.autoAttackManager,
      abilityManager: combat.abilityManager,
    },
    { maxHealth: 100, physDamage: 10, attackSpeed: 1.2, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );

  const equipmentManager = {
    getEquippedItem: () => ({ itemId: "item_weapon_sword_t3_broadsword" }),
  } as unknown as EquipmentManager;

  world.worldRuntime.setWorldLocationSaveState({
    activeZoneDefId: zoneDefId as never,
    activeSegment: 0,
    activeEncounter: 0,
    farmMode: false,
    zoneMemories: [{
      zoneDefId: zoneDefId as never,
      currentSegment: 0,
      currentEncounter: 0,
      highestUnlockedSegment: 2,
      completedSegments: [0, 1],
    }],
  });

  const combatRuntime = new CombatRuntime({
    world: combat.world,
    heroId,
    combatService: combat.combatService,
    orchestrator: combat.orchestrator,
    damageManager: combat.damageManager,
    deathManager: combat.deathManager,
    targetManager: combat.targetManager,
    autoAttackManager: combat.autoAttackManager,
    abilityManager: combat.abilityManager,
    effectManager: combat.effectManager,
    statsManager: combat.statsManager,
    equipmentManager,
    biomeResolver: world.biomeResolver,
    ports: {
      onVictory: () => world.worldRuntime.advanceVictory(),
      onDefeat: () => world.worldRuntime.advanceDefeat(),
      getLocationState: () => {
        const zone = world.worldRuntime.getActiveZoneDef();
        return {
          zoneIndex: world.worldRuntime.currentZoneIndex,
          segmentIndex: world.worldRuntime.currentSegment,
          encounterIndex: world.worldRuntime.currentEncounter,
          zoneDefId: zone.defId,
          zoneName: zone.name,
          highestUnlockedSegment: world.worldRuntime.highestUnlockedSegment,
          farmMode: world.worldRuntime.farmMode,
        };
      },
      isCombatSuspended: () => false,
    },
  });
  combatRuntime.setPrimaryAbilityAutoCast(false);

  const navigation = new WorldNavigationActions({
    worldRuntime: world.worldRuntime,
    combatRuntime,
    bridge,
    updateWorldBridge: () => {},
  });

  return { combat, world, bridge, heroId, combatRuntime, navigation };
}

function forceRealDefeat(
  scenario: ReturnType<typeof createScenario>,
  tick: number,
): void {
  const session = scenario.combat.combatService.getActiveSession();
  const enemyId = session?.participants.enemies[0];
  if (enemyId === undefined) throw new Error("Expected active enemy before forced defeat");

  const heroHealth = scenario.combat.damageManager.getHealth(scenario.heroId);
  scenario.combat.damageManager.processDamage({
    source: enemyId,
    target: scenario.heroId,
    baseDamage: heroHealth.currentHealth + heroHealth.maxHealth,
    damageType: "true",
    source_type: "other",
  });
  scenario.combat.deathManager.checkDeath(scenario.heroId, enemyId, tick);

  const defeat = scenario.combatRuntime.tick(0.5, tick);
  expect(defeat.combatState).toBe("defeat");
  expect(scenario.combatRuntime.getLoopState()).toBe("defeat");
  expect(scenario.combat.combatService.getActiveSession()).toBeUndefined();
}

function forceRealVictory(
  scenario: ReturnType<typeof createScenario>,
  tick: number,
): void {
  const session = scenario.combat.combatService.getActiveSession();
  const enemyId = session?.participants.enemies[0];
  if (enemyId === undefined) throw new Error("Expected active enemy before forced victory");

  const enemyHealth = scenario.combat.damageManager.getHealth(enemyId);
  scenario.combat.damageManager.processDamage({
    source: scenario.heroId,
    target: enemyId,
    baseDamage: enemyHealth.currentHealth + enemyHealth.maxHealth,
    damageType: "true",
    source_type: "other",
  });
  scenario.combat.deathManager.checkDeath(enemyId, scenario.heroId, tick);

  const victory = scenario.combatRuntime.tick(0.5, tick);
  expect(victory.combatState).toBe("victory");
  expect(scenario.combat.combatService.getActiveSession()).toBeUndefined();
}

afterEach(() => {
  combatStopController.reset();
});

describe.each([
  ["Blue", WORLD_ZONE_IDS.forest],
  ["Yellow", WORLD_ZONE_IDS.amberwood],
])("%s combat loop integration", (_band, zoneDefId) => {
  it("spawns a fresh encounter after real defeat -> segment change -> resume", () => {
    const scenario = createScenario(zoneDefId);

    const initial = scenario.combatRuntime.initialize();
    expect(initial.combatState).toBe("combat");
    expect(initial.spawnedEnemy).toBeDefined();
    expect(scenario.combatRuntime.getLoopState()).toBe("combat");

    forceRealDefeat(scenario, 1);

    expect(scenario.navigation.selectSegment(2)).toBe(true);
    expect(scenario.world.worldRuntime.currentSegment).toBe(1);
    expect(scenario.combatRuntime.getLoopState()).toBe("defeat");

    expect(scenario.navigation.resumeExploration()).toBe(true);
    expect(scenario.combatRuntime.isAwaitingResumeAfterDefeat()).toBe(false);
    expect(scenario.combatRuntime.getLoopState()).toBe("idle");

    const resumed = scenario.combatRuntime.tick(0.5, 2);
    expect(resumed.combatState).toBe("combat");
    expect(resumed.spawnedEnemy).toBeDefined();
    expect(scenario.combat.combatService.getActiveSession()).toBeDefined();
    expect(scenario.world.worldRuntime.currentSegment).toBe(1);
    expect(scenario.combatRuntime.getLoopState()).toBe("combat");
  });

  it("spawns a fresh encounter after real defeat -> resume on same segment", () => {
    const scenario = createScenario(zoneDefId);

    expect(scenario.combatRuntime.initialize().combatState).toBe("combat");
    forceRealDefeat(scenario, 1);

    expect(scenario.navigation.resumeExploration()).toBe(true);
    const resumed = scenario.combatRuntime.tick(0.5, 2);

    expect(resumed.combatState).toBe("combat");
    expect(resumed.spawnedEnemy).toBeDefined();
    expect(scenario.world.worldRuntime.currentSegment).toBe(0);
  });

  it("clears a pending segment stop when the hero dies", () => {
    const scenario = createScenario(zoneDefId);

    expect(scenario.combatRuntime.initialize().combatState).toBe("combat");
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(scenario.combatRuntime.getLoopState()).toBe("stop_requested");

    forceRealDefeat(scenario, 1);

    expect(combatStopController.getState()).toBe("running");
    expect(scenario.navigation.resumeExploration()).toBe(true);
    expect(scenario.combatRuntime.tick(0.5, 2).combatState).toBe("combat");
  });

  it("stops only after segment completion, allows paused travel, then resumes on the selected segment", () => {
    const scenario = createScenario(zoneDefId);
    let tick = 1;

    expect(scenario.combatRuntime.initialize().combatState).toBe("combat");
    expect(combatStopController.requestStopAfterSegment()).toBe(true);
    expect(scenario.combatRuntime.getLoopState()).toBe("stop_requested");

    for (let encounter = 0; encounter < 5; encounter += 1) {
      forceRealVictory(scenario, tick);
      tick += 1;
      if (encounter < 4) {
        const nextEncounter = scenario.combatRuntime.tick(0.5, tick);
        tick += 1;
        expect(nextEncounter.combatState).toBe("combat");
        expect(nextEncounter.spawnedEnemy).toBeDefined();
        expect(scenario.combatRuntime.getLoopState()).toBe("stop_requested");
      }
    }

    const paused = scenario.combatRuntime.tick(0.5, tick);
    tick += 1;
    expect(paused.combatState).toBe("idle");
    expect(scenario.combatRuntime.getLoopState()).toBe("paused");
    expect(scenario.world.worldRuntime.currentSegment).toBe(1);

    expect(scenario.navigation.selectSegment(1)).toBe(true);
    expect(scenario.world.worldRuntime.currentSegment).toBe(0);
    expect(combatStopController.resume()).toBe(true);

    const resumed = scenario.combatRuntime.tick(0.5, tick);
    expect(resumed.combatState).toBe("combat");
    expect(resumed.spawnedEnemy).toBeDefined();
    expect(scenario.world.worldRuntime.currentSegment).toBe(0);
    expect(scenario.combatRuntime.getLoopState()).toBe("combat");
  });
});
