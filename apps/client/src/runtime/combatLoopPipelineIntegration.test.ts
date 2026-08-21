import { afterEach, describe, expect, it } from "vitest";
import type { EquipmentManager, ZoneDefinitionId } from "@game/gameplay";
import { GameBridge } from "../game/GameBridge.js";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";
import { CombatBridgeAdapter } from "../state/bridge-sync/CombatBridgeAdapter.js";
import { WorldNavigationActions } from "../state/WorldNavigationActions.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { combatStopController } from "./CombatStopController.js";
import { GameRuntimeTickController } from "./GameRuntimeTickController.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation.js";
import { buildWorldViewModel, createWorldFoundation } from "./bootstrap/createWorldFoundation.js";

const BLUE_ZONE_IDS = [
  WORLD_ZONE_IDS.forest,
  WORLD_ZONE_IDS.swamp,
  WORLD_ZONE_IDS.highland,
  WORLD_ZONE_IDS.steppe,
  WORLD_ZONE_IDS.mountain,
] as const;

function createPipeline(zoneDefId: ZoneDefinitionId) {
  const combat = createCombatFoundation();
  const world = createWorldFoundation();
  const bridge = new GameBridge();

  if (zoneDefId === WORLD_ZONE_IDS.amberwood) {
    for (const blueZoneId of BLUE_ZONE_IDS) world.progressionManager.markCompleted(blueZoneId);
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
    activeZoneDefId: zoneDefId,
    activeSegment: 0,
    activeEncounter: 0,
    farmMode: false,
    zoneMemories: [{
      zoneDefId,
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

  const updateWorldBridge = (): void => {
    bridge.updateWorld(buildWorldViewModel(world));
  };
  updateWorldBridge();

  const adapter = new CombatBridgeAdapter({
    bridge,
    heroId,
    abilityManager: combat.abilityManager,
    damageManager: combat.damageManager,
    statsManager: combat.statsManager,
    combatRuntime,
    worldRuntime: world.worldRuntime,
    updateWorldBridge,
  });
  const unsubscribeDamage = adapter.bindDamageEvents(combat.damageEventBus);

  const navigation = new WorldNavigationActions({
    worldRuntime: world.worldRuntime,
    combatRuntime,
    bridge,
    updateWorldBridge,
  });

  let tick = 0;
  const scheduler = new GameRuntimeTickController({
    tickIntervalMs: 500,
    deltaSeconds: 0.5,
    advanceTick: () => {
      tick += 1;
      return tick;
    },
    tickConsumables: () => false,
    syncConsumables: () => {},
    tickProduction: () => {},
    syncActiveProduction: () => {},
    tickParallelProgression: () => {},
    isHeroGathering: () => false,
    presentGatheringState: () => {},
    syncProjectedSegmentRates: () => {},
    updateZoneElapsed: () => {},
    tickCombat: (dt, currentTick) => {
      adapter.presentTick(combatRuntime.tick(dt, currentTick));
    },
  });

  adapter.presentInitialCombat(combatRuntime.initialize());

  return {
    combat,
    world,
    bridge,
    heroId,
    combatRuntime,
    navigation,
    scheduler,
    dispose: unsubscribeDamage,
  };
}

function killHero(pipeline: ReturnType<typeof createPipeline>): void {
  const session = pipeline.combat.combatService.getActiveSession();
  const enemyId = session?.participants.enemies[0];
  if (enemyId === undefined) throw new Error("Expected active enemy before defeat");

  const heroHealth = pipeline.combat.damageManager.getHealth(pipeline.heroId);
  pipeline.combat.damageManager.processDamage({
    source: enemyId,
    target: pipeline.heroId,
    baseDamage: heroHealth.currentHealth + heroHealth.maxHealth,
    damageType: "true",
    source_type: "other",
  });
  pipeline.combat.deathManager.checkDeath(pipeline.heroId, enemyId, 1);
}

afterEach(() => {
  combatStopController.reset();
});

describe.each([
  ["Blue", WORLD_ZONE_IDS.forest],
  ["Yellow", WORLD_ZONE_IDS.amberwood],
] as const)("%s real combat pipeline", (_band, zoneDefId) => {
  it("runs defeat -> explicit resume -> replacement spawn through scheduler and bridge", () => {
    const pipeline = createPipeline(zoneDefId);
    try {
      expect(pipeline.bridge.combatState).toBe("combat");
      expect(pipeline.bridge.enemyEncounterKey.length).toBeGreaterThan(0);
      expect(pipeline.bridge.enemyMaxHealth).toBeGreaterThan(0);

      killHero(pipeline);
      pipeline.scheduler.tick();

      expect(pipeline.combatRuntime.getLoopState()).toBe("defeat");
      expect(pipeline.bridge.combatState).toBe("defeat");
      expect(pipeline.bridge.enemyEncounterKey).toBe("");
      expect(pipeline.bridge.enemyMaxHealth).toBe(0);

      expect(pipeline.navigation.resumeExploration()).toBe(true);
      expect(pipeline.combatRuntime.getLoopState()).toBe("idle");
      expect(pipeline.bridge.combatState).toBe("walking");

      pipeline.scheduler.tick();

      expect(pipeline.combatRuntime.getLoopState()).toBe("combat");
      expect(pipeline.combat.combatService.getActiveSession()).toBeDefined();
      expect(pipeline.bridge.combatState).toBe("combat");
      expect(pipeline.bridge.enemyEncounterKey.length).toBeGreaterThan(0);
      expect(pipeline.bridge.enemyName.length).toBeGreaterThan(0);
      expect(pipeline.bridge.enemyMaxHealth).toBeGreaterThan(0);
      expect(pipeline.bridge.enemyHealth).toBe(pipeline.bridge.enemyMaxHealth);
    } finally {
      pipeline.dispose();
    }
  });
});
