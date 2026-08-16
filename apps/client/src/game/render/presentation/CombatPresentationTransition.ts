import type { CombatState } from "@game/gameplay";

export type CombatPresentationTransition =
  | "initialize"
  | "hard_reset"
  | "victory_handoff"
  | "none";

export interface CombatPresentationTransitionInput {
  readonly previousCombatState: CombatState | undefined;
  readonly nextCombatState: CombatState;
  readonly previousEncounterKey: string | undefined;
  readonly nextEncounterKey: string;
}

/**
 * Pure presentation policy for encounter boundaries.
 * Gameplay state is already authoritative before this function runs.
 */
export function resolveCombatPresentationTransition(
  input: CombatPresentationTransitionInput,
): CombatPresentationTransition {
  if (input.previousEncounterKey === undefined) return "initialize";

  const encounterKeyChanged = input.nextEncounterKey !== input.previousEncounterKey;
  const enteredCombat = input.nextCombatState === "combat"
    && input.previousCombatState !== undefined
    && input.previousCombatState !== "combat";
  const leftDefeat = input.previousCombatState === "defeat"
    && input.nextCombatState !== "defeat";
  const changedEncounterOutsideCombat = encounterKeyChanged
    && input.nextCombatState !== "combat"
    && input.nextCombatState !== "victory";

  if (
    leftDefeat
    || changedEncounterOutsideCombat
    || (enteredCombat && input.previousCombatState !== "victory")
  ) {
    return "hard_reset";
  }

  if (encounterKeyChanged) return "victory_handoff";

  return "none";
}
