import type { AbilityDefinitionLike, DamageType } from "@game/gameplay";
import type { MonsterCategory } from "./monsterContentCatalog";

export interface MonsterAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly damageType: DamageType;
  readonly damageMultiplier: number;
}

export interface MonsterCategoryBehavior {
  readonly maxActiveAbilities: number;
  readonly cooldownMultiplier: number;
}

export const MONSTER_CATEGORY_BEHAVIORS: Readonly<Record<MonsterCategory, MonsterCategoryBehavior>> = {
  normal: { maxActiveAbilities: 1, cooldownMultiplier: 1 },
  veteran: { maxActiveAbilities: 1, cooldownMultiplier: 0.9 },
  elite: { maxActiveAbilities: 2, cooldownMultiplier: 1 },
  boss: { maxActiveAbilities: 3, cooldownMultiplier: 0.9 },
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
  keeperShamanSpiritBolt: "monster_ability_keeper_shaman_spirit_bolt",
  keeperChampionEarthbreaker: "monster_ability_keeper_champion_earthbreaker",
  keeperChampionStoneGuard: "monster_ability_keeper_champion_stone_guard",
  keeperAncientSpiritBurst: "monster_ability_keeper_ancient_spirit_burst",
  keeperAncientPrimalCrush: "monster_ability_keeper_ancient_primal_crush",
} as const;

const ability = (id: string, name: string, cooldown: number, damageType: DamageType, damageMultiplier: number, interruptible = false): MonsterAbilityDefinition => ({
  id, name, category: "active", cooldown, castTime: 0, resourceCost: {}, interruptible,
  targetRule: "current_target", damageType, damageMultiplier,
});

export const MONSTER_ABILITIES: Readonly<Record<string, MonsterAbilityDefinition>> = {
  [MONSTER_ABILITY_IDS.undeadHeavySlash]: ability(MONSTER_ABILITY_IDS.undeadHeavySlash, "Heavy Slash", 10, "physical", 1.35),
  [MONSTER_ABILITY_IDS.runeGolemCrushingBlow]: ability(MONSTER_ABILITY_IDS.runeGolemCrushingBlow, "Crushing Blow", 12, "physical", 1.6),
  [MONSTER_ABILITY_IDS.undeadPiercingShot]: ability(MONSTER_ABILITY_IDS.undeadPiercingShot, "Flèche perforante", 9, "physical", 1.2, true),
  [MONSTER_ABILITY_IDS.spectralKnightSoulCleave]: ability(MONSTER_ABILITY_IDS.spectralKnightSoulCleave, "Entaille spectrale", 9, "physical", 1.5),
  [MONSTER_ABILITY_IDS.spectralKnightPhantomStrike]: ability(MONSTER_ABILITY_IDS.spectralKnightPhantomStrike, "Frappe fantôme", 6, "physical", 1.25),
  [MONSTER_ABILITY_IDS.lichSoulBolt]: ability(MONSTER_ABILITY_IDS.lichSoulBolt, "Trait d’âme", 7, "magical", 1.4, true),
  [MONSTER_ABILITY_IDS.lichDeathWave]: ability(MONSTER_ABILITY_IDS.lichDeathWave, "Vague de mort", 14, "magical", 1.75, true),
  [MONSTER_ABILITY_IDS.morganaWitchShadowBolt]: ability(MONSTER_ABILITY_IDS.morganaWitchShadowBolt, "Trait d’ombre", 9, "magical", 1.2, true),
  [MONSTER_ABILITY_IDS.morganaSuppressorBolt]: ability(MONSTER_ABILITY_IDS.morganaSuppressorBolt, "Carreau suppressif", 9, "physical", 1.25, true),
  [MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave]: ability(MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave, "Entaille du Néant", 9, "physical", 1.55),
  [MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance]: ability(MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance, "Avancée écrasante", 6, "physical", 1.3),
  [MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb]: ability(MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb, "Orbe sombre", 7, "magical", 1.45, true),
  [MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast]: ability(MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast, "Déflagration rituelle", 14, "magical", 1.8, true),
  [MONSTER_ABILITY_IDS.keeperShamanSpiritBolt]: ability(MONSTER_ABILITY_IDS.keeperShamanSpiritBolt, "Trait spirituel", 9, "magical", 1.25, true),
  [MONSTER_ABILITY_IDS.keeperChampionEarthbreaker]: ability(MONSTER_ABILITY_IDS.keeperChampionEarthbreaker, "Brise-terre", 9, "physical", 1.55),
  [MONSTER_ABILITY_IDS.keeperChampionStoneGuard]: ability(MONSTER_ABILITY_IDS.keeperChampionStoneGuard, "Frappe tellurique", 6, "physical", 1.3),
  [MONSTER_ABILITY_IDS.keeperAncientSpiritBurst]: ability(MONSTER_ABILITY_IDS.keeperAncientSpiritBurst, "Déchaînement spirituel", 8, "magical", 1.5, true),
  [MONSTER_ABILITY_IDS.keeperAncientPrimalCrush]: ability(MONSTER_ABILITY_IDS.keeperAncientPrimalCrush, "Écrasement primordial", 14, "physical", 1.85),
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
  return abilityIds.map((abilityId) => ({ ...getMonsterAbilityDefinition(abilityId), cooldown: getMonsterAbilityDefinition(abilityId).cooldown * behavior.cooldownMultiplier }));
}
