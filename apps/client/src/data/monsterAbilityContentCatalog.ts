import type { AbilityDefinitionLike, DamageType } from "@game/gameplay";
import type { MonsterCategory } from "./monsterContentCatalog";

export interface MonsterAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly damageType: DamageType;
  /** Total source-damage multiplier applied when the ability lands. */
  readonly damageMultiplier: number;
}

export interface MonsterCategoryBehavior {
  readonly maxActiveAbilities: number;
  /** Applied to authored ability cooldowns. Lower values act more frequently. */
  readonly cooldownMultiplier: number;
}

export const MONSTER_CATEGORY_BEHAVIORS: Readonly<Record<MonsterCategory, MonsterCategoryBehavior>> = {
  normal: { maxActiveAbilities: 1, cooldownMultiplier: 1 },
  veteran: { maxActiveAbilities: 1, cooldownMultiplier: 0.9 },
  elite: { maxActiveAbilities: 2, cooldownMultiplier: 0.8 },
  boss: { maxActiveAbilities: 3, cooldownMultiplier: 0.75 },
};

export const MONSTER_ABILITY_IDS = {
  undeadHeavySlash: "monster_ability_undead_heavy_slash",
  runeGolemCrushingBlow: "monster_ability_rune_golem_crushing_blow",
} as const;

export const MONSTER_ABILITIES: Readonly<Record<string, MonsterAbilityDefinition>> = {
  [MONSTER_ABILITY_IDS.undeadHeavySlash]: {
    id: MONSTER_ABILITY_IDS.undeadHeavySlash,
    name: "Heavy Slash",
    category: "active",
    cooldown: 10,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.35,
  },
  [MONSTER_ABILITY_IDS.runeGolemCrushingBlow]: {
    id: MONSTER_ABILITY_IDS.runeGolemCrushingBlow,
    name: "Crushing Blow",
    category: "active",
    cooldown: 12,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.6,
  },
};

export function getMonsterAbilityDefinition(id: string): MonsterAbilityDefinition {
  const ability = MONSTER_ABILITIES[id];
  if (ability === undefined) throw new Error(`Unknown monster ability: ${id}`);
  return ability;
}

export function buildMonsterRuntimeAbilities(
  category: MonsterCategory,
  abilityIds: readonly string[],
): readonly MonsterAbilityDefinition[] {
  const behavior = MONSTER_CATEGORY_BEHAVIORS[category];
  if (abilityIds.length > behavior.maxActiveAbilities) {
    throw new Error(
      `Monster category ${category} supports at most ${String(behavior.maxActiveAbilities)} active abilities`,
    );
  }
  return abilityIds.map((abilityId) => {
    const ability = getMonsterAbilityDefinition(abilityId);
    return {
      ...ability,
      cooldown: ability.cooldown * behavior.cooldownMultiplier,
    };
  });
}
