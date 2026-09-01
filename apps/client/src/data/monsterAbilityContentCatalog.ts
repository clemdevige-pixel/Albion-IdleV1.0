import {
  MONSTER_ABILITIES,
  MONSTER_ABILITY_IDS,
  MONSTER_CATEGORY_BEHAVIORS,
  type AuthoredMonsterAbilityDefinition,
  type AuthoredMonsterCategoryBehavior,
} from "@game/data";
import type { AbilityDefinitionLike } from "@game/gameplay";
import type { MonsterCategory } from "./monsterContentCatalog";

export type MonsterAbilityDefinition = AuthoredMonsterAbilityDefinition & AbilityDefinitionLike;
export type MonsterCategoryBehavior = AuthoredMonsterCategoryBehavior;

export {
  MONSTER_ABILITIES,
  MONSTER_ABILITY_IDS,
  MONSTER_CATEGORY_BEHAVIORS,
};

export function getMonsterAbilityDefinition(id: string): MonsterAbilityDefinition {
  const result = MONSTER_ABILITIES[id];
  if (result === undefined) throw new Error(`Unknown monster ability: ${id}`);
  return result;
}

export function buildMonsterRuntimeAbilities(category: MonsterCategory, abilityIds: readonly string[]): readonly MonsterAbilityDefinition[] {
  const behavior = MONSTER_CATEGORY_BEHAVIORS[category];
  if (abilityIds.length > behavior.maxActiveAbilities) {
    throw new Error(`Monster category ${category} supports at most ${String(behavior.maxActiveAbilities)} active abilities`);
  }
  return abilityIds.map((abilityId) => {
    const definition = getMonsterAbilityDefinition(abilityId);
    return {
      ...definition,
      cooldown: definition.cooldown * behavior.cooldownMultiplier,
    };
  });
}
