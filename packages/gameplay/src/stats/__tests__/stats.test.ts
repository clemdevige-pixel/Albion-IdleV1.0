import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { StatRegistry, createDefaultStatRegistry } from "../stat-registry.js";
import { calculateStat } from "../stat-calculator.js";
import { StatContainer } from "../stat-container.js";
import { StatsManager } from "../stats-manager.js";
import type { StatId, ModifierId, ModifierType, StatDefinition, StatModifier } from "../types.js";

function sid(id: string): StatId {
  return id as StatId;
}

function mid(id: string): ModifierId {
  return id as ModifierId;
}

const TEST_DEF: StatDefinition = {
  id: sid("test_stat"),
  min: 0,
  max: 1000,
  defaultBase: 100,
};

function mod(overrides: { id: string; type: ModifierType; value: number; statId?: StatId; priority?: number; source?: string }): StatModifier {
  return {
    id: mid(overrides.id),
    statId: overrides.statId ?? TEST_DEF.id,
    type: overrides.type,
    value: overrides.value,
    priority: overrides.priority ?? 0,
    source: overrides.source ?? "test",
  };
}

describe("StatRegistry", () => {
  it("register, get, has, getAll", () => {
    const registry = new StatRegistry();
    expect(registry.has(TEST_DEF.id)).toBe(false);
    registry.register(TEST_DEF);
    expect(registry.has(TEST_DEF.id)).toBe(true);
    expect(registry.get(TEST_DEF.id)).toEqual(TEST_DEF);
    expect(registry.getAll()).toHaveLength(1);
  });

  it("throws on duplicate registration", () => {
    const registry = new StatRegistry();
    registry.register(TEST_DEF);
    expect(() => registry.register(TEST_DEF)).toThrow();
  });

  it("createDefaultStatRegistry registers the 12 authoritative combat stats", () => {
    const registry = createDefaultStatRegistry();
    expect(registry.getAll()).toHaveLength(12);
    expect(registry.has(sid("stat_max_health"))).toBe(true);
    expect(registry.has(sid("stat_physical_damage"))).toBe(true);
    expect(registry.has(sid("stat_magical_damage"))).toBe(true);
    expect(registry.has(sid("stat_armor"))).toBe(true);
    expect(registry.has(sid("stat_magic_resistance"))).toBe(true);
    expect(registry.has(sid("stat_attack_speed"))).toBe(true);
    expect(registry.has(sid("stat_move_speed"))).toBe(true);
    expect(registry.has(sid("stat_ability_power"))).toBe(true);
    expect(registry.has(sid("stat_cooldown_reduction"))).toBe(true);
    expect(registry.has(sid("stat_auto_attack_damage_bonus"))).toBe(true);
    expect(registry.has(sid("stat_auto_attack_damage_taken_bonus"))).toBe(true);
    expect(registry.has(sid("stat_life_steal"))).toBe(true);
  });
});

describe("calculateStat", () => {
  it("returns base clamped when no modifiers", () => {
    expect(calculateStat(50, [], TEST_DEF)).toBe(50);
  });

  it("clamps base below min", () => {
    expect(calculateStat(-10, [], TEST_DEF)).toBe(0);
  });

  it("clamps above max", () => {
    expect(calculateStat(2000, [], TEST_DEF)).toBe(1000);
  });

  it("sums flat modifiers", () => {
    const mods = [
      mod({ id: "f1", type: "flat", value: 10 }),
      mod({ id: "f2", type: "flat", value: 20 }),
    ];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(130);
  });

  it("applies percent after flat", () => {
    const mods = [
      mod({ id: "f1", type: "flat", value: 50 }),
      mod({ id: "p1", type: "percent", value: 50 }),
    ];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(225);
  });

  it("sums percent modifiers and applies once", () => {
    const mods = [
      mod({ id: "p1", type: "percent", value: 20 }),
      mod({ id: "p2", type: "percent", value: 30 }),
    ];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(150);
  });

  it("applies multipliers sequentially after percent", () => {
    const mods = [
      mod({ id: "m1", type: "multiplier", value: 2, priority: 0 }),
      mod({ id: "m2", type: "multiplier", value: 1.5, priority: 1 }),
    ];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(300);
  });

  it("combines flat+percent+multiplier in correct order", () => {
    const mods = [
      mod({ id: "f1", type: "flat", value: 20 }),
      mod({ id: "p1", type: "percent", value: 50 }),
      mod({ id: "m1", type: "multiplier", value: 2 }),
    ];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(360);
  });

  it("clamps final result to min/max", () => {
    const mods = [mod({ id: "m1", type: "multiplier", value: 100 })];
    expect(calculateStat(100, mods, TEST_DEF)).toBe(1000);
  });

  it("is deterministic — same inputs produce same output", () => {
    const mods = [
      mod({ id: "f1", type: "flat", value: 10 }),
      mod({ id: "p1", type: "percent", value: 25 }),
      mod({ id: "m1", type: "multiplier", value: 1.1 }),
    ];
    const expected = calculateStat(100, mods, TEST_DEF);
    for (let i = 0; i < 100; i++) {
      expect(calculateStat(100, mods, TEST_DEF)).toBe(expected);
    }
  });
});

