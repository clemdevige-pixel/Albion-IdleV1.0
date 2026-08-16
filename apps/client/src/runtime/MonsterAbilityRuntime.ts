import type { EntityId } from "@game/core";
import {
  type AbilityManager,
  type DamageManager,
  type DeathManager,
  type EffectManager,
  type StatId,
  type StatsManager,
} from "@game/gameplay";
import { canUseActiveAbility } from "./combatActionControl.js";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;

export interface MonsterAbilityRuntimeDependencies {
  readonly abilityManager: AbilityManager;
  readonly damageManager: DamageManager;
  readonly deathManager: DeathManager;
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

  if (!canUseActiveAbility(deps.effectManager, monsterEntityId)) return false;

  const readyAbility = deps.abilityManager
    .getAbilities(monsterEntityId)
    .find((entry) => (
      entry.state === "ready"
      && (entry.definition.category ?? "active") === "active"
    ));
  if (readyAbility === undefined) return false;

  const execution = deps.abilityManager.executeIntent({
    entityId: monsterEntityId,
    abilityId: readyAbility.abilityId,
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
    // DamageManager always adds the attacker's matching offensive stat.
    // Monster ability damageMultiplier is authored as the TOTAL hit multiplier
    // (1.35 = 135%), so only the bonus part belongs in baseDamage.
    baseDamage: sourceDamage * (damageMultiplier - 1),
    damageType,
    source_type: "ability",
  });

  if (result?.targetDied === true) {
    deps.deathManager.checkDeath(heroEntityId, monsterEntityId, tick);
  }

  return result !== null;
}
