import type { AbilityState } from "./types.js";

const VALID_TRANSITIONS: ReadonlyMap<AbilityState, ReadonlySet<AbilityState>> = new Map([
  ["ready", new Set<AbilityState>(["casting", "disabled"])],
  ["casting", new Set<AbilityState>(["ready", "cooldown"])],
  ["cooldown", new Set<AbilityState>(["ready"])],
  ["disabled", new Set<AbilityState>(["ready"])],
]);

export function canTransition(from: AbilityState, to: AbilityState): boolean {
  return VALID_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function transition(from: AbilityState, to: AbilityState): AbilityState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid ability state transition: ${from} -> ${to}`);
  }
  return to;
}
