import { describe, it, expect } from "vitest";
import { asMonsterDefinitionId, asMonsterInstanceId } from "../../monsters/types.js";
import {
  checkPointEnabled,
  checkPointUnoccupied,
  checkRespawnCooldown,
} from "../spawn-conditions.js";
import type { SpawnPointConfig, SpawnPointState } from "../spawn-types.js";
import { asSpawnPointId as asSPId, asSpawnGroupId as asSGId } from "../spawn-types.js";

function makeConfig(overrides: Partial<SpawnPointConfig> = {}): SpawnPointConfig {
  return {
    id: asSPId("sp-1"),
    definitionId: asMonsterDefinitionId("MON-001"),
    groupId: asSGId("g-1"),
    respawnDelayTicks: 10,
    enabled: true,
    ...overrides,
  };
}

function makeState(overrides: Partial<SpawnPointState> = {}): SpawnPointState {
  return {
    activeInstanceId: undefined,
    respawnStartTick: undefined,
    ...overrides,
  };
}

describe("checkPointEnabled", () => {
  it("returns ok when enabled", () => {
    expect(checkPointEnabled(makeConfig({ enabled: true }))).toEqual({ ok: true });
  });

  it("returns error when disabled", () => {
    const result = checkPointEnabled(makeConfig({ enabled: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("point_disabled");
  });
});

describe("checkPointUnoccupied", () => {
  it("returns ok when no active instance", () => {
    expect(checkPointUnoccupied(makeState())).toEqual({ ok: true });
  });

  it("returns error when occupied", () => {
    const result = checkPointUnoccupied(
      makeState({ activeInstanceId: asMonsterInstanceId("m-1") }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("point_occupied");
  });
});

describe("checkRespawnCooldown", () => {
  it("returns ok when no timer running", () => {
    expect(checkRespawnCooldown(makeState(), makeConfig(), 100)).toEqual({ ok: true });
  });

  it("returns ok when cooldown elapsed", () => {
    const state = makeState({ respawnStartTick: 5 });
    const config = makeConfig({ respawnDelayTicks: 10 });
    expect(checkRespawnCooldown(state, config, 15)).toEqual({ ok: true });
  });

  it("returns error during cooldown", () => {
    const state = makeState({ respawnStartTick: 5 });
    const config = makeConfig({ respawnDelayTicks: 10 });
    const result = checkRespawnCooldown(state, config, 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("respawn_cooldown");
  });
});
