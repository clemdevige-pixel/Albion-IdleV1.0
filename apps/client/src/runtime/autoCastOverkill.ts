import type { EntityId } from "@game/core";
import {
  calculateDamage,
  type DamageManager,
  type EffectManager,
  type StatId,
  type StatsManager,
} from "@game/gameplay";
import { isExcessiveAutoCastOverkill } from "../data/combatAutomationPolicy.js";
import type { ClientAbilityDefinition } from "../data/weaponContentCatalog.js";
import { getAbilityHitBaseDamage, resolveAbilityDamageRatio } from "./WeaponAbilityMechanicsRuntime.js";

const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const ABILITY_POWER = "stat_ability_power" as StatId;
const ARMOR = "stat_armor" as StatId;
const MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

export interface AutoCastOverkillDeps {
  readonly heroId: EntityId;
  readonly targetId: EntityId;
  readonly definition: ClientAbilityDefinition;
  readonly damageManager: DamageManager;
  readonly effectManager: EffectManager;
  readonly statsManager: StatsManager;
}

export function shouldHoldAutoCastForOverkill(deps: AutoCastOverkillDeps): boolean {
  if (!deps.damageManager.isAlive(deps.targetId)) return true;

  const health = deps.damageManager.getHealth(deps.targetId);
  if (health.currentHealth <= 0) return true;

  // A setup-gated payoff is only available while its authored effect window is
  // active. Once that condition is satisfied, preserving the combo contract is
  // more important than generic overkill conservation. The auto-rule itself
  // already prevents these abilities from firing outside their setup window.
  if (deps.definition.mechanics.autoRule?.kind === "target_has_effect") return false;

  const physicalDamage = deps.statsManager.getStat(deps.heroId, PHYSICAL_DAMAGE).computed;
  const magicalDamage = deps.statsManager.getStat(deps.heroId, MAGICAL_DAMAGE).computed;
  const abilityPower = deps.statsManager.getStat(deps.heroId, ABILITY_POWER).computed;
  const armor = deps.statsManager.getStat(deps.targetId, ARMOR).computed;
  const magicResistance = deps.statsManager.getStat(deps.targetId, MAGIC_RESISTANCE).computed;
  const sourceDamage = deps.definition.damageType === "magical" ? magicalDamage : physicalDamage;
  const healthRatio = health.maxHealth > 0 ? health.currentHealth / health.maxHealth : undefined;
  const activeEffectIds = new Set(
    deps.effectManager.getActiveEffects(deps.targetId).map((effect) => effect.definition.id),
  );

  const damageMechanics = deps.definition.mechanics.mechanics.filter(
    (mechanic) => mechanic.kind === "damage",
  );
  let estimatedImmediateDamage = 0;

  for (const mechanic of damageMechanics) {
    const totalRatio = resolveAbilityDamageRatio(
      mechanic,
      healthRatio,
      (effectId) => activeEffectIds.has(effectId),
    );
    const hits = Math.max(1, mechanic.hits ?? 1);
    const baseDamagePerHit = getAbilityHitBaseDamage(
      sourceDamage,
      totalRatio,
      hits,
      abilityPower,
    );

    for (let hit = 0; hit < hits; hit += 1) {
      estimatedImmediateDamage += calculateDamage(
        baseDamagePerHit,
        { physicalDamage, magicalDamage },
        { armor, magicResistance },
        deps.definition.damageType,
      ).mitigatedDamage;
    }
  }

  return isExcessiveAutoCastOverkill(estimatedImmediateDamage, health.currentHealth);
}
