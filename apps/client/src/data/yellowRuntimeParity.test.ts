import { describe, expect, it } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";
import { createCombatFoundation } from "../runtime/bootstrap/createCombatFoundation";
import { createWorldFoundation } from "../runtime/bootstrap/createWorldFoundation";
import { spawnEnemyForSegment } from "../runtime/combatEntityFactory";

const BLUE_ZONE_IDS = [
  WORLD_ZONE_IDS.forest,
  WORLD_ZONE_IDS.swamp,
  WORLD_ZONE_IDS.highland,
  WORLD_ZONE_IDS.steppe,
  WORLD_ZONE_IDS.mountain,
] as const;

function unlockYellow() {
  const foundation = createWorldFoundation();
  for (const zoneDefId of BLUE_ZONE_IDS) {
    foundation.progressionManager.markCompleted(zoneDefId);
  }
  return foundation;
}

function createLoadedYellowWorld(activeEncounter = 0) {
  const foundation = unlockYellow();
  const savedLocation = {
    activeZoneDefId: WORLD_ZONE_IDS.amberwood,
    activeSegment: 2,
    activeEncounter,
    farmMode: false,
    zoneMemories: [
      {
        zoneDefId: WORLD_ZONE_IDS.amberwood,
        currentSegment: 2,
        currentEncounter: activeEncounter,
        highestUnlockedSegment: 5,
        completedSegments: [0, 1],
      },
    ],
  } as unknown as WorldLocationSaveState;

  foundation.worldRuntime.setWorldLocationSaveState(savedLocation);
  return foundation;
}

describe("Yellow runtime parity", () => {
  it("applies a queued segment change after the current Yellow encounter completes", () => {
    const { worldRuntime } = createLoadedYellowWorld(0);

    expect(worldRuntime.queueSegmentChange(1)).toBe(true);
    expect(worldRuntime.currentSegment).toBe(2);
    expect(worldRuntime.pendingSegment).toBe(0);

    worldRuntime.advanceVictory();

    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingSegment).toBeNull();
  });

  it("applies a queued Yellow segment destination on defeat", () => {
    const { worldRuntime } = createLoadedYellowWorld(2);

    expect(worldRuntime.queueSegmentChange(1)).toBe(true);
    worldRuntime.advanceDefeat();

    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingSegment).toBeNull();
  });

  it("keeps cross-zone travel rules identical inside the Yellow band", () => {
    const foundation = createLoadedYellowWorld(0);
    const { worldRuntime, progressionManager } = foundation;
    progressionManager.markCompleted(WORLD_ZONE_IDS.amberwood);

    expect(worldRuntime.selectZone(7, 1)).toBe(true);
    expect(worldRuntime.pendingZone).toBe(6);

    worldRuntime.advanceVictory();

    expect(worldRuntime.currentZoneIndex).toBe(6);
    expect(worldRuntime.getActiveZoneDef().defId).toBe(WORLD_ZONE_IDS.gloamfen);
    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingZone).toBeNull();
  });

  it("spawns every Yellow encounter with a fresh authoritative health pool", () => {
    const combat = createCombatFoundation();
    const world = unlockYellow();
    const deps = {
      world: combat.world,
      statsManager: combat.statsManager,
      damageManager: combat.damageManager,
      deathManager: combat.deathManager,
      targetManager: combat.targetManager,
      autoAttackManager: combat.autoAttackManager,
      abilityManager: combat.abilityManager,
    };

    const first = spawnEnemyForSegment(deps, world.biomeResolver, {
      zoneIndex: 5,
      segmentIndex: 0,
      encounterIndex: 0,
      zoneDefId: WORLD_ZONE_IDS.amberwood,
      zoneName: "Amberwood Forest",
    });
    const firstHealth = combat.damageManager.getHealth(first.id);
    combat.damageManager.processDamage({
      source: first.id,
      target: first.id,
      baseDamage: Math.max(1, Math.floor(firstHealth.maxHealth / 2)),
      damageType: "true",
      source_type: "other",
    });

    const second = spawnEnemyForSegment(deps, world.biomeResolver, {
      zoneIndex: 5,
      segmentIndex: 0,
      encounterIndex: 1,
      zoneDefId: WORLD_ZONE_IDS.amberwood,
      zoneName: "Amberwood Forest",
    });
    const secondHealth = combat.damageManager.getHealth(second.id);

    expect(second.id).not.toBe(first.id);
    expect(secondHealth.currentHealth).toBe(secondHealth.maxHealth);
    expect(secondHealth.maxHealth).toBe(second.maxHealth);
  });
});
