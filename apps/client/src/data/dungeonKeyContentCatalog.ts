/**
 * @deprecated Dungeon key identifiers are canonical in @game/data.
 * Keep this compatibility export only for legacy client modules that have not
 * yet been touched; new code must import directly from @game/data.
 */
export {
  DUNGEON_KEY_TIER_BY_WORLD_BAND,
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
  getDungeonKeyTierForWorldBand,
  type DungeonKeyTier,
} from "@game/data";
