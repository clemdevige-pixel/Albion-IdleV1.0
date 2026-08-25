export const ENEMY_VFX_STYLES = [
  "undead_melee",
  "undead_ranged",
  "undead_spectral",
  "undead_lich",
  "morgana_shadow",
  "morgana_bolt",
  "morgana_knight",
  "morgana_priestess",
  "keeper_melee",
  "keeper_spirit",
  "keeper_champion",
  "keeper_ancient",
  "heretic_melee",
  "heretic_fire",
  "heretic_enforcer",
  "heretic_madmen",
] as const;

export type EnemyVfxStyle = (typeof ENEMY_VFX_STYLES)[number];

export function isEnemyVfxStyle(value: unknown): value is EnemyVfxStyle {
  return typeof value === "string"
    && (ENEMY_VFX_STYLES as readonly string[]).includes(value);
}
