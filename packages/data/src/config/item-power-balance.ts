import type { WorldBandId } from "./world-bands.js";

export type ItemPowerTier = 3 | 4 | 5 | 6 | 7 | 8;

export interface WorldItemPowerProgression {
  readonly zoneStart: readonly number[];
  readonly zoneEnd: readonly number[];
}

export const ITEM_POWER_BY_TIER: Readonly<Record<ItemPowerTier, number>> = {
  3: 300,
  4: 400,
  5: 500,
  6: 600,
  7: 700,
  8: 800,
};

export const WEAPON_FAMILY_IP_PER_LEVEL = 0.5;
export const WEAPON_SPECIALIZATION_IP_PER_LEVEL = 1;
export const WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL = 0.2;

export const WORLD_ITEM_POWER_PROGRESSION: Readonly<Record<WorldBandId, WorldItemPowerProgression>> = {
  blue: { zoneStart: [300, 305, 315, 400, 455], zoneEnd: [305, 315, 400, 455, 510] },
  yellow: { zoneStart: [510, 535, 560, 585, 610], zoneEnd: [535, 560, 585, 610, 630] },
  orange: { zoneStart: [630, 655, 680, 705, 730], zoneEnd: [655, 680, 705, 730, 745] },
  red: { zoneStart: [745, 770, 795, 820, 845], zoneEnd: [770, 795, 820, 845, 860] },
  black: { zoneStart: [860, 885, 910, 935, 960], zoneEnd: [885, 910, 935, 960, 975] },
};

export const BLUE_WORLD_ITEM_POWER_PROGRESSION = WORLD_ITEM_POWER_PROGRESSION.blue;
export const YELLOW_WORLD_ITEM_POWER_PROGRESSION = WORLD_ITEM_POWER_PROGRESSION.yellow;
export const ORANGE_WORLD_ITEM_POWER_PROGRESSION = WORLD_ITEM_POWER_PROGRESSION.orange;
export const RED_WORLD_ITEM_POWER_PROGRESSION = WORLD_ITEM_POWER_PROGRESSION.red;
export const BLACK_WORLD_ITEM_POWER_PROGRESSION = WORLD_ITEM_POWER_PROGRESSION.black;

export const ZONE_RECOMMENDED_ITEM_POWER = BLUE_WORLD_ITEM_POWER_PROGRESSION.zoneStart;
