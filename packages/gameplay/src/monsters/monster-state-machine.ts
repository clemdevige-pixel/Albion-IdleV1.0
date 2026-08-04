import type { MonsterResult, MonsterState } from "./types.js";

// ---------------------------------------------------------------------------
// Allowed transitions (source -> set of valid targets)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<MonsterState, ReadonlySet<MonsterState>> = new Map<
  MonsterState,
  ReadonlySet<MonsterState>
>([
  ["alive", new Set<MonsterState>(["dead", "despawned"])],
  ["dead", new Set<MonsterState>(["despawned"])],
  ["despawned", new Set<MonsterState>()],
]);

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function validateMonsterTransition(from: MonsterState, to: MonsterState): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  if (allowed === undefined) return false;
  return allowed.has(to);
}

export function transitionMonsterState(
  currentState: MonsterState,
  newState: MonsterState,
): MonsterResult<MonsterState> {
  if (!validateMonsterTransition(currentState, newState)) {
    return { ok: false, reason: "invalid_transition" };
  }
  return { ok: true, value: newState };
}
