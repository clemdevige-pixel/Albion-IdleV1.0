import { describe, expect, it, vi } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import { WorldNavigationActions } from "./WorldNavigationActions";

function createHarness(options?: {
  readonly segmentAccepted?: boolean;
  readonly zoneAccepted?: boolean;
  readonly explorationResumed?: boolean;
  readonly farmMode?: boolean;
}) {
  const savedLocation = {
    activeZoneDefId: "zone_forest",
    activeSegment: 2,
    activeEncounter: 3,
    farmMode: false,
    zoneMemories: [],
  } as unknown as WorldLocationSaveState;
  const worldRuntime = {
    farmMode: options?.farmMode ?? false,
    currentSegment: 2,
    highestUnlockedSegment: 5,
    selectSegment: vi.fn(() => true),
    queueSegmentChange: vi.fn(() => options?.segmentAccepted ?? true),
    setSegmentFarmMode: vi.fn(),
    selectZone: vi.fn(() => options?.zoneAccepted ?? true),
    getWorldLocationSaveState: vi.fn(() => savedLocation),
    setWorldLocationSaveState: vi.fn(),
  };
  const combatRuntime = {
    interruptEncounter: vi.fn(),
    restoreHeroHealth: vi.fn(),
    resumeExploration: vi.fn(() => options?.explorationResumed ?? true),
  };
  const bridge = { setCombatState: vi.fn(), clearEnemyPresentation: vi.fn() };
  const updateWorldBridge = vi.fn();
  const actions = new WorldNavigationActions({
    worldRuntime,
    combatRuntime,
    bridge: bridge as never,
    updateWorldBridge,
  });

  return { actions, worldRuntime, combatRuntime, bridge, updateWorldBridge, savedLocation };
}

describe("WorldNavigationActions", () => {
  it("queues an accepted manual segment change without interrupting combat", () => {
    const harness = createHarness();

    expect(harness.actions.selectSegment(4)).toBe(true);
    expect(harness.worldRuntime.queueSegmentChange).toHaveBeenCalledWith(4);
    expect(harness.worldRuntime.selectSegment).not.toHaveBeenCalled();
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.bridge.setCombatState).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("does not alter combat when a manual segment destination is rejected", () => {
    const harness = createHarness({ segmentAccepted: false });

    expect(harness.actions.selectSegment(9)).toBe(false);
    expect(harness.combatRuntime.interruptEncounter).not.toHaveBeenCalled();
    expect(harness.combatRuntime.restoreHeroHealth).not.toHaveBeenCalled();
    expect(harness.updateWorldBridge).not.toHaveBeenCalled();
  });

  it("coordinates accepted zone travel without owning unlock rules", () => {
    const harness = createHarness();

    expect(harness.actions.selectZone(3, 2)).toBe(true);
    expect(harness.worldRuntime.selectZone).toHaveBeenCalledWith(3, 2);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });

  it("always resumes gathering from the beginning of the segment that was left", () => {
    const progression = createHarness({ farmMode: false });
    progression.actions.prepareCombatResumeAfterGathering();
    expect(progression.worldRuntime.selectSegment).toHaveBeenCalledWith(3);

    const farming = createHarness({ farmMode: true });
    farming.actions.prepareCombatResumeAfterGathering();
    expect(farming.worldRuntime.selectSegment).toHaveBeenCalledWith(3);
  });

  it("restores saved location through authoritative runtimes", () => {
    const harness = createHarness();

    harness.actions.setWorldLocationSaveState(harness.savedLocation);

    expect(harness.worldRuntime.setWorldLocationSaveState)
      .toHaveBeenCalledWith(harness.savedLocation);
    expect(harness.combatRuntime.interruptEncounter).toHaveBeenCalledOnce();
    expect(harness.combatRuntime.restoreHeroHealth).toHaveBeenCalledOnce();
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
  });
});
