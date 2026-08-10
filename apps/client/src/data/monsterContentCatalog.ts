import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import type { DamageType, ZoneDefinitionId } from "@game/gameplay";
import { MONSTER_ABILITY_IDS } from "./monsterAbilityContentCatalog";

export type MonsterCategory = "normal" | "veteran" | "elite" | "boss";

export interface MonsterCombatModifiers {
  readonly health: number;
  readonly damage: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly attackSpeed: number;
  readonly damageType: DamageType;
}

export interface MonsterRewardDefinition {
  readonly silverMultiplier: number;
  readonly fameMultiplier: number;
  readonly lootTableId: string;
}

export interface MonsterContentDefinition {
  readonly id: string;
  readonly name: string;
  readonly faction: string;
  readonly category: MonsterCategory;
  readonly tier: 3 | 4;
  readonly visualManifestId: string;
  readonly combat: MonsterCombatModifiers;
  readonly rewards: MonsterRewardDefinition;
  readonly abilityIds: readonly string[];
  readonly tags: readonly string[];
}

export interface ZoneEncounterPool {
  readonly normal: readonly string[];
  readonly segmentBoss: string;
  readonly biomeBoss: string;
}

const DEFAULT_COMBAT: MonsterCombatModifiers = {
  health: 1, damage: 1, armor: 1, magicResistance: 1, attackSpeed: 0.8, damageType: "physical",
};

const DEFAULT_REWARDS: MonsterRewardDefinition = {
  silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_monster_generic",
};

