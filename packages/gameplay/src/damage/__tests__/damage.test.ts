import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../damage-manager.js";
import { DamageValidator } from "../damage-validator.js";
import { calculateDamage, calculateResistanceMitigation } from "../damage-calculator.js";
import type { DamageRequest } from "../types.js";

function sid(id: string): StatId {
  return id as StatId;
}

function makeRequest(
  source: EntityId,
  target: EntityId,
  baseDamage: number,
  overrides?: Partial<DamageRequest>,
): DamageRequest {
  return {
    source,
    target,
    baseDamage,
    damageType: "physical",
    source_type: "auto_attack",
    ...overrides,
  };
}

describe("Damage Pipeline", () => {
  let world: World;
  let statsManager: StatsManager;
  let damageManager: DamageManager;
  let attacker: EntityId;
  let defender: EntityId;

  beforeEach(() => {
    const services = createRuntimeServices();
    world = new World(services);
    const registry = createDefaultStatRegistry();
    statsManager = new StatsManager(world, registry);

    damageManager = new DamageManager(world, statsManager);

    attacker = world.createEntity();
    statsManager.attachStats(attacker);

    defender = world.createEntity();
    statsManager.attachStats(defender);
  });

  it("attachHealth — currentHealth equals stat_max_health computed", () => {
    damageManager.attachHealth(defender);
    const health = damageManager.getHealth(defender);
    const maxHp = statsManager.getStat(defender, sid("stat_max_health")).computed;
    expect(health.currentHealth).toBe(maxHp);
    expect(health.maxHealth).toBe(maxHp);
    expect(health.currentHealth).toBe(100);
  });

  it("processDamage — basic physical damage reduces health", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(attacker, sid("stat_physical_damage"), 10);
    statsManager.calculateStats(attacker);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 20));
    expect(result).not.toBeNull();
    expect(result!.rawDamage).toBe(30);
    expect(result!.mitigatedDamage).toBe(30);
    expect(result!.finalDamage).toBe(30);
    expect(result!.targetHealthAfter).toBe(70);
  });

  it("processDamage — armor mitigates damage through diminishing returns", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(defender, sid("stat_armor"), 25);
    statsManager.calculateStats(defender);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 100));
    expect(result).not.toBeNull();
    expect(result!.rawDamage).toBe(100);
    expect(result!.mitigatedDamage).toBeCloseTo(80, 10);
    expect(result!.finalDamage).toBeCloseTo(80, 10);
    expect(result!.targetHealthAfter).toBeCloseTo(20, 10);
  });

  it("processDamage — magical damage mitigated by magic resistance, not armor", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(defender, sid("stat_armor"), 80);
    statsManager.setBaseStat(defender, sid("stat_magic_resistance"), 40);
    statsManager.calculateStats(defender);

    const result = damageManager.processDamage(
      makeRequest(attacker, defender, 50, { damageType: "magical" }),
    );
    expect(result).not.toBeNull();
    expect(result!.rawDamage).toBe(50);
    expect(result!.mitigatedDamage).toBeCloseTo(35.7142857143, 10);
  });

  it("processDamage — true damage ignores all resistances", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(defender, sid("stat_armor"), 80);
    statsManager.setBaseStat(defender, sid("stat_magic_resistance"), 80);
    statsManager.calculateStats(defender);

    const result = damageManager.processDamage(
      makeRequest(attacker, defender, 50, { damageType: "true" }),
    );
    expect(result).not.toBeNull();
    expect(result!.mitigatedDamage).toBe(50);
  });

  it("processDamage — dead target rejected", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 100);
    const result = damageManager.processDamage(makeRequest(attacker, defender, 10));
    expect(result).toBeNull();
  });

  it("processDamage — zero-damage request discarded", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    const result = damageManager.processDamage(makeRequest(attacker, defender, 0));
    expect(result).toBeNull();
  });

  it("processDamage — reports targetDied on lethal hit", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    const nonLethal = damageManager.processDamage(makeRequest(attacker, defender, 50));
    expect(nonLethal!.targetDied).toBe(false);
    const lethal = damageManager.processDamage(makeRequest(attacker, defender, 50));
    expect(lethal!.targetDied).toBe(true);
  });

  it("processDamage — 0 armor = full damage", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 40));
    expect(result).not.toBeNull();
    expect(result!.rawDamage).toBe(40);
    expect(result!.mitigatedDamage).toBe(40);
  });

  it("processDamage — very high armor keeps gaining mitigation without a hard cap", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(defender, sid("stat_armor"), 900);
    statsManager.calculateStats(defender);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 100));
    expect(result).not.toBeNull();
    expect(result!.mitigatedDamage).toBeCloseTo(10, 10);
  });

  it("processDamage — overkill tracked", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 150));
    expect(result).not.toBeNull();
    expect(result!.finalDamage).toBe(100);
    expect(result!.overkill).toBe(50);
    expect(result!.targetHealthAfter).toBe(0);
  });

  it("processDamage — invalid target (no health component) returns null", () => {
    damageManager.attachHealth(attacker);
    const result = damageManager.processDamage(makeRequest(attacker, defender, 10));
    expect(result).toBeNull();
  });

  it("processDamage — self-damage rejected", () => {
    damageManager.attachHealth(attacker);
    const result = damageManager.processDamage(makeRequest(attacker, attacker, 10));
    expect(result).toBeNull();
  });

  it("applyDamage — direct damage, clamped to 0", () => {
    damageManager.attachHealth(defender);
    const dealt = damageManager.applyDamage(defender, 120);
    expect(dealt).toBe(100);
    expect(damageManager.getHealth(defender).currentHealth).toBe(0);
  });

  it("healDamage — heals up to maxHealth", () => {
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 60);
    const healed = damageManager.healDamage(defender, 80);
    expect(healed).toBe(60);
    expect(damageManager.getHealth(defender).currentHealth).toBe(100);
  });

  it("isAlive — true when health > 0, false at 0", () => {
    damageManager.attachHealth(defender);
    expect(damageManager.isAlive(defender)).toBe(true);
    damageManager.applyDamage(defender, 100);
    expect(damageManager.isAlive(defender)).toBe(false);
  });

  it("determinism — same request twice produces same result", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    statsManager.setBaseStat(attacker, sid("stat_physical_damage"), 15);
    statsManager.setBaseStat(defender, sid("stat_armor"), 50);
    statsManager.calculateStats(attacker);
    statsManager.calculateStats(defender);

    const req = makeRequest(attacker, defender, 30);
    const r1 = damageManager.processDamage(req);

    damageManager.healDamage(defender, 1000);
    const r2 = damageManager.processDamage(req);

    expect(r1!.rawDamage).toBe(r2!.rawDamage);
    expect(r1!.mitigatedDamage).toBe(r2!.mitigatedDamage);
  });

  it("DamageResult contains correct before/after health", () => {
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    const result = damageManager.processDamage(makeRequest(attacker, defender, 30));
    expect(result!.targetHealthBefore).toBe(100);
    expect(result!.targetHealthAfter).toBe(70);
  });

  it("syncMaxHealth — updates maxHealth from stats", () => {
    damageManager.attachHealth(defender);
    expect(damageManager.getHealth(defender).maxHealth).toBe(100);

    statsManager.setBaseStat(defender, sid("stat_max_health"), 200);
    statsManager.calculateStats(defender);
    damageManager.syncMaxHealth(defender);

    expect(damageManager.getHealth(defender).maxHealth).toBe(200);
  });

  it("syncMaxHealth — preserves health ratio (11_STAT §12)", () => {
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 50);

    statsManager.setBaseStat(defender, sid("stat_max_health"), 140);
    statsManager.calculateStats(defender);
    damageManager.syncMaxHealth(defender);

    expect(damageManager.getHealth(defender).maxHealth).toBe(140);
    expect(damageManager.getHealth(defender).currentHealth).toBe(70);
  });

  it("syncMaxHealth — standard rounding (11_STAT §13)", () => {
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 35);

    statsManager.setBaseStat(defender, sid("stat_max_health"), 125);
    statsManager.calculateStats(defender);
    damageManager.syncMaxHealth(defender);

    expect(damageManager.getHealth(defender).currentHealth).toBe(81);
  });

  it("syncMaxHealth — zero-health exception, never revives (11_STAT §14)", () => {
    damageManager.attachHealth(defender);
    damageManager.applyDamage(defender, 100);

    statsManager.setBaseStat(defender, sid("stat_max_health"), 200);
    statsManager.calculateStats(defender);
    damageManager.syncMaxHealth(defender);

    expect(damageManager.getHealth(defender).maxHealth).toBe(200);
    expect(damageManager.getHealth(defender).currentHealth).toBe(0);
  });
});

