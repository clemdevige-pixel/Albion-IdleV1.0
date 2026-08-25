import { AUTHORED_AWAKENED_WEAPON_BALANCE } from "@game/data";
import type { AwakenedWeaponBalance } from "./types.js";

/**
 * V1 awakened weapon balance baseline from AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.
 * System logic consumes the authored data package instead of owning numeric rules.
 */
export const DEFAULT_AWAKENED_WEAPON_BALANCE: AwakenedWeaponBalance =
  AUTHORED_AWAKENED_WEAPON_BALANCE;