export const MONSTER_IDS = {
  stonefangWolf: "monster_stonefang_wolf",
  razorwingHarpy: "monster_razorwing_harpy",
  morganaWitch: "monster_morgana_witch",
  morganaSuppressor: "monster_morgana_suppressor",
  morganaDarkKnight: "monster_morgana_dark_knight",
  morganaHighPriestess: "boss_morgana_high_priestess",
  undeadWarrior: "monster_undead_warrior",
  ancientRuneGolem: "boss_ancient_rune_golem",
  undeadSkeletonSwordsman: "monster_undead_skeleton_swordsman",
  undeadSkeletonArcher: "monster_undead_skeleton_archer",
  undeadSpectralKnight: "monster_undead_spectral_knight",
  undeadLich: "boss_undead_lich",
  keeperWarrior: "monster_keeper_warrior",
  keeperShaman: "monster_keeper_shaman",
  keeperChampion: "monster_keeper_champion",
  keeperAncient: "boss_keeper_ancient",
} as const;

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterContentDefinition>> = {
  [MONSTER_IDS.stonefangWolf]: {
    id: MONSTER_IDS.stonefangWolf, name: "Stonefang Wolf", faction: "Animal", category: "normal", tier: 3,
    visualManifestId: "monster_stonefang_wolf", combat: DEFAULT_COMBAT, rewards: DEFAULT_REWARDS, abilityIds: [], tags: ["beast", "roaming"],
  },
  [MONSTER_IDS.razorwingHarpy]: {
    id: MONSTER_IDS.razorwingHarpy, name: "Razorwing Harpy", faction: "Keeper", category: "normal", tier: 3,
    visualManifestId: "monster_razorwing_harpy", combat: DEFAULT_COMBAT, rewards: DEFAULT_REWARDS, abilityIds: [], tags: ["harpy", "roaming"],
  },
  [MONSTER_IDS.morganaWitch]: {
    id: MONSTER_IDS.morganaWitch, name: "Morgana Witch", faction: "Morgana", category: "normal", tier: 3,
    visualManifestId: "monster_morgana_witch",
    combat: { health: 0.9, damage: 1.05, armor: 0.75, magicResistance: 1.15, attackSpeed: 0.82, damageType: "magical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_morgana_normal" },
    abilityIds: [MONSTER_ABILITY_IDS.morganaWitchShadowBolt], tags: ["morgana", "caster", "ranged"],
  },
  [MONSTER_IDS.morganaSuppressor]: {
    id: MONSTER_IDS.morganaSuppressor, name: "Morgana Suppressor", faction: "Morgana", category: "normal", tier: 3,
    visualManifestId: "monster_morgana_suppressor",
    combat: { health: 0.9, damage: 1.08, armor: 0.85, magicResistance: 0.95, attackSpeed: 0.92, damageType: "physical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_morgana_normal" },
    abilityIds: [MONSTER_ABILITY_IDS.morganaSuppressorBolt], tags: ["morgana", "ranged", "crossbow"],
  },
  [MONSTER_IDS.morganaDarkKnight]: {
    id: MONSTER_IDS.morganaDarkKnight, name: "Morgana Dark Knight", faction: "Morgana", category: "elite", tier: 3,
    visualManifestId: "monster_morgana_dark_knight",
    combat: { health: 1.8, damage: 1.3, armor: 1.5, magicResistance: 1.25, attackSpeed: 0.75, damageType: "physical" },
    rewards: { silverMultiplier: 1.4, fameMultiplier: 1.4, lootTableId: "loot_morgana_elite" },
    abilityIds: [MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave, MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance], tags: ["morgana", "elite", "melee", "segment_boss"],
  },
  [MONSTER_IDS.morganaHighPriestess]: {
    id: MONSTER_IDS.morganaHighPriestess, name: "Morgana High Priestess", faction: "Morgana", category: "boss", tier: 3,
    visualManifestId: "boss_morgana_high_priestess",
    combat: { health: 2.2, damage: 1.4, armor: 0.8, magicResistance: 1.5, attackSpeed: 0.72, damageType: "magical" },
    rewards: { silverMultiplier: 1.8, fameMultiplier: 1.8, lootTableId: "loot_morgana_boss" },
    abilityIds: [MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb, MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast], tags: ["morgana", "caster", "boss", "biome_boss"],
  },
  [MONSTER_IDS.undeadWarrior]: {
    id: MONSTER_IDS.undeadWarrior, name: "Undead Warrior", faction: "Undead", category: "boss", tier: 3,
    visualManifestId: "monster_undead_warrior", combat: DEFAULT_COMBAT,
    rewards: { ...DEFAULT_REWARDS, lootTableId: "loot_monster_undead_boss" },
    abilityIds: [MONSTER_ABILITY_IDS.undeadHeavySlash], tags: ["undead", "segment_boss"],
  },
  [MONSTER_IDS.ancientRuneGolem]: {
    id: MONSTER_IDS.ancientRuneGolem, name: "Ancient Rune Golem", faction: "Keeper", category: "boss", tier: 4,
    visualManifestId: "boss_ancient_rune_golem", combat: DEFAULT_COMBAT,
    rewards: { ...DEFAULT_REWARDS, lootTableId: "loot_monster_keeper_boss" },
    abilityIds: [MONSTER_ABILITY_IDS.runeGolemCrushingBlow], tags: ["golem", "biome_boss"],
  },
  [MONSTER_IDS.undeadSkeletonSwordsman]: {
    id: MONSTER_IDS.undeadSkeletonSwordsman, name: "Squelette épéiste", faction: "Undead", category: "normal", tier: 3,
    visualManifestId: "monster_undead_skeleton_swordsman",
    combat: { health: 1.05, damage: 0.95, armor: 1.15, magicResistance: 0.85, attackSpeed: 0.85, damageType: "physical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_undead_normal" }, abilityIds: [], tags: ["undead", "skeleton", "melee"],
  },
  [MONSTER_IDS.undeadSkeletonArcher]: {
    id: MONSTER_IDS.undeadSkeletonArcher, name: "Squelette archer", faction: "Undead", category: "normal", tier: 3,
    visualManifestId: "monster_undead_skeleton_archer",
    combat: { health: 0.85, damage: 1.05, armor: 0.8, magicResistance: 0.9, attackSpeed: 0.95, damageType: "physical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_undead_normal" }, abilityIds: [MONSTER_ABILITY_IDS.undeadPiercingShot], tags: ["undead", "skeleton", "ranged"],
  },
  [MONSTER_IDS.undeadSpectralKnight]: {
    id: MONSTER_IDS.undeadSpectralKnight, name: "Chevalier spectral", faction: "Undead", category: "elite", tier: 3,
    visualManifestId: "monster_undead_spectral_knight",
    combat: { health: 1.75, damage: 1.25, armor: 1.45, magicResistance: 1.25, attackSpeed: 0.78, damageType: "physical" },
    rewards: { silverMultiplier: 1.4, fameMultiplier: 1.4, lootTableId: "loot_undead_elite" }, abilityIds: [MONSTER_ABILITY_IDS.spectralKnightSoulCleave, MONSTER_ABILITY_IDS.spectralKnightPhantomStrike], tags: ["undead", "spectral", "elite", "segment_boss"],
  },
  [MONSTER_IDS.undeadLich]: {
    id: MONSTER_IDS.undeadLich, name: "Liche", faction: "Undead", category: "boss", tier: 3,
    visualManifestId: "boss_undead_lich",
    combat: { health: 2.25, damage: 1.35, armor: 0.85, magicResistance: 1.55, attackSpeed: 0.7, damageType: "magical" },
    rewards: { silverMultiplier: 1.8, fameMultiplier: 1.8, lootTableId: "loot_undead_boss" }, abilityIds: [MONSTER_ABILITY_IDS.lichSoulBolt, MONSTER_ABILITY_IDS.lichDeathWave], tags: ["undead", "caster", "boss", "biome_boss"],
  },
  [MONSTER_IDS.keeperWarrior]: {
    id: MONSTER_IDS.keeperWarrior, name: "Guerrier Keeper", faction: "Keeper", category: "normal", tier: 4,
    visualManifestId: "monster_keeper_warrior",
    combat: { health: 1.1, damage: 1.0, armor: 1.15, magicResistance: 0.9, attackSpeed: 0.82, damageType: "physical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_keeper_normal" }, abilityIds: [], tags: ["keeper", "melee", "warrior"],
  },
  [MONSTER_IDS.keeperShaman]: {
    id: MONSTER_IDS.keeperShaman, name: "Chaman Keeper", faction: "Keeper", category: "normal", tier: 4,
    visualManifestId: "monster_keeper_shaman",
    combat: { health: 0.95, damage: 1.08, armor: 0.8, magicResistance: 1.2, attackSpeed: 0.8, damageType: "magical" },
    rewards: { silverMultiplier: 1, fameMultiplier: 1, lootTableId: "loot_keeper_normal" }, abilityIds: [MONSTER_ABILITY_IDS.keeperShamanSpiritBolt], tags: ["keeper", "caster", "shaman"],
  },
  [MONSTER_IDS.keeperChampion]: {
    id: MONSTER_IDS.keeperChampion, name: "Champion Keeper", faction: "Keeper", category: "elite", tier: 4,
    visualManifestId: "monster_keeper_champion",
    combat: { health: 1.9, damage: 1.3, armor: 1.55, magicResistance: 1.2, attackSpeed: 0.72, damageType: "physical" },
    rewards: { silverMultiplier: 1.4, fameMultiplier: 1.4, lootTableId: "loot_keeper_elite" }, abilityIds: [MONSTER_ABILITY_IDS.keeperChampionEarthbreaker, MONSTER_ABILITY_IDS.keeperChampionStoneGuard], tags: ["keeper", "elite", "melee", "segment_boss"],
  },
  [MONSTER_IDS.keeperAncient]: {
    id: MONSTER_IDS.keeperAncient, name: "Ancien Keeper", faction: "Keeper", category: "boss", tier: 4,
    visualManifestId: "boss_keeper_ancient",
    combat: { health: 2.35, damage: 1.4, armor: 1.25, magicResistance: 1.45, attackSpeed: 0.68, damageType: "magical" },
    rewards: { silverMultiplier: 1.8, fameMultiplier: 1.8, lootTableId: "loot_keeper_boss" }, abilityIds: [MONSTER_ABILITY_IDS.keeperAncientSpiritBurst, MONSTER_ABILITY_IDS.keeperAncientPrimalCrush], tags: ["keeper", "caster", "boss", "biome_boss"],
  },
};

