import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../damage-manager.js";

const sid = (id: string): StatId => id as StatId;

function setup() {
  const world = new World(createRuntimeServices());
  const stats = new StatsManager(world, createDefaultStatRegistry());
  const damage = new DamageManager(world, stats);
  const attacker = world.createEntity();
  const target = world.createEntity();
  stats.attachStats(attacker);
  stats.attachStats(target);
  stats.setBaseStat(attacker, sid("stat_max_health"), 200);
  stats.setBaseStat(attacker, sid("stat_physical_damage"), 100);
  stats.setBaseStat(target, sid("stat_max_health"), 500);
  stats.calculateStats(attacker);
  stats.calculateStats(target);
  damage.attachHealth(attacker);
  damage.attachHealth(target);
  return { stats, damage, attacker, target };
}

describe("awakened auto-attack combat traits", () => {
  it("auto-attack damage bonus affects auto attacks but not abilities", () => {
    const env = setup();
    env.stats.setBaseStat(env.attacker, sid("stat_auto_attack_damage_bonus"), 10);
    env.stats.calculateStats(env.attacker);

    const auto = env.damage.processDamage({
      source: env.attacker,
      target: env.target,
      baseDamage: 0,
      damageType: "physical",
      source_type: "auto_attack",
    });
    expect(auto?.finalDamage).toBe(110);

    env.damage.healDamage(env.target, 500);
    const ability = env.damage.processDamage({
      source: env.attacker,
      target: env.target,
      baseDamage: 0,
      damageType: "physical",
      source_type: "ability",
    });
    expect(ability?.finalDamage).toBe(100);
  });

  it("life steal heals from actual post-mitigation auto-attack damage only", () => {
    const env = setup();
    env.stats.setBaseStat(env.attacker, sid("stat_life_steal"), 5);
    env.stats.setBaseStat(env.target, sid("stat_armor"), 100);
    env.stats.calculateStats(env.attacker);
    env.stats.calculateStats(env.target);
    env.damage.applyDamage(env.attacker, 100);

    const auto = env.damage.processDamage({
      source: env.attacker,
      target: env.target,
      baseDamage: 0,
      damageType: "physical",
      source_type: "auto_attack",
    });
    expect(auto?.finalDamage).toBeCloseTo(50, 10);
    expect(env.damage.getHealth(env.attacker).currentHealth).toBeCloseTo(102.5, 10);

    const healthBeforeAbility = env.damage.getHealth(env.attacker).currentHealth;
    env.damage.processDamage({
      source: env.attacker,
      target: env.target,
      baseDamage: 0,
      damageType: "physical",
      source_type: "ability",
    });
    expect(env.damage.getHealth(env.attacker).currentHealth).toBe(healthBeforeAbility);
  });

  it("life steal stat is hard-capped at 5 percent", () => {
    const env = setup();
    env.stats.setBaseStat(env.attacker, sid("stat_life_steal"), 50);
    env.stats.calculateStats(env.attacker);
    expect(env.stats.getStat(env.attacker, sid("stat_life_steal")).computed).toBe(5);
  });
});
