import { describe, it, expect } from "vitest";
import { asMonsterDefinitionId } from "../../monsters/types.js";
import { getReadySpawnPoints } from "../spawn-scheduler.js";
import type { SpawnPointConfig, SpawnPointState } from "../spawn-types.js";
import { asSpawnPointId, asSpawnGroupId } from "../spawn-types.js";

function makeConfig(
  id: string,
  overrides: Partial<SpawnPointConfig> = {},
): SpawnPointConfig {
  return {
    id: asSpawnPointId(id),
    definitionId: asMonsterDefinitionId("MON-001"),
    groupId: asSpawnGroupId("g-1"),
    respawnDelayTicks: 5,
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

describe("getReadySpawnPoints", () => {
  it("returns empty for no points", () => {
    const result = getReadySpawnPoints(new Map(), new Map(), 1);
    expect(result).toEqual([]);
  });

  it("returns unoccupied enabled points", () => {
    const configs = new Map([
      [asSpawnPointId("p1"), makeConfig("p1")],
      [asSpawnPointId("p2"), makeConfig("p2")],
    ]);
    const states = new Map([
      [asSpawnPointId("p1"), makeState()],
      [asSpawnPointId("p2"), makeState()],
    ]);
    const result = getReadySpawnPoints(configs, states, 1);
    expect(result).toHaveLength(2);
  });

  it("excludes disabled points", () => {
    const configs = new Map([
      [asSpawnPointId("p1"), makeConfig("p1", { enabled: false })],
    ]);
    const states = new Map([
      [asSpawnPointId("p1"), makeState()],
    ]);
    const result = getReadySpawnPoints(configs, states, 1);
    expect(result).toHaveLength(0);
  });

  it("excludes points with active cooldown", () => {
    const configs = new Map([
      [asSpawnPointId("p1"), makeConfig("p1", { respawnDelayTicks: 10 })],
    ]);
    const states = new Map([
      [asSpawnPointId("p1"), makeState({ respawnStartTick: 5 })],
    ]);
    // tick=10, elapsed=5, delay=10 → not ready
    const result = getReadySpawnPoints(configs, states, 10);
    expect(result).toHaveLength(0);
  });

  it("includes points with expired cooldown", () => {
    const configs = new Map([
      [asSpawnPointId("p1"), makeConfig("p1", { respawnDelayTicks: 5 })],
    ]);
    const states = new Map([
      [asSpawnPointId("p1"), makeState({ respawnStartTick: 5 })],
    ]);
    // tick=10, elapsed=5, delay=5 → ready
    const result = getReadySpawnPoints(configs, states, 10);
    expect(result).toHaveLength(1);
  });
});
