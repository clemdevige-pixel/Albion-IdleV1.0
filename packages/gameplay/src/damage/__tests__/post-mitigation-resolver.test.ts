import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { createDefaultStatRegistry } from "../../stats/stat-registry.js";
import { StatsManager } from "../../stats/stats-manager.js";
import type { StatId } from "../../stats/types.js";
import { DamageManager } from "../damage-manager.js";

describe("DamageManager post-mitigation resolver", () => {
  it("changes only resolved health damage while preserving resistance mitigation", () => {
    const world = new World(createRuntimeServices());
    const statsManager = new StatsManager(world, createDefaultStatRegistry());
    const damageManager = new DamageManager(world, statsManager);
    const attacker = world.createEntity();
    const defender = world.createEntity();

    statsManager.attachStats(attacker);
    statsManager.attachStats(defender);
    statsManager.setBaseStat(defender, "stat_armor" as StatId, 25);
    statsManager.calculateStats(defender);
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);

    damageManager.setPostMitigationDamageResolver((_request, mitigatedDamage) => (
      mitigatedDamage * 0.9
    ));

    const result = damageManager.processDamage({
      source: attacker,
      target: defender,
      baseDamage: 100,
      damageType: "physical",
      source_type: "ability",
    });

    expect(result).not.toBeNull();
    expect(result?.mitigatedDamage).toBeCloseTo(80, 10);
    expect(result?.finalDamage).toBeCloseTo(72, 10);
    expect(result?.targetHealthAfter).toBeCloseTo(28, 10);
  });

  it("rejects invalid resolver output", () => {
    const world = new World(createRuntimeServices());
    const statsManager = new StatsManager(world, createDefaultStatRegistry());
    const damageManager = new DamageManager(world, statsManager);
    const attacker = world.createEntity();
    const defender = world.createEntity();

    statsManager.attachStats(attacker);
    statsManager.attachStats(defender);
    damageManager.attachHealth(attacker);
    damageManager.attachHealth(defender);
    damageManager.setPostMitigationDamageResolver(() => Number.NaN);

    expect(() => damageManager.processDamage({
      source: attacker,
      target: defender,
      baseDamage: 10,
      damageType: "physical",
      source_type: "ability",
    })).toThrow("Post-mitigation damage resolver must return a finite non-negative value");
  });
});
