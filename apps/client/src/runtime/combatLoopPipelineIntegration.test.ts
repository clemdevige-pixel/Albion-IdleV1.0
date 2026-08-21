import { describe, expect, it } from "vitest";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation";
import { createWorldFoundation, buildWorldViewModel } from "./bootstrap/createWorldFoundation";
import { setupCombatEntity } from "./combatEntityFactory";
import { CombatRuntime } from "./CombatRuntime";
import { GameBridge } from "../game/GameBridge";
import { CombatBridgeAdapter } from "../state/bridge-sync/CombatBridgeAdapter";
import { WorldNavigationActions } from "../state/WorldNavigationActions";
import { GameRuntimeTickController } from "./GameRuntimeTickController";

function createHarness() {
  const combat = createCombatFoundation();
  const world = createWorldFoundation();
  const bridge = new GameBridge();

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
    { maxHealth: 300, physDamage: 75, attackSpeed: 1.2, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );

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
    dispose: () => {
      unsubscribeDamage();
      combat.orchestrator.dispose();
      world.worldCoordinator.dispose();
    },
  };
}

describe("combat loop pipeline integration", () => {
  it("routes a combat tick through the bridge adapter", () => {
    const harness = createHarness();
    try {
      harness.scheduler.tick();
      expect(harness.bridge.getState().combat).toBeDefined();
    } finally {
      harness.dispose();
    }
  });

  it("keeps navigation actions compatible with the combat runtime", () => {
    const harness = createHarness();
    try {
      expect(harness.navigation.selectSegment(1)).toBe(true);
    } finally {
      harness.dispose();
    }
  });
});
