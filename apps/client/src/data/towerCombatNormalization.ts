import {
  TOWER_FACTION_TIER_COMBAT_MULTIPLIER,
  type TowerFactionId,
  type TowerTier,
} from "@game/data";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export interface TowerCombatNormalizationContext {
  readonly factionId: TowerFactionId;
  readonly tier: TowerTier;
}

export function applyTowerFactionCombatNormalization(
  context: TowerCombatNormalizationContext,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  const multiplier = TOWER_FACTION_TIER_COMBAT_MULTIPLIER[context.factionId][context.tier];

  return {
    hp: Math.round(profile.hp * multiplier),
    damage: Math.round(profile.damage * multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * multiplier),
    magicResistance: Math.round(profile.magicResistance * multiplier),
  };
}
