import type { EntityId } from "@game/core";
import {
  type AbilityId,
  type AbilityManager,
  type DamageManager,
  type EffectManager,
  type StatId,
  type StatsManager,
} from "@game/gameplay";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;

export interface MonsterAbilityRuntimeDependencies {
  readonly abilityManager: AbilityManager;
  readonly damageManager: DamageManager;
  readonly effectManager: EffectManager;
  readonly statsManager: StatsManager;
}

/**
 * Executes the first ready active ability learned by the monster.
 * Ability order is authored in monsterContentCatalog and therefore acts as
 * deterministic priority. No monster-name conditions belong here.
 */
export function tickMonsterAbilities(
  deps: MonsterAbilityRuntimeDependencies,
  monsterEntityId: EntityId,
  heroEntityId: EntityId,
  deltaTime: number,
  tick: number,
): boolean {
  if (
    !deps.damageManager.isAlive(monsterEntityId)
    || !deps.damageManager.isAlive(heroEntityId)
  ) {
    return false;
  }

  deps.abilityManager.tickAbilities(monsterEntityId, deltaTime);

  if (
    deps.effectManager.isStunned(monsterEntityId)
    || deps.effectManager.isSilenced(monsterEntityId)
  ) {
    return false;
  }

  const readyAbility = deps.abilityManager
    .getAbilities(monsterEntityId)
    .find((entry) => (
      entry.state === "ready"
      && (entry.definition.category ?? "active") === "active"
    ));
  if (readyAbility === undefined) return false;

  const execution = deps.abilityManager.executeIntent({
    entityId: monsterEntityId,
    abilityId: readyAbility.abilityId as AbilityId,
    primaryTarget: heroEntityId,
    tick,
  });
  if (!execution.ok) return false;

  const damageType = readyAbility.definition.damageType ?? "physical";
  const sourceStat = damageType === "magical"
    ? STAT_MAGICAL_DAMAGE
    : STAT_PHYSICAL_DAMAGE;
  const sourceDamage = deps.statsManager.getStat(monsterEntityId, sourceStat).computed;
  const damageMultiplier = readyAbility.definition.damageMultiplier ?? 1;

  const result = deps.damageManager.processDamage({
    source: monsterEntityId,
    target: heroEntityId,
    baseDamage: sourceDamage * damageMultiplier,
    damageType,
    source_type: "ability",
  });

  return result !== null;
}
