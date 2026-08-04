import { defineComponent } from "@game/core";
import type { AbilityEntry, AbilityId } from "./types.js";

export interface AbilityData {
  readonly abilities: Map<AbilityId, AbilityEntry>;
}

export const AbilitiesComponent = defineComponent<AbilityData>("abilities");

/**
 * Runtime energy pool (AI_BIBLE 24_ABILITY_DATA "Resource Cost", 37_SAVE
 * "Current Energy"). Ability costs consume this pool — never base stats
 * (11_STAT §5: base statistics must not change during gameplay).
 */
export interface EnergyData {
  currentEnergy: number;
  maxEnergy: number;
}

export const EnergyComponent = defineComponent<EnergyData>("energy");
