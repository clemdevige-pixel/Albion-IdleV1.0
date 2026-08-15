import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { StatsManager, createDefaultStatRegistry } from "../../stats/index.js";
import { AbilityManager } from "../ability-manager.js";
import type { AbilityId } from "../types.js";

const abilityId = "segment_reset_test" as AbilityId;

describe("AbilityManager.resetCooldowns", () => {
  it("makes cooldown abilities immediately ready", () => {
    const world = new World(createRuntimeServices());
    const statsManager = new StatsManager(world, createDefaultStatRegistry());
    const manager = new AbilityManager(world, statsManager);
    const entity = world.createEntity();

    statsManager.attachStats(entity);
    manager.attachAbilities(entity);
    manager.learnAbility(entity, {
      id: abilityId,
      cooldown: 12,
      castTime: 0,
      resourceCost: {},
      interruptible: true,
    });

    expect(manager.castAbility(entity, abilityId)).toBe(true);
    expect(manager.getAbility(entity, abilityId)?.state).toBe("cooldown");
    expect(manager.getAbility(entity, abilityId)?.cooldownRemaining).toBe(12);

    manager.resetCooldowns(entity);

    expect(manager.getAbility(entity, abilityId)?.state).toBe("ready");
    expect(manager.getAbility(entity, abilityId)?.cooldownRemaining).toBe(0);
  });
});
