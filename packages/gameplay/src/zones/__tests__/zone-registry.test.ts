import { describe, it, expect, beforeEach } from "vitest";
import { ZoneRegistry } from "../zone-registry.js";
import type { ZoneDefinition } from "../zone-types.js";
import { asZoneDefinitionId } from "../zone-types.js";
import { asMonsterDefinitionId } from "../../monsters/types.js";
import { asSpawnGroupId } from "../../monster-spawn/spawn-types.js";

function makeDefinition(id: string, name?: string): ZoneDefinition {
  return {
    id: asZoneDefinitionId(id),
    name: name ?? `Zone ${id}`,
    tier: 3,
    monsterSpawns: [
      {
        definitionId: asMonsterDefinitionId("mob_wolf"),
        spawnGroupId: asSpawnGroupId("grp_wolves"),
        count: 3,
        respawnDelayTicks: 60,
      },
    ],
    tags: ["forest"],
  };
}

describe("ZoneRegistry", () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
  });

  it("registers and retrieves a definition", () => {
    const def = makeDefinition("zone_forest");
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asZoneDefinitionId("nope"))).toBeUndefined();
    expect(registry.has(asZoneDefinitionId("nope"))).toBe(false);
  });

  it("throws on duplicate registration", () => {
    const def = makeDefinition("zone_a");
    registry.register(def);
    expect(() => registry.register(def)).toThrow("already registered");
  });

  it("getAll returns all registered definitions", () => {
    registry.register(makeDefinition("a"));
    registry.register(makeDefinition("b"));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear removes all definitions", () => {
    registry.register(makeDefinition("x"));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});
