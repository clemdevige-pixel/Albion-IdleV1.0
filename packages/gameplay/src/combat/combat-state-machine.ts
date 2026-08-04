import type { CombatResult, CombatState } from "./types.js";

// ---------------------------------------------------------------------------
// Allowed transitions (source → set of valid targets)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<CombatState, ReadonlySet<CombatState>> = new Map<
  CombatState,
  ReadonlySet<CombatState>
>([
  ["idle", new Set<CombatState>(["walking"])],
  ["walking", new Set<CombatState>(["combat", "paused"])],
  ["combat", new Set<CombatState>(["victory", "defeat"])],
  ["paused", new Set<CombatState>(["walking"])],
  ["victory", new Set<CombatState>(["walking"])],
  ["defeat", new Set<CombatState>(["idle"])],
]);

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function validateTransition(from: CombatState, to: CombatState): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  if (allowed === undefined) return false;
  return allowed.has(to);
}

/**
 * Attempts a state transition on a mutable session snapshot.
 * Returns the new state on success or a failure reason.
 */
export interface StatefulSession {
  getState(): CombatState;
  setState(state: CombatState): void;
}

export function transitionCombatState(
  session: StatefulSession,
  newState: CombatState,
): CombatResult<CombatState> {
  if (!validateTransition(session.getState(), newState)) {
    return { ok: false, reason: "not_in_combat" };
  }
  session.setState(newState);
  return { ok: true, value: newState };
}
