import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { TargetManager } from "../../targeting/target-manager.js";
import { TargetValidator } from "../../targeting/target-validator.js";
import { StatsManager } from "../../stats/stats-manager.js";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { AutoAttackManager } from "../auto-attack-manager.js";
import { AutoAttackComponent } from "../components.js";
import { computeAttackInterval, tickAttackTimer } from "../attack-timer.js";
import type { AutoAttackData } from "../types.js";
import type { StatId } from "../../stats/types.js";

const ATTACK_SPEED = "stat_attack_speed" as StatId;

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

function setupManagers(world: World) {
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  return { targetManager, statsManager, autoAttackManager };
}

function createAttacker(
  world: World,
  managers: ReturnType<typeof setupManagers>,
  attackSpeed = 1.0,
) {
  const entity = world.createEntity();
  managers.targetManager.attachTargeting(entity);
  managers.statsManager.attachStats(entity);
  managers.statsManager.setBaseStat(entity, ATTACK_SPEED, attackSpeed);
  managers.statsManager.calculateStats(entity);
  managers.autoAttackManager.attachAutoAttack(entity);
  return entity;
}

describe("AutoAttack", () => {
  let world: World;
  let managers: ReturnType<typeof setupManagers>;

  beforeEach(() => {
    world = createTestWorld();
    managers = setupManagers(world);
  });

  it("attaches auto-attack component with default data", () => {
    const entity = world.createEntity();
    managers.autoAttackManager.attachAutoAttack(entity);
    const data = world.getComponent(entity, AutoAttackComponent);
    expect(data.active).toBe(false);
    expect(data.timer).toBe(0);
    expect(data.interval).toBe(0);
    expect(data.attackReady).toBe(false);
  });

  it("starts auto-attack with valid target", () => {
    const attacker = createAttacker(world, managers);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);

    const started = managers.autoAttackManager.startAutoAttack(attacker);
    expect(started).toBe(true);
    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(true);
  });

  it("fails to start without valid target", () => {
    const attacker = createAttacker(world, managers);

    const started = managers.autoAttackManager.startAutoAttack(attacker);
    expect(started).toBe(false);
    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
  });

  it("stops auto-attack and resets state", () => {
    const attacker = createAttacker(world, managers);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    managers.autoAttackManager.stopAutoAttack(attacker);
    const data = world.getComponent(attacker, AutoAttackComponent);
    expect(data.active).toBe(false);
    expect(data.timer).toBe(0);
    expect(data.attackReady).toBe(false);
  });

  it("isAutoAttacking reflects active state", () => {
    const attacker = createAttacker(world, managers);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);

    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
    managers.autoAttackManager.startAutoAttack(attacker);
    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(true);
    managers.autoAttackManager.stopAutoAttack(attacker);
    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
  });

  it("canAttack returns true with target and stats, false without", () => {
    const attacker = createAttacker(world, managers);
    expect(managers.autoAttackManager.canAttack(attacker)).toBe(false);

    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    expect(managers.autoAttackManager.canAttack(attacker)).toBe(true);
  });

  it("tick accumulates timer and signals attack ready at interval", () => {
    const attacker = createAttacker(world, managers, 1.0);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    expect(managers.autoAttackManager.tick(attacker, 0.5)).toBe(false);
    expect(managers.autoAttackManager.tick(attacker, 0.5)).toBe(true);
  });

  it("attack_speed=2.0 means interval=0.5s", () => {
    const attacker = createAttacker(world, managers, 2.0);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    expect(managers.autoAttackManager.tick(attacker, 0.3)).toBe(false);
    expect(managers.autoAttackManager.tick(attacker, 0.2)).toBe(true);
  });

  it("auto-stops when target becomes invalid", () => {
    const attacker = createAttacker(world, managers);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    world.destroyEntity(target);
    const result = managers.autoAttackManager.tick(attacker, 0.1);
    expect(result).toBe(false);
    expect(managers.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
  });

  it("consumeAttack returns true once then false", () => {
    const data: AutoAttackData = {
      active: true,
      timer: 0,
      interval: 1.0,
      attackReady: false,
    };
    tickAttackTimer(data, 1.0);
    expect(data.attackReady).toBe(true);

    data.attackReady = false;
    expect(data.attackReady).toBe(false);

    const attacker = createAttacker(world, managers);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    const componentData = world.getComponent(attacker, AutoAttackComponent);
    componentData.attackReady = true;

    expect(managers.autoAttackManager.consumeAttack(attacker)).toBe(true);
    expect(managers.autoAttackManager.consumeAttack(attacker)).toBe(false);
  });

  it("discards timer overflow to prevent an immediate follow-up attack", () => {
    const attacker = createAttacker(world, managers, 1.0);
    const target = world.createEntity();
    managers.targetManager.setTarget(attacker, target);
    managers.autoAttackManager.startAutoAttack(attacker);

    expect(managers.autoAttackManager.tick(attacker, 1.3)).toBe(true);
    const data = world.getComponent(attacker, AutoAttackComponent);
    expect(data.timer).toBe(0);
  });

  it("determinism: same ticks produce same results", () => {
    const deltas = [0.2, 0.3, 0.4, 0.6, 0.1];

    function runSequence() {
      const w = createTestWorld();
      const m = setupManagers(w);
      const a = createAttacker(w, m, 1.0);
      const t = w.createEntity();
      m.targetManager.setTarget(a, t);
      m.autoAttackManager.startAutoAttack(a);
      return deltas.map((dt) => m.autoAttackManager.tick(a, dt));
    }

    const run1 = runSequence();
    const run2 = runSequence();
    expect(run1).toEqual(run2);
  });

  describe("computeAttackInterval", () => {
    it("converts attack speed to interval", () => {
      expect(computeAttackInterval(1.0)).toBe(1.0);
      expect(computeAttackInterval(2.0)).toBe(0.5);
      expect(computeAttackInterval(0.5)).toBe(2.0);
    });

    it("guards against zero or negative", () => {
      expect(computeAttackInterval(0)).toBeGreaterThan(0);
      expect(computeAttackInterval(-1)).toBeGreaterThan(0);
    });
  });
});
