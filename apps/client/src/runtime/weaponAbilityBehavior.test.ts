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
import { CLIENT_ABILITIES } from "../data/weaponContentCatalog";
import { WeaponAbilityMechanicsRuntime } from "./WeaponAbilityMechanicsRuntime";
import { setupCombatEntity } from "./combatEntityFactory";

function requireAbility(abilityId: string) {
  const ability = CLIENT_ABILITIES[abilityId];
  if (ability === undefined) throw new Error(`Missing client ability ${abilityId}`);
  return ability;
}

function createBehaviorEnvironment(enemyHealth = 1000) {
  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const deps = { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager };
  const heroId = setupCombatEntity(deps, { maxHealth: 1000, physDamage: 100, magDamage: 100, attackSpeed: 1, armor: 0, magicRes: 0 }, { x: 0, y: 0 });
  const enemyId = setupCombatEntity(deps, { maxHealth: enemyHealth, physDamage: 0, magDamage: 0, attackSpeed: 1, armor: 0, magicRes: 0 }, { x: 100, y: 0 });
  let kills = 0;
  const mechanics = new WeaponAbilityMechanicsRuntime({ heroId, damageManager, effectManager, statsManager, autoAttackManager, onTargetKilled: () => { kills += 1; } });
  return { enemyId, damageManager, effectManager, mechanics, getKills: () => kills };
}

function activeEffectIds(effectManager: EffectManager, enemyId: Parameters<EffectManager["getActiveEffects"]>[0]): readonly string[] {
  return effectManager.getActiveEffects(enemyId).map((effect) => effect.definition.id);
}