const CURRENT_NORMAL_POOL = [MONSTER_IDS.stonefangWolf, MONSTER_IDS.razorwingHarpy, MONSTER_IDS.morganaWitch] as const;
const UNDEAD_PILOT_NORMAL_POOL = [MONSTER_IDS.undeadSkeletonSwordsman, MONSTER_IDS.undeadSkeletonArcher] as const;
const MORGANA_PILOT_NORMAL_POOL = [MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor] as const;
const KEEPER_PILOT_NORMAL_POOL = [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman] as const;

export const ZONE_ENCOUNTER_POOLS: Readonly<Record<string, ZoneEncounterPool>> = {
  zone_forest_t3: { normal: CURRENT_NORMAL_POOL, segmentBoss: MONSTER_IDS.undeadWarrior, biomeBoss: MONSTER_IDS.ancientRuneGolem },
  zone_swamp_t3: { normal: UNDEAD_PILOT_NORMAL_POOL, segmentBoss: MONSTER_IDS.undeadSpectralKnight, biomeBoss: MONSTER_IDS.undeadLich },
  zone_highland_t3: { normal: MORGANA_PILOT_NORMAL_POOL, segmentBoss: MONSTER_IDS.morganaDarkKnight, biomeBoss: MONSTER_IDS.morganaHighPriestess },
  zone_steppe_t4: { normal: CURRENT_NORMAL_POOL, segmentBoss: MONSTER_IDS.undeadWarrior, biomeBoss: MONSTER_IDS.ancientRuneGolem },
  zone_mountain_t4: { normal: KEEPER_PILOT_NORMAL_POOL, segmentBoss: MONSTER_IDS.keeperChampion, biomeBoss: MONSTER_IDS.keeperAncient },
};

