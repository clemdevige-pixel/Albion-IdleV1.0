import { describe, it, expect } from "vitest";
import { asMonsterDefinitionId, asMonsterInstanceId } from "../../monsters/types.js";
import {
  startRespawnTimer,
  clearRespawnTimer,
  isRespawnReady,
  getRemainingCooldownTicks,
} from "../respawn-timer.js";
import type { SpawnPointConfig, SpawnPointState } from "../spawn-types.js";
import { asSpawnPointId, asSpawnGroupId } from "../spawn-types.js";

function makeConfig(delay: number = 10): SpawnPointConfig {
  return {
    id: asSpawnPointId("sp-1"),
    definitionId: asMonsterDefinitionId("MON-001"),
    groupId: asSpawnGroupId("g-1"),
    respawnDelayTicks: delay,
    enabled: true,
  };
}

function makeState(overrides: Partial<SpawnPointState> = {}): SpawnPointState {
  return {
    activeInstanceId: undefined,
    respawnStartTick: undefined,
    ...overrides,
  };
}

describe("startRespawnTimer", () => {
  it("clears activeInstanceId and sets respawnStartTick", () => {
    const state = makeState({ activeInstanceId: asMonsterInstanceId("m-1") });
    const result = startRespawnTimer(state, 42);
    expect(result.activeInstanceId).toBeUndefined();
    expect(result.respawnStartTick).toBe(42);
  });
});

describe("clearRespawnTimer", () => {
  it("clears respawnStartTick while preserving activeInstanceId", () => {
    const state = makeState({
      activeInstanceId: asMonsterInstanceId("m-1"),
      respawnStartTick: 10,
    });
    const result = clearRespawnTimer(state);
    expect(result.activeInstanceId).toBe(asMonsterInstanceId("m-1"));
    expect(result.respawnStartTick).toBeUndefined();
  });
});

describe("isRespawnReady", () => {
  it("returns true when unoccupied and no timer", () => {
    expect(isRespawnReady(makeState(), makeConfig(), 100)).toBe(true);
  });

  it("returns false when timer has not expired", () => {
    const state = makeState({ respawnStartTick: 10 });
    expect(isRespawnReady(state, makeConfig(5), 12)).toBe(false);
  });

  it("returns true when timer has expired", () => {
    const state = makeState({ respawnStartTick: 10 });
    expect(isRespawnReady(state, makeConfig(5), 15)).toBe(true);
  });
});

describe("getRemainingCooldownTicks", () => {
  it("returns 0 when no timer", () => {
    expect(getRemainingCooldownTicks(makeState(), makeConfig(), 100)).toBe(0);
  });

  it("returns remaining ticks", () => {
    const state = makeState({ respawnStartTick: 10 });
    expect(getRemainingCooldownTicks(state, makeConfig(5), 12)).toBe(3);
  });

  it("returns 0 when past due", () => {
    const state = makeState({ respawnStartTick: 10 });
    expect(getRemainingCooldownTicks(state, makeConfig(5), 20)).toBe(0);
  });
});
