import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  DamageManager,
  DeathManager,
  EffectManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  createDefaultStatRegistry,
} from "@game/gameplay";
import { MONSTER_ABILITIES, MONSTER_ABILITY_IDS } from "../data/monsterAbilityContentCatalog";
import { setupCombatEntity } from "./combatEntityFactory";
import { tickMonsterAbilities } from "./MonsterAbilityRuntime";

function setup() {
  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const deps = {
    world,
    statsManager,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
  };
  const heroId = setupCombatEntity(deps, {
    maxHealth: 100,
    physDamage: 10,
    attackSpeed: 1,
    armor: 0,
    magicRes: 0,
  }, { x: 0, y: 0 });
  const monsterId = setupCombatEntity(deps, {
    maxHealth: 100,
    physDamage: 20,
    attackSpeed: 1,
    armor: 0,
    magicRes: 0,
  }, { x: 1, y: 0 });
  return { heroId, monsterId, abilityManager, damageManager, effectManager, statsManager };
}

describe("MonsterAbilityRuntime", () => {
  it("executes the first ready learned ability and starts its cooldown", () => {
    const env = setup();
    const ability = MONSTER_ABILITIES[MONSTER_ABILITY_IDS.undeadHeavySlash]!;
    env.abilityManager.learnAbility(env.monsterId, ability);

    const before = env.damageManager.getHealth(env.heroId).currentHealth;
    expect(tickMonsterAbilities(env, env.monsterId, env.heroId, 0.1, 1)).toBe(true);
    expect(env.damageManager.getHealth(env.heroId).currentHealth).toBeLessThan(before);
    expect(env.abilityManager.getAbility(env.monsterId, ability.id as never)?.state).toBe("cooldown");
  });

  it("does not execute an ability again while it is on cooldown", () => {
    const env = setup();
    const ability = MONSTER_ABILITIES[MONSTER_ABILITY_IDS.undeadHeavySlash]!;
    env.abilityManager.learnAbility(env.monsterId, ability);

    expect(tickMonsterAbilities(env, env.monsterId, env.heroId, 0.1, 1)).toBe(true);
    expect(tickMonsterAbilities(env, env.monsterId, env.heroId, 0.1, 2)).toBe(false);
  });
});
