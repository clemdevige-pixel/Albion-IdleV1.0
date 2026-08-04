import { describe, it, expect } from "vitest";
import { World, createRuntimeServices, Mulberry32Rng } from "@game/core";
import type { EntityId } from "@game/core";
import { CharacterFactory, CharacterManager, CharacterSaveProvider } from "../character/index.js";
import { StatsManager, createDefaultStatRegistry } from "../stats/index.js";
import type { StatId } from "../stats/types.js";
import { TargetManager, TargetValidator } from "../targeting/index.js";
import { AutoAttackManager } from "../auto-attack/index.js";
import { DamageManager } from "../damage/index.js";
import type { DamageResult } from "../damage/types.js";
import { DeathManager, LootGenerator, LootManager } from "../death/index.js";
import type { LootTableLike } from "../death/types.js";

function sid(id: string): StatId {
  return id as StatId;
}

interface Setup {
  world: World;
  statsManager: StatsManager;
  characterManager: CharacterManager;
  targetManager: TargetManager;
  autoAttackManager: AutoAttackManager;
  damageManager: DamageManager;
  deathManager: DeathManager;
  lootManager: LootManager;
}

function makeSetup(seed: number): Setup {
  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const characterManager = new CharacterManager(world, new CharacterFactory(world));
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const lootManager = new LootManager(new LootGenerator(new Mulberry32Rng(seed)));
  return {
    world,
    statsManager,
    characterManager,
    targetManager,
    autoAttackManager,
    damageManager,
    deathManager,
    lootManager,
  };
}

function makeAttacker(s: Setup, name = "Hero"): EntityId {
  const charId = s.characterManager.createCharacter({ name, tick: 0 });
  const entityId = s.characterManager.getCharacter(charId)!.entityId;
  s.statsManager.attachStats(entityId);
  s.statsManager.setBaseStat(entityId, sid("stat_physical_damage"), 10);
  s.targetManager.attachTargeting(entityId);
  s.autoAttackManager.attachAutoAttack(entityId);
  s.damageManager.attachHealth(entityId);
  s.deathManager.attachDeath(entityId);
  return entityId;
}

function makeMonster(s: Setup, baseHealth = 30): EntityId {
  const entityId = s.world.createEntity();
  s.statsManager.attachStats(entityId);
  s.statsManager.setBaseStat(entityId, sid("stat_max_health"), baseHealth);
  s.damageManager.attachHealth(entityId);
  s.deathManager.attachDeath(entityId);
  return entityId;
}

const TEST_LOOT_TABLE: LootTableLike = {
  id: "test_table",
  entries: [
    { itemId: "wolf_hide", weight: 3, minQuantity: 1, maxQuantity: 3 },
    { itemId: "wolf_fang", weight: 1, minQuantity: 1, maxQuantity: 1 },
  ],
  guaranteedDrops: ["silver_coin"],
  maxRolls: 3,
};

interface CombatRun {
  tickCount: number;
  damageValues: number[];
  lootJson: string;
}

function runFullCombat(seed: number): CombatRun {
  const s = makeSetup(seed);
  const attacker = makeAttacker(s);
  const monster = makeMonster(s, 30);

  expect(s.targetManager.setTarget(attacker, monster)).toBe(true);
  expect(s.autoAttackManager.startAutoAttack(attacker)).toBe(true);

  const damageValues: number[] = [];
  let tickCount = 0;

  while (s.damageManager.isAlive(monster) && tickCount < 1000) {
    tickCount++;
    if (s.autoAttackManager.tick(attacker, 0.25)) {
      const result = s.damageManager.processDamage({
        source: attacker,
        target: monster,
        baseDamage: 0,
        damageType: "physical",
        source_type: "auto_attack",
      });
      expect(result).not.toBeNull();
      damageValues.push(result!.finalDamage);
    }
  }

  const deathEvent = s.deathManager.checkDeath(monster, attacker, tickCount);
  expect(deathEvent).not.toBeNull();
  expect(s.deathManager.checkDeath(monster, attacker, tickCount)).toBeNull();

  const loot = s.lootManager.generateLoot(monster, TEST_LOOT_TABLE);
  return { tickCount, damageValues, lootJson: JSON.stringify(loot) };
}