describe("StatContainer", () => {
  let registry: StatRegistry;
  let container: StatContainer;

  beforeEach(() => {
    registry = new StatRegistry();
    registry.register(TEST_DEF);
    container = new StatContainer(registry);
  });

  it("initializes with default base and computed", () => {
    const stat = container.getStat(TEST_DEF.id);
    expect(stat.base).toBe(100);
    expect(stat.computed).toBe(100);
  });

  it("setBase updates computed", () => {
    container.setBase(TEST_DEF.id, 200);
    expect(container.getBase(TEST_DEF.id)).toBe(200);
    expect(container.getComputed(TEST_DEF.id)).toBe(200);
  });

  it("add/remove modifier recalculates", () => {
    const m = mod({ id: "f1", type: "flat", value: 50 });
    container.addModifier(m);
    expect(container.getComputed(TEST_DEF.id)).toBe(150);
    expect(container.hasModifier(mid("f1"))).toBe(true);
    container.removeModifier(mid("f1"));
    expect(container.hasModifier(mid("f1"))).toBe(false);
    expect(container.getComputed(TEST_DEF.id)).toBe(100);
  });

  it("removeModifier returns false for unknown id", () => {
    expect(container.removeModifier(mid("nonexistent"))).toBe(false);
  });

  it("getModifiers filters by statId", () => {
    const m = mod({ id: "f1", type: "flat", value: 10 });
    container.addModifier(m);
    expect(container.getModifiers(TEST_DEF.id)).toHaveLength(1);
    expect(container.getModifiers(sid("other"))).toHaveLength(0);
    expect(container.getModifiers()).toHaveLength(1);
  });

  it("clearModifiers removes all", () => {
    container.addModifier(mod({ id: "f1", type: "flat", value: 10 }));
    container.addModifier(mod({ id: "f2", type: "flat", value: 20 }));
    container.clearModifiers();
    expect(container.getModifiers()).toHaveLength(0);
    expect(container.getComputed(TEST_DEF.id)).toBe(100);
  });

  it("clearModifiers by statId only clears that stat", () => {
    const otherDef: StatDefinition = { id: sid("other"), min: 0, max: 500, defaultBase: 50 };
    registry.register(otherDef);
    const c2 = new StatContainer(registry);
    c2.addModifier(mod({ id: "f1", type: "flat", value: 10 }));
    c2.addModifier(mod({ id: "f2", type: "flat", value: 5, statId: otherDef.id }));
    c2.clearModifiers(TEST_DEF.id);
    expect(c2.getModifiers(TEST_DEF.id)).toHaveLength(0);
    expect(c2.getModifiers(otherDef.id)).toHaveLength(1);
  });

  it("getAllStats returns all stats", () => {
    const all = container.getAllStats();
    expect(all.size).toBe(1);
    expect(all.get(TEST_DEF.id)?.base).toBe(100);
  });
});

describe("StatsManager", () => {
  let world: World;
  let registry: StatRegistry;
  let manager: StatsManager;

  beforeEach(() => {
    world = new World(createRuntimeServices());
    registry = createDefaultStatRegistry();
    manager = new StatsManager(world, registry);
  });

  function entity(): EntityId {
    return world.createEntity();
  }

  it("attach/detach/has stats on entity", () => {
    const e = entity();
    expect(manager.hasStats(e)).toBe(false);
    manager.attachStats(e);
    expect(manager.hasStats(e)).toBe(true);
    manager.detachStats(e);
    expect(manager.hasStats(e)).toBe(false);
  });

  it("getStat/setBaseStat through entity", () => {
    const e = entity();
    manager.attachStats(e);
    const stat = manager.getStat(e, sid("stat_max_health"));
    expect(stat.base).toBe(100);
    manager.setBaseStat(e, sid("stat_max_health"), 200);
    expect(manager.getStat(e, sid("stat_max_health")).base).toBe(200);
    expect(manager.getStat(e, sid("stat_max_health")).computed).toBe(200);
  });

  it("addModifier/removeModifier through entity", () => {
    const e = entity();
    manager.attachStats(e);
    const m: StatModifier = {
      id: mid("buff1"),
      statId: sid("stat_max_health"),
      type: "flat",
      value: 50,
      priority: 0,
      source: "test",
    };
    manager.addModifier(e, m);
    expect(manager.getStat(e, sid("stat_max_health")).computed).toBe(150);
    manager.removeModifier(e, mid("buff1"));
    expect(manager.getStat(e, sid("stat_max_health")).computed).toBe(100);
  });

  it("calculateStats recalculates all", () => {
    const e = entity();
    manager.attachStats(e);
    manager.setBaseStat(e, sid("stat_max_health"), 200);
    manager.calculateStats(e);
    expect(manager.getStat(e, sid("stat_max_health")).computed).toBe(200);
  });

  it("adding a custom stat at runtime works", () => {
    registry.register({ id: sid("custom"), min: 0, max: 999, defaultBase: 42 });
    const e = entity();
    manager.attachStats(e);
    expect(manager.getStat(e, sid("custom")).base).toBe(42);
    expect(manager.getStat(e, sid("custom")).computed).toBe(42);
  });
});
