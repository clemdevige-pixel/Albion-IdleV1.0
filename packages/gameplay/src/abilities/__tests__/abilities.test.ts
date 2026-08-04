import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { StatsManager, createDefaultStatRegistry } from "../../stats/index.js";
import type { StatId } from "../../stats/types.js";
import { AbilityManager } from "../ability-manager.js";
import { canTransition, transition } from "../ability-state-machine.js";
import { CooldownManager } from "../cooldown-manager.js";
import { CastManager } from "../cast-manager.js";
import type { AbilityDefinitionLike, AbilityId, AbilityState } from "../types.js";

function aid(id: string): AbilityId {
  return id as AbilityId;
}

function makeDef(overrides: Partial<AbilityDefinitionLike> = {}): AbilityDefinitionLike {
  return {
    id: overrides.id ?? "fireball",
    cooldown: overrides.cooldown ?? 5,
    castTime: overrides.castTime ?? 0,
    resourceCost: overrides.resourceCost ?? {},
    interruptible: overrides.interruptible ?? true,
  };
}

describe("AbilityManager", () => {
  let world: World;
  let statsManager: StatsManager;
  let manager: AbilityManager;
  let entity: EntityId;

  beforeEach(() => {
    const services = createRuntimeServices();
    world = new World(services);
    const registry = createDefaultStatRegistry();
    statsManager = new StatsManager(world, registry);
    manager = new AbilityManager(world, statsManager);
    entity = world.createEntity();
    statsManager.attachStats(entity);
    manager.attachAbilities(entity);
  });

  it("learn ability — appears in list", () => {
    manager.learnAbility(entity, makeDef());
    expect(manager.hasAbility(entity, aid("fireball"))).toBe(true);
    expect(manager.getAbilities(entity)).toHaveLength(1);
  });

  it("forget ability — removed from list", () => {
    manager.learnAbility(entity, makeDef());
    manager.forgetAbility(entity, aid("fireball"));
    expect(manager.hasAbility(entity, aid("fireball"))).toBe(false);
    expect(manager.getAbilities(entity)).toHaveLength(0);
  });

  it("learn duplicate — throws", () => {
    manager.learnAbility(entity, makeDef());
    expect(() => manager.learnAbility(entity, makeDef())).toThrow("already learned");
  });

  it("cast instant ability (castTime=0) — goes to cooldown", () => {
    manager.learnAbility(entity, makeDef({ castTime: 0, cooldown: 5 }));
    const result = manager.castAbility(entity, aid("fireball"));
    expect(result).toBe(true);
    const entry = manager.getAbility(entity, aid("fireball"));
    expect(entry?.state).toBe("cooldown");
    expect(entry?.cooldownRemaining).toBe(5);
  });

  it("cast ability with cast time — goes to casting, tick to complete, then cooldown", () => {
    manager.learnAbility(entity, makeDef({ castTime: 2, cooldown: 5 }));
    manager.castAbility(entity, aid("fireball"));
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("casting");

    manager.tickAbilities(entity, 1);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("casting");

    manager.tickAbilities(entity, 1);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("cooldown");
  });

  it("interrupt casting — returns to ready", () => {
    manager.learnAbility(entity, makeDef({ castTime: 3, interruptible: true }));
    manager.castAbility(entity, aid("fireball"));
    const interrupted = manager.interruptCast(entity, aid("fireball"));
    expect(interrupted).toBe(true);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("ready");
  });

  it("interrupt non-interruptible — fails", () => {
    manager.learnAbility(entity, makeDef({ castTime: 3, interruptible: false }));
    manager.castAbility(entity, aid("fireball"));
    const interrupted = manager.interruptCast(entity, aid("fireball"));
    expect(interrupted).toBe(false);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("casting");
  });

  it("cooldown ticks down to 0 — returns to ready", () => {
    manager.learnAbility(entity, makeDef({ castTime: 0, cooldown: 3 }));
    manager.castAbility(entity, aid("fireball"));
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("cooldown");

    manager.tickAbilities(entity, 2);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("cooldown");

    manager.tickAbilities(entity, 1);
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("ready");
  });

  it("can't cast during cooldown", () => {
    manager.learnAbility(entity, makeDef({ castTime: 0, cooldown: 5 }));
    manager.castAbility(entity, aid("fireball"));
    const result = manager.castAbility(entity, aid("fireball"));
    expect(result).toBe(false);
  });

  it("can't cast during casting", () => {
    manager.learnAbility(entity, makeDef({ castTime: 3 }));
    manager.castAbility(entity, aid("fireball"));
    const result = manager.castAbility(entity, aid("fireball"));
    expect(result).toBe(false);
  });

  it("resource cost validation — insufficient energy prevents cast", () => {
    const other = world.createEntity();
    statsManager.attachStats(other);
    statsManager.setBaseStat(other, "stat_max_energy" as StatId, 5);
    statsManager.calculateStats(other);
    manager.attachAbilities(other);
    manager.learnAbility(other, makeDef({ resourceCost: { energy: 10 } }));
    const result = manager.castAbility(other, aid("fireball"));
    expect(result).toBe(false);
  });

  it("resource cost deducted from energy pool, base stat untouched (11_STAT §5)", () => {
    manager.learnAbility(entity, makeDef({ resourceCost: { energy: 10 }, castTime: 0, cooldown: 1 }));
    manager.castAbility(entity, aid("fireball"));
    // default max energy = 50 → pool drops to 40
    expect(manager.getEnergy(entity).currentEnergy).toBe(40);
    expect(manager.getEnergy(entity).maxEnergy).toBe(50);
    // base stat is never mutated
    expect(statsManager.getStat(entity, "stat_max_energy" as StatId).base).toBe(50);
  });

  it("restoreEnergy refills the pool up to maxEnergy", () => {
    manager.learnAbility(entity, makeDef({ resourceCost: { energy: 20 }, castTime: 0, cooldown: 1 }));
    manager.castAbility(entity, aid("fireball"));
    expect(manager.getEnergy(entity).currentEnergy).toBe(30);
    expect(manager.restoreEnergy(entity, 100)).toBe(20);
    expect(manager.getEnergy(entity).currentEnergy).toBe(50);
  });

  it("disabled state — can't cast, enable returns to ready", () => {
    manager.learnAbility(entity, makeDef());
    const entry = manager.getAbility(entity, aid("fireball"))!;
    entry.state = "disabled";
    const result = manager.castAbility(entity, aid("fireball"));
    expect(result).toBe(false);
    entry.state = "ready";
    expect(manager.isAbilityReady(entity, aid("fireball"))).toBe(true);
  });

  it("instant cast with zero cooldown stays ready", () => {
    manager.learnAbility(entity, makeDef({ castTime: 0, cooldown: 0 }));
    manager.castAbility(entity, aid("fireball"));
    expect(manager.getAbility(entity, aid("fireball"))?.state).toBe("ready");
  });

  it("determinism — same inputs same outputs", () => {
    for (let i = 0; i < 100; i++) {
      const services = createRuntimeServices();
      const w = new World(services);
      const reg = createDefaultStatRegistry();
      const sm = new StatsManager(w, reg);
      const am = new AbilityManager(w, sm);
      const e = w.createEntity();
      sm.attachStats(e);
      am.attachAbilities(e);
      am.learnAbility(e, makeDef({ castTime: 2, cooldown: 3 }));
      am.castAbility(e, aid("fireball"));
      am.tickAbilities(e, 1);
      am.tickAbilities(e, 1);
      am.tickAbilities(e, 2);
      const entry = am.getAbility(e, aid("fireball"));
      expect(entry?.state).toBe("cooldown");
      expect(entry?.cooldownRemaining).toBe(1);
    }
  });
});