describe("Bloc 5 — Full Combat Integration", () => {
  it("full cycle: target → auto-attack → damage → death → loot → cleanup → save/load", () => {
    const s = makeSetup(1234);
    const attacker = makeAttacker(s);
    const monster = makeMonster(s, 30);

    expect(s.targetManager.setTarget(attacker, monster)).toBe(true);
    expect(s.targetManager.getTarget(attacker)).toBe(monster);
    expect(s.autoAttackManager.startAutoAttack(attacker)).toBe(true);
    expect(s.autoAttackManager.isAutoAttacking(attacker)).toBe(true);

    const results: DamageResult[] = [];
    let ticks = 0;
    // dt of 0.25 is exactly representable in binary, so tick counts are exact
    while (s.damageManager.isAlive(monster) && ticks < 1000) {
      ticks++;
      if (s.autoAttackManager.tick(attacker, 0.25)) {
        const result = s.damageManager.processDamage({
          source: attacker,
          target: monster,
          baseDamage: 0,
          damageType: "physical",
          source_type: "auto_attack",
        });
        expect(result).not.toBeNull();
        results.push(result!);
      }
    }

    // 10 dmg/hit vs 30 HP, no armor: 3 hits, interval 1.0s at dt 0.25 → 12 ticks
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.finalDamage === 10)).toBe(true);
    expect(ticks).toBe(12);
    expect(s.damageManager.getHealth(monster).currentHealth).toBe(0);
    expect(s.damageManager.isAlive(monster)).toBe(false);

    const deathEvent = s.deathManager.checkDeath(monster, attacker, ticks);
    expect(deathEvent).toEqual({ entityId: monster, killerEntityId: attacker, timestamp: 12 });
    expect(s.deathManager.isDead(monster)).toBe(true);
    expect(s.deathManager.checkDeath(monster, attacker, ticks)).toBeNull();
    s.deathManager.markProcessed(monster);
    expect(s.deathManager.isProcessed(monster)).toBe(true);

    const loot = s.lootManager.generateLoot(monster, TEST_LOOT_TABLE);
    expect(loot.entityId).toBe(monster);
    expect(loot.guaranteedDrops).toEqual([{ itemId: "silver_coin", quantity: 1 }]);
    expect(loot.drops.length).toBeGreaterThan(0);
    for (const drop of loot.drops) {
      expect(["wolf_hide", "wolf_fang"]).toContain(drop.itemId);
      expect(drop.quantity).toBeGreaterThan(0);
    }
    expect(s.lootManager.getLoot(monster)).toBe(loot);

    s.world.destroyEntity(monster);
    expect(s.autoAttackManager.tick(attacker, 0.1)).toBe(false);
    expect(s.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
    expect(s.targetManager.cleanupInvalidTarget(attacker)).toBe(true);
    expect(s.targetManager.hasTarget(attacker)).toBe(false);

    const saveProvider = new CharacterSaveProvider(s.characterManager, s.world);
    const saved = saveProvider.save();

    const s2 = makeSetup(1234);
    const saveProvider2 = new CharacterSaveProvider(s2.characterManager, s2.world);
    saveProvider2.load(saved);

    const charIds = s2.characterManager.listCharacters();
    expect(charIds).toHaveLength(1);
    const restored = s2.characterManager.getCharacter(charIds[0]!)!;
    expect(restored.profile.name).toBe("Hero");
    expect(restored.state.state).toBe("idle");
  });
});

describe("Bloc 5 — Target switch mid-combat", () => {
  it("attacks resolve on the new target after switching", () => {
    const s = makeSetup(7);
    const attacker = makeAttacker(s);
    const monsterA = makeMonster(s, 100);
    const monsterB = makeMonster(s, 100);

    s.targetManager.setTarget(attacker, monsterA);
    s.autoAttackManager.startAutoAttack(attacker);

    const resolveAttack = (): void => {
      for (let i = 0; i < 10; i++) {
        if (s.autoAttackManager.tick(attacker, 0.25)) {
          const target = s.targetManager.getTarget(attacker)!;
          s.damageManager.processDamage({
            source: attacker,
            target,
            baseDamage: 0,
            damageType: "physical",
            source_type: "auto_attack",
          });
          return;
        }
      }
      throw new Error("attack never fired");
    };

    resolveAttack();
    expect(s.damageManager.getHealth(monsterA).currentHealth).toBe(90);
    expect(s.damageManager.getHealth(monsterB).currentHealth).toBe(100);

    expect(s.targetManager.setTarget(attacker, monsterB)).toBe(true);
    resolveAttack();
    expect(s.damageManager.getHealth(monsterA).currentHealth).toBe(90);
    expect(s.damageManager.getHealth(monsterB).currentHealth).toBe(90);
  });
});

