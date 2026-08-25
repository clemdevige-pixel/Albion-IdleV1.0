import type { EnemyVfxStyle } from "./EnemyVfxStyle";

const ENEMY_VFX_BY_VISUAL_MANIFEST_ID = {
  monster_undead_skeleton_archer: "undead_ranged",
  monster_undead_spectral_knight: "undead_spectral",
  boss_undead_lich: "undead_lich",
  monster_undead_skeleton_swordsman: "undead_melee",
  monster_undead_warrior: "undead_melee",
  monster_morgana_witch: "morgana_shadow",
  monster_morgana_suppressor: "morgana_bolt",
  monster_morgana_dark_knight: "morgana_knight",
  boss_morgana_high_priestess: "morgana_priestess",
  monster_keeper_warrior: "keeper_melee",
  monster_keeper_shaman: "keeper_spirit",
  monster_keeper_champion: "keeper_champion",
  boss_keeper_ancient: "keeper_ancient",
  monster_heretic_thug: "heretic_melee",
  monster_heretic_firestarter: "heretic_fire",
  monster_heretic_enforcer: "heretic_enforcer",
  boss_heretic_madmen: "heretic_madmen",
} as const satisfies Readonly<Record<string, EnemyVfxStyle>>;

export function resolveEnemyVfxStyle(visualManifestId: string): EnemyVfxStyle | undefined {
  return ENEMY_VFX_BY_VISUAL_MANIFEST_ID[visualManifestId as keyof typeof ENEMY_VFX_BY_VISUAL_MANIFEST_ID];
}

export function getAuthoredEnemyVfxManifestIds(): readonly string[] {
  return Object.keys(ENEMY_VFX_BY_VISUAL_MANIFEST_ID);
}