describe("AbilityStateMachine", () => {
  it("valid transitions accepted", () => {
    const valid: [AbilityState, AbilityState][] = [
      ["ready", "casting"],
      ["ready", "disabled"],
      ["casting", "ready"],
      ["casting", "cooldown"],
      ["cooldown", "ready"],
      ["disabled", "ready"],
    ];
    for (const [from, to] of valid) {
      expect(canTransition(from, to)).toBe(true);
      expect(transition(from, to)).toBe(to);
    }
  });

  it("invalid transitions rejected", () => {
    const invalid: [AbilityState, AbilityState][] = [
      ["ready", "cooldown"],
      ["ready", "ready"],
      ["casting", "disabled"],
      ["casting", "casting"],
      ["cooldown", "casting"],
      ["cooldown", "disabled"],
      ["cooldown", "cooldown"],
      ["disabled", "casting"],
      ["disabled", "cooldown"],
      ["disabled", "disabled"],
    ];
    for (const [from, to] of invalid) {
      expect(canTransition(from, to)).toBe(false);
      expect(() => transition(from, to)).toThrow("Invalid ability state transition");
    }
  });
});

describe("CooldownManager", () => {
  const cdm = new CooldownManager();

  it("tracks cooldown lifecycle", () => {
    const entry = { abilityId: aid("x"), state: "ready" as const, cooldownRemaining: 0, castTimeRemaining: 0, definition: makeDef() };
    cdm.startCooldown(entry, 3);
    expect(cdm.isOnCooldown(entry)).toBe(true);
    expect(cdm.getRemainingCooldown(entry)).toBe(3);
    expect(cdm.tickCooldown(entry, 2)).toBe(false);
    expect(cdm.tickCooldown(entry, 1)).toBe(true);
    expect(entry.state).toBe("ready");
  });
});

describe("CastManager", () => {
  const cm = new CastManager();

  it("tracks cast lifecycle", () => {
    const def = makeDef({ castTime: 2, interruptible: true });
    const entry = { abilityId: aid("x"), state: "ready" as const, cooldownRemaining: 0, castTimeRemaining: 0, definition: def };
    cm.startCast(entry, 2);
    expect(cm.isCasting(entry)).toBe(true);
    expect(cm.tickCast(entry, 1)).toBe(false);
    expect(cm.tickCast(entry, 1)).toBe(true);
  });
});
