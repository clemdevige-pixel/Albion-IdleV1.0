import type { EntityId } from "@game/core";
import {
  calculateDamage,
  type DamageManager,
  type EffectManager,
  type StatId,
  type StatsManager,
} from "@game/gameplay";
import { AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO } from "../data/combatAutomationPolicy.js";
import { getWeaponAbilityMechanics } from "../data/weaponAbilityMechanics.js";
import type { ClientAbilityDefinition } from "../data/weaponContentCatalog.js";

const PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
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

  const physicalDamage = deps.statsManager.getStat(deps.heroId, PHYSICAL_DAMAGE).computed;
  const magicalDamage = deps.statsManager.getStat(deps.heroId, MAGICAL_DAMAGE).computed;
  const armor = deps.statsManager.getStat(deps.targetId, ARMOR).computed;
  const magicResistance = deps.statsManager.getStat(deps.targetId, MAGIC_RESISTANCE).computed;
  const sourceDamage = deps.definition.damageType === "magical" ? magicalDamage : physicalDamage;

  const profile = getWeaponAbilityMechanics(deps.definition.id);
  const damageMechanics = profile?.mechanics.filter((mechanic) => mechanic.kind === "damage") ?? [];

  let estimatedImmediateDamage = 0;
  if (damageMechanics.length === 0) {
    estimatedImmediateDamage = calculateDamage(
      sourceDamage * deps.definition.bonusDamageRatio,
      { physicalDamage, magicalDamage },
      { armor, magicResistance },
      deps.definition.damageType,
    ).mitigatedDamage;
  } else {
    for (const mechanic of damageMechanics) {
      let totalRatio = mechanic.ratio;
      if (
        mechanic.bonusHealthBelow !== undefined
        && health.maxHealth > 0
        && health.currentHealth / health.maxHealth <= mechanic.bonusHealthBelow.ratio
      ) {
        totalRatio += mechanic.bonusHealthBelow.bonusRatio;
      }
      if (
        mechanic.bonusEffect !== undefined
        && deps.effectManager
          .getActiveEffects(deps.targetId)
          .some((effect) => effect.definition.id === mechanic.bonusEffect?.effectId)
      ) {
        totalRatio += mechanic.bonusEffect.bonusRatio;
      }

      const hits = Math.max(1, mechanic.hits ?? 1);
      for (let hit = 0; hit < hits; hit += 1) {
        estimatedImmediateDamage += calculateDamage(
          sourceDamage * (totalRatio / hits),
          { physicalDamage, magicalDamage },
          { armor, magicResistance },
          deps.definition.damageType,
        ).mitigatedDamage;
      }
    }
  }

  return estimatedImmediateDamage
    > health.currentHealth * AUTO_CAST_MAX_IMMEDIATE_DAMAGE_TO_REMAINING_HP_RATIO;
}
