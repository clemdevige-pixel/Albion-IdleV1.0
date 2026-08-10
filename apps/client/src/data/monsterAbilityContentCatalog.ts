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
  undeadPiercingShot: "monster_ability_undead_piercing_shot",
  spectralKnightSoulCleave: "monster_ability_spectral_knight_soul_cleave",
  spectralKnightPhantomStrike: "monster_ability_spectral_knight_phantom_strike",
  lichSoulBolt: "monster_ability_lich_soul_bolt",
  lichDeathWave: "monster_ability_lich_death_wave",
  morganaWitchShadowBolt: "monster_ability_morgana_witch_shadow_bolt",
  morganaSuppressorBolt: "monster_ability_morgana_suppressor_bolt",
  morganaDarkKnightVoidCleave: "monster_ability_morgana_dark_knight_void_cleave",
  morganaDarkKnightCrushingAdvance: "monster_ability_morgana_dark_knight_crushing_advance",
  morganaHighPriestessDarkOrb: "monster_ability_morgana_high_priestess_dark_orb",
  morganaHighPriestessRitualBlast: "monster_ability_morgana_high_priestess_ritual_blast",
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
  [MONSTER_ABILITY_IDS.undeadPiercingShot]: {
    id: MONSTER_ABILITY_IDS.undeadPiercingShot,
    name: "Flèche perforante",
    category: "active",
    cooldown: 9,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.2,
  },
  [MONSTER_ABILITY_IDS.spectralKnightSoulCleave]: {
    id: MONSTER_ABILITY_IDS.spectralKnightSoulCleave,
    name: "Entaille spectrale",
    category: "active",
    cooldown: 9,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.5,
  },
  [MONSTER_ABILITY_IDS.spectralKnightPhantomStrike]: {
    id: MONSTER_ABILITY_IDS.spectralKnightPhantomStrike,
    name: "Frappe fantôme",
    category: "active",
    cooldown: 6,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.25,
  },
  [MONSTER_ABILITY_IDS.lichSoulBolt]: {
    id: MONSTER_ABILITY_IDS.lichSoulBolt,
    name: "Trait d’âme",
    category: "active",
    cooldown: 7,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    damageMultiplier: 1.4,
  },
  [MONSTER_ABILITY_IDS.lichDeathWave]: {
    id: MONSTER_ABILITY_IDS.lichDeathWave,
    name: "Vague de mort",
    category: "active",
    cooldown: 14,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    damageMultiplier: 1.75,
  },
  [MONSTER_ABILITY_IDS.morganaWitchShadowBolt]: {
    id: MONSTER_ABILITY_IDS.morganaWitchShadowBolt,
    name: "Trait d’ombre",
    category: "active",
    cooldown: 9,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    damageMultiplier: 1.2,
  },
  [MONSTER_ABILITY_IDS.morganaSuppressorBolt]: {
    id: MONSTER_ABILITY_IDS.morganaSuppressorBolt,
    name: "Carreau suppressif",
    category: "active",
    cooldown: 9,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.25,
  },
  [MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave]: {
    id: MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave,
    name: "Entaille du Néant",
    category: "active",
    cooldown: 9,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.55,
  },
  [MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance]: {
    id: MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance,
    name: "Avancée écrasante",
    category: "active",
    cooldown: 6,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    damageMultiplier: 1.3,
  },
  [MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb]: {
    id: MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb,
    name: "Orbe sombre",
    category: "active",
    cooldown: 7,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    damageMultiplier: 1.45,
  },
  [MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast]: {
    id: MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast,
    name: "Déflagration rituelle",
    category: "active",
    cooldown: 14,
    castTime: 0,
    resourceCost: {},
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    damageMultiplier: 1.8,
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