describe("Bloc 5 — Stop auto-attack mid-cycle", () => {
  it("resets the timer and no attack fires", () => {
    const s = makeSetup(7);
    const attacker = makeAttacker(s);
    const monster = makeMonster(s, 100);

    s.targetManager.setTarget(attacker, monster);
    s.autoAttackManager.startAutoAttack(attacker);

    expect(s.autoAttackManager.tick(attacker, 0.6)).toBe(false);
    s.autoAttackManager.stopAutoAttack(attacker);
    expect(s.autoAttackManager.isAutoAttacking(attacker)).toBe(false);
    expect(s.autoAttackManager.tick(attacker, 0.6)).toBe(false);
    expect(s.damageManager.getHealth(monster).currentHealth).toBe(100);

    s.autoAttackManager.startAutoAttack(attacker);
    expect(s.autoAttackManager.tick(attacker, 0.9)).toBe(false);
    expect(s.autoAttackManager.tick(attacker, 0.1)).toBe(true);
  });
});

describe("Bloc 5 — Death processed exactly once", () => {
  it("multiple checkDeath calls yield a single event", () => {
    const s = makeSetup(7);
    const attacker = makeAttacker(s);
    const monster = makeMonster(s, 30);

    s.damageManager.applyDamage(monster, 30);
    expect(s.damageManager.isAlive(monster)).toBe(false);

    const event = s.deathManager.checkDeath(monster, attacker, 5);
    expect(event).not.toBeNull();
    expect(s.deathManager.checkDeath(monster, attacker, 6)).toBeNull();
    expect(s.deathManager.checkDeath(monster, attacker, 7)).toBeNull();
    expect(s.deathManager.getDeathEvent(monster)).toEqual({
      entityId: monster,
      killerEntityId: attacker,
      timestamp: 5,
    });
  });
});

describe("Bloc 5 — Determinism", () => {
  it("same seed produces identical tick counts, damage values, and loot", () => {
    const run1 = runFullCombat(42);
    const run2 = runFullCombat(42);
    expect(run1.tickCount).toBe(run2.tickCount);
    expect(run1.damageValues).toEqual(run2.damageValues);
    expect(run1.lootJson).toBe(run2.lootJson);
  });
});

describe("Bloc 5 — Attack cadence", () => {
  it("attack_speed 2.0 fires every 0.5s", () => {
    const s = makeSetup(7);
    const attacker = makeAttacker(s);
    const monster = makeMonster(s, 1000);
    s.statsManager.setBaseStat(attacker, sid("stat_attack_speed"), 2.0);

    s.targetManager.setTarget(attacker, monster);
    s.autoAttackManager.startAutoAttack(attacker);

    const fireTicks: number[] = [];
    for (let tick = 1; tick <= 20; tick++) {
      if (s.autoAttackManager.tick(attacker, 0.1)) {
        fireTicks.push(tick);
      }
    }
    expect(fireTicks).toEqual([5, 10, 15, 20]);
  });
});

describe("Bloc 5 — Overkill", () => {
  it("massive damage records overkill and death is detected", () => {
    const s = makeSetup(7);
    const attacker = makeAttacker(s);
    const monster = makeMonster(s, 30);

    const result = s.damageManager.processDamage({
      source: attacker,
      target: monster,
      baseDamage: 990,
      damageType: "physical",
      source_type: "other",
    });
    expect(result).not.toBeNull();
    // raw = 990 + 10 physical damage, armor 0 → mitigated 1000
    expect(result!.rawDamage).toBe(1000);
    expect(result!.finalDamage).toBe(30);
    expect(result!.overkill).toBe(970);
    expect(result!.targetHealthAfter).toBe(0);

    const event = s.deathManager.checkDeath(monster, attacker, 1);
    expect(event).not.toBeNull();
    expect(event!.killerEntityId).toBe(attacker);
  });
});