export function getMonsterDefinition(id: string): MonsterContentDefinition {
  const definition = MONSTER_DEFINITIONS[id];
  if (definition === undefined) throw new Error(`Unknown monster definition: ${id}`);
  return definition;
}

export function applyMonsterRewardModifiers(baseRewards: { readonly silver: number; readonly fame: number }, monster: MonsterContentDefinition): { readonly silver: number; readonly fame: number } {
  return {
    silver: Math.max(0, Math.round(baseRewards.silver * monster.rewards.silverMultiplier)),
    fame: Math.max(0, Math.round(baseRewards.fame * monster.rewards.fameMultiplier)),
  };
}

export function getZoneEncounterPool(zoneDefId: ZoneDefinitionId): ZoneEncounterPool {
  const pool = ZONE_ENCOUNTER_POOLS[String(zoneDefId)];
  if (pool === undefined) throw new Error(`Missing monster encounter pool for zone: ${String(zoneDefId)}`);
  return pool;
}

export function resolveMonsterForEncounter(zoneDefId: ZoneDefinitionId, segmentIndex: number, encounterIndex: number, random: () => number = Math.random): MonsterContentDefinition {
  const pool = getZoneEncounterPool(zoneDefId);
  const isBoss = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const isBiomeBoss = isBoss && segmentIndex === SEGMENTS_PER_ZONE - 1;
  if (isBiomeBoss) return getMonsterDefinition(pool.biomeBoss);
  if (isBoss) return getMonsterDefinition(pool.segmentBoss);
  const index = Math.min(pool.normal.length - 1, Math.floor(Math.max(0, random()) * pool.normal.length));
  const monsterId = pool.normal[index] ?? pool.normal[0];
  if (monsterId === undefined) throw new Error(`Zone has no normal monsters: ${String(zoneDefId)}`);
  return getMonsterDefinition(monsterId);
}
