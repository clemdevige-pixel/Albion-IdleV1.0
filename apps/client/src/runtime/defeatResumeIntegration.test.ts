import { describe, expect, it } from "vitest";
import type { EquipmentManager } from "@game/gameplay";
import { GameBridge } from "../game/GameBridge.js";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";
import { WorldNavigationActions } from "../state/WorldNavigationActions.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation.js";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation.js";

describe("defeat travel resume integration", () => {
  it("spawns a fresh encounter after defeat -> segment change -> resume", () => {
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
      { maxHealth: 100, physDamage: 50, attackSpeed: 1.2, armor: 0, magicRes: 0 },
      { x: 0, y: 0 },
    );

    const equipmentManager = {
      getEquippedItem: () => ({ itemId: "item_weapon_sword_t3_broadsword" }),
    } as unknown as EquipmentManager;

    world.worldRuntime.setWorldLocationSaveState({
      activeZoneDefId: WORLD_ZONE_IDS.forest,
      activeSegment: 0,
      activeEncounter: 0,
      farmMode: false,
      zoneMemories: [{
        zoneDefId: WORLD_ZONE_IDS.forest,
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

    const initial = combatRuntime.initialize();
    expect(initial.combatState).toBe("combat");
    expect(initial.spawnedEnemy).toBeDefined();

    combatRuntime.interruptEncounter();
    combatRuntime.restoreAwaitingResumeAfterDefeat();
    bridge.setCombatState("defeat");

    const navigation = new WorldNavigationActions({
      worldRuntime: world.worldRuntime,
      combatRuntime,
      bridge,
      updateWorldBridge: () => {},
    });

    expect(navigation.selectSegment(2)).toBe(true);
    expect(world.worldRuntime.currentSegment).toBe(1);
    expect(combatRuntime.isAwaitingResumeAfterDefeat()).toBe(true);

    expect(navigation.resumeExploration()).toBe(true);
    expect(combatRuntime.isAwaitingResumeAfterDefeat()).toBe(false);

    const resumed = combatRuntime.tick(0.5, 1);
    expect(resumed.combatState).toBe("combat");
    expect(resumed.spawnedEnemy).toBeDefined();
    expect(combat.combatService.getActiveSession()).toBeDefined();
    expect(world.worldRuntime.currentSegment).toBe(1);
  });
});