describe("calculateDamage (pure)", () => {
  const attacker = { physicalDamage: 10, magicalDamage: 20 };

  it("physical with no armor", () => {
    const result = calculateDamage(50, attacker, { armor: 0, magicResistance: 0 }, "physical");
    expect(result.rawDamage).toBe(60);
    expect(result.mitigatedDamage).toBe(60);
  });

  it("magical bypasses armor and uses magic resistance", () => {
    const result = calculateDamage(50, attacker, { armor: 100, magicResistance: 50 }, "magical");
    expect(result.rawDamage).toBe(70);
    expect(result.mitigatedDamage).toBeCloseTo(46.6666666667, 10);
  });

  it("true damage ignores every resistance", () => {
    const result = calculateDamage(50, attacker, { armor: 80, magicResistance: 80 }, "true");
    expect(result.rawDamage).toBe(50);
    expect(result.mitigatedDamage).toBe(50);
  });

  it("resistance curve is asymptotic and has no hard cap", () => {
    expect(calculateResistanceMitigation(0)).toBe(0);
    expect(calculateResistanceMitigation(100)).toBeCloseTo(0.5, 10);
    expect(calculateResistanceMitigation(200)).toBeCloseTo(2 / 3, 10);
    expect(calculateResistanceMitigation(400)).toBeCloseTo(0.8, 10);

    const physical = calculateDamage(90, attacker, { armor: 500, magicResistance: 0 }, "physical");
    expect(physical.mitigatedDamage).toBeCloseTo(100 / 6, 10);
    const magical = calculateDamage(80, attacker, { armor: 0, magicResistance: 200 }, "magical");
    expect(magical.mitigatedDamage).toBeCloseTo(100 / 3, 10);
  });

  it("minimum damage rule — a successful attack always deals at least 1", () => {
    const result = calculateDamage(1, { physicalDamage: 0, magicalDamage: 0 }, { armor: 900, magicResistance: 0 }, "physical");
    expect(result.rawDamage).toBe(1);
    expect(result.mitigatedDamage).toBe(1);
  });
});

describe("DamageValidator", () => {
  it("rejects nonexistent entities", () => {
    const services = createRuntimeServices();
    const world = new World(services);
    const validator = new DamageValidator(world);
    const req = makeRequest(999 as EntityId, 1000 as EntityId, 10);
    expect(validator.validate(req)).toBe(false);
  });
});
