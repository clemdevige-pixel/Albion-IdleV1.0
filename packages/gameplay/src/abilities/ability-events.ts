import type { EntityId } from "@game/core";
import type { AbilityCategory, AbilityId } from "./types.js";

export interface AbilityEventMap {
  readonly AbilityExecuted: {
    readonly entityId: EntityId;
    readonly abilityId: AbilityId;
    readonly category: AbilityCategory;
    readonly target?: EntityId | undefined;
  };
  readonly AbilityCooldownStarted: {
    readonly entityId: EntityId;
    readonly abilityId: AbilityId;
    readonly duration: number;
  };
  readonly AbilityCooldownFinished: {
    readonly entityId: EntityId;
    readonly abilityId: AbilityId;
  };
  readonly PassiveActivated: {
    readonly entityId: EntityId;
    readonly abilityId: AbilityId;
  };
  readonly PassiveRemoved: {
    readonly entityId: EntityId;
    readonly abilityId: AbilityId;
  };
}
