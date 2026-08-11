import { defineComponent } from "@game/core";
import type { AbilityEntry, AbilityId } from "./types.js";

export interface AbilityData {
  readonly abilities: Map<AbilityId, AbilityEntry>;
}

export const AbilitiesComponent = defineComponent<AbilityData>("abilities");
