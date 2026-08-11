import { EventBus, World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  CombatOrchestrator,
  CombatService,
  DamageManager,
  DeathManager,
  EffectManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  createDefaultStatRegistry,
  type DamageEventMap,
} from "@game/gameplay";

/** Stable, framework-agnostic foundation shared by all client combat runtimes. */
export function createCombatFoundation() {
  const world = new World(createRuntimeServices());
  const statRegistry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, statRegistry);

  const damageManager = new DamageManager(world, statsManager);
  const damageEventBus = new EventBus<DamageEventMap>();
  damageManager.setEventBus(damageEventBus);

  const deathManager = new DeathManager(world, damageManager);
  const targetValidator = new TargetValidator(world);
  const targetManager = new TargetManager(world, targetValidator);
  const autoAttackManager = new AutoAttackManager(
    world,
    targetManager,
    statsManager,
  );
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const combatService = new CombatService(
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    statsManager,
  );
  const orchestrator = new CombatOrchestrator({
    combatService,
    effectManager,
    abilityManager,
  });
  orchestrator.initialize();

  return {
    world,
    statsManager,
    damageManager,
    damageEventBus,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
    effectManager,
    combatService,
    orchestrator,
  };
}

export type CombatFoundation = ReturnType<typeof createCombatFoundation>;