describe("weapon ability live behavior", () => {
  it("Infernal Fireball opens Burst, then Burn ticks exactly three times", () => {
    const env = createBehaviorEnvironment();
    const fireball = requireAbility("ability_fire_fireball");
    const burst = requireAbility("ability_fire_infernal_burst");
    expect(env.mechanics.canAutoCast(burst, env.enemyId)).toBe(false);
    expect(env.mechanics.execute(fireball, env.enemyId, 1)).toBe(true);
    expect(activeEffectIds(env.effectManager, env.enemyId)).toContain("effect_fire_burn");
    expect(env.mechanics.canAutoCast(burst, env.enemyId)).toBe(true);
    const beforeBurst = env.damageManager.getHealth(env.enemyId).currentHealth;
    expect(env.mechanics.execute(burst, env.enemyId, 1)).toBe(true);
    const afterBurst = env.damageManager.getHealth(env.enemyId).currentHealth;
    expect(beforeBurst - afterBurst).toBeCloseTo(192, 5);
    const beforeDot = afterBurst;
    env.mechanics.tick(1, 2);
    env.mechanics.tick(1, 3);
    env.mechanics.tick(1, 4);
    const afterThreeTicks = env.damageManager.getHealth(env.enemyId).currentHealth;
    expect(beforeDot - afterThreeTicks).toBeCloseTo(28.8, 5);
    env.mechanics.tick(1, 5);
    expect(env.damageManager.getHealth(env.enemyId).currentHealth).toBeCloseTo(afterThreeTicks, 5);
  });

  it("keeps Infernal Burn and Cataclysm as independent DoTs", () => {
    const env = createBehaviorEnvironment(2000);
    env.mechanics.execute(requireAbility("ability_fire_fireball"), env.enemyId, 1);
    env.mechanics.execute(requireAbility("ability_fire_cataclysm"), env.enemyId, 1);
    expect(activeEffectIds(env.effectManager, env.enemyId)).toEqual(expect.arrayContaining(["effect_fire_burn", "effect_fire_cataclysm"]));
    const before = env.damageManager.getHealth(env.enemyId).currentHealth;
    env.mechanics.tick(1, 2);
    const after = env.damageManager.getHealth(env.enemyId).currentHealth;
    expect(before - after).toBeCloseTo(27.6, 5);
  });

  it("refreshes the same Burn instead of stacking a second copy", () => {
    const env = createBehaviorEnvironment(2000);
    const fireball = requireAbility("ability_fire_fireball");
    env.mechanics.execute(fireball, env.enemyId, 1);
    env.mechanics.tick(1, 2);
    expect(activeEffectIds(env.effectManager, env.enemyId).filter((id) => id === "effect_fire_burn")).toHaveLength(1);
    env.mechanics.execute(fireball, env.enemyId, 3);
    expect(activeEffectIds(env.effectManager, env.enemyId).filter((id) => id === "effect_fire_burn")).toHaveLength(1);
    const beforeRefreshedTicks = env.damageManager.getHealth(env.enemyId).currentHealth;
    env.mechanics.tick(1, 4);
    env.mechanics.tick(1, 5);
    env.mechanics.tick(1, 6);
    const afterRefreshedTicks = env.damageManager.getHealth(env.enemyId).currentHealth;
    expect(beforeRefreshedTicks - afterRefreshedTicks).toBeCloseTo(28.8, 5);
    env.mechanics.tick(1, 7);
    expect(env.damageManager.getHealth(env.enemyId).currentHealth).toBeCloseTo(afterRefreshedTicks, 5);
  });

  it("refreshes the same status effect instead of stacking duplicates", () => {
    const env = createBehaviorEnvironment(2000);
    const flurry = requireAbility("ability_dagger_flurry");
    env.mechanics.execute(flurry, env.enemyId, 1);
    expect(activeEffectIds(env.effectManager, env.enemyId).filter((id) => id === "effect_dagger_opening")).toHaveLength(1);
    env.effectManager.tickEffects(3);
    env.mechanics.execute(flurry, env.enemyId, 4);
    const openingEffects = env.effectManager.getActiveEffects(env.enemyId).filter((effect) => effect.definition.id === "effect_dagger_opening");
    expect(openingEffects).toHaveLength(1);
    expect(openingEffects[0]?.remainingDuration).toBeCloseTo(4, 5);
  });

  it("Infernal Burn can kill once without waiting for another direct hit", () => {
    const env = createBehaviorEnvironment();
    const fireball = requireAbility("ability_fire_fireball");
    env.mechanics.execute(fireball, env.enemyId, 1);
    env.damageManager.getHealth(env.enemyId).currentHealth = 5;
    env.mechanics.tick(1, 2);
    expect(env.damageManager.getHealth(env.enemyId).currentHealth).toBe(0);
    expect(env.getKills()).toBe(1);
  });

  it("Dagger Cross Assault always autocasts and consumes its Flurry combo bonus", () => {
    const crossAssault = requireAbility("ability_dagger_pair_cross_assault");
    const noCombo = createBehaviorEnvironment();
    expect(noCombo.mechanics.canAutoCast(crossAssault, noCombo.enemyId)).toBe(true);
    const beforeNoCombo = noCombo.damageManager.getHealth(noCombo.enemyId).currentHealth;
    expect(noCombo.mechanics.execute(crossAssault, noCombo.enemyId, 1)).toBe(true);
    expect(beforeNoCombo - noCombo.damageManager.getHealth(noCombo.enemyId).currentHealth).toBeCloseTo(285, 5);

    const withCombo = createBehaviorEnvironment();
    const flurry = requireAbility("ability_dagger_flurry");
    expect(withCombo.mechanics.execute(flurry, withCombo.enemyId, 1)).toBe(true);
    expect(activeEffectIds(withCombo.effectManager, withCombo.enemyId)).toContain("effect_dagger_combo_ready");
    withCombo.damageManager.getHealth(withCombo.enemyId).currentHealth = 1000;
    expect(withCombo.mechanics.canAutoCast(crossAssault, withCombo.enemyId)).toBe(true);
    const beforeCombo = withCombo.damageManager.getHealth(withCombo.enemyId).currentHealth;
    expect(withCombo.mechanics.execute(crossAssault, withCombo.enemyId, 2)).toBe(true);
    expect(beforeCombo - withCombo.damageManager.getHealth(withCombo.enemyId).currentHealth).toBeCloseTo(380, 5);
    expect(activeEffectIds(withCombo.effectManager, withCombo.enemyId)).not.toContain("effect_dagger_combo_ready");
  });

  it("Spiked multi-hit stops cleanly when the target dies during the combo", () => {
    const env = createBehaviorEnvironment(70);
    const combo = requireAbility("ability_gloves_breaking_combo");
    expect(env.mechanics.execute(combo, env.enemyId, 1)).toBe(true);
    expect(env.damageManager.getHealth(env.enemyId).currentHealth).toBe(0);
    expect(env.getKills()).toBe(1);
  });

  it("Broadsword Execution only autocasts at or below 50% and receives its finisher bonus", () => {
    const env = createBehaviorEnvironment(1000);
    const execution = requireAbility("ability_sword_execution");
    const health = env.damageManager.getHealth(env.enemyId);
    health.currentHealth = 501;
    expect(env.mechanics.canAutoCast(execution, env.enemyId)).toBe(false);
    health.currentHealth = 500;
    expect(env.mechanics.canAutoCast(execution, env.enemyId)).toBe(true);
    env.mechanics.execute(execution, env.enemyId, 1);
    expect(env.damageManager.getHealth(env.enemyId).currentHealth).toBeCloseTo(170, 5);
  });
});
