export type AuthoredMonsterCategory = "normal" | "veteran" | "elite" | "boss";
export type AuthoredMonsterDamageType = "physical" | "magical";

export interface AuthoredMonsterCategoryBehavior {
  readonly maxActiveAbilities: number;
  readonly cooldownMultiplier: number;
}

export interface AuthoredMonsterAbilityDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: "active";
  readonly cooldown: number;
  readonly castTime: number;
  readonly resourceCost: Readonly<Record<string, number>>;
  readonly interruptible: boolean;
  readonly targetRule: "current_target";
  readonly damageType: AuthoredMonsterDamageType;
  readonly damageMultiplier: number;
}

export const MONSTER_CATEGORY_BEHAVIORS: Readonly<Record<AuthoredMonsterCategory, AuthoredMonsterCategoryBehavior>> = {
  normal: { maxActiveAbilities: 1, cooldownMultiplier: 1 },
  veteran: { maxActiveAbilities: 1, cooldownMultiplier: 0.9 },
  elite: { maxActiveAbilities: 2, cooldownMultiplier: 1 },
  boss: { maxActiveAbilities: 3, cooldownMultiplier: 0.9 },
};

export const MONSTER_ABILITY_IDS = {
  undeadHeavySlash: "monster_ability_undead_heavy_slash",
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
  hereticThugDirtyStrike: "monster_ability_heretic_thug_dirty_strike",
  hereticFirestarterFirebomb: "monster_ability_heretic_firestarter_firebomb",
  hereticEnforcerHeavySmash: "monster_ability_heretic_enforcer_heavy_smash",
  hereticEnforcerRush: "monster_ability_heretic_enforcer_rush",
  hereticMadmenWildSwing: "monster_ability_heretic_madmen_wild_swing",
  hereticMadmenPowderBlast: "monster_ability_heretic_madmen_powder_blast",
} as const;

const ability = (
  id: string,
  name: string,
  cooldown: number,
  damageType: AuthoredMonsterDamageType,
  damageMultiplier: number,
  interruptible = false,
): AuthoredMonsterAbilityDefinition => ({
  id,
  name,
  category: "active",
  cooldown,
  castTime: 0,
  resourceCost: {},
  interruptible,
  targetRule: "current_target",
  damageType,
  damageMultiplier,
});

export const MONSTER_ABILITIES: Readonly<Record<string, AuthoredMonsterAbilityDefinition>> = {
  [MONSTER_ABILITY_IDS.undeadHeavySlash]: ability(MONSTER_ABILITY_IDS.undeadHeavySlash, "Heavy Slash", 10, "physical", 1.35),
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
  [MONSTER_ABILITY_IDS.hereticThugDirtyStrike]: ability(MONSTER_ABILITY_IDS.hereticThugDirtyStrike, "Coup vicieux", 9, "physical", 1.2),
  [MONSTER_ABILITY_IDS.hereticFirestarterFirebomb]: ability(MONSTER_ABILITY_IDS.hereticFirestarterFirebomb, "Bombe incendiaire", 9, "magical", 1.25, true),
  [MONSTER_ABILITY_IDS.hereticEnforcerHeavySmash]: ability(MONSTER_ABILITY_IDS.hereticEnforcerHeavySmash, "Fracassement lourd", 9, "physical", 1.55),
  [MONSTER_ABILITY_IDS.hereticEnforcerRush]: ability(MONSTER_ABILITY_IDS.hereticEnforcerRush, "Ruée brutale", 6, "physical", 1.3),
  [MONSTER_ABILITY_IDS.hereticMadmenWildSwing]: ability(MONSTER_ABILITY_IDS.hereticMadmenWildSwing, "Frappe démente", 8, "physical", 1.5),
  [MONSTER_ABILITY_IDS.hereticMadmenPowderBlast]: ability(MONSTER_ABILITY_IDS.hereticMadmenPowderBlast, "Explosion de poudre", 14, "physical", 1.8, true),
};
