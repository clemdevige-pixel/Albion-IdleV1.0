import type { CharacterState } from "./types.js";

const validTransitions: ReadonlyMap<CharacterState, ReadonlySet<CharacterState>> = new Map([
  ["idle", new Set<CharacterState>(["moving", "busy", "dead"])],
  ["moving", new Set<CharacterState>(["idle", "busy", "dead"])],
  ["busy", new Set<CharacterState>(["idle", "dead"])],
  ["dead", new Set<CharacterState>(["idle"])],
]);

export function isValidTransition(from: CharacterState, to: CharacterState): boolean {
  if (from === to) return true;
  return validTransitions.get(from)?.has(to) ?? false;
}

export function transitionState(current: CharacterState, target: CharacterState): CharacterState {
  if (current === target) return current;
  if (!isValidTransition(current, target)) {
    throw new Error(`Invalid state transition: ${current} → ${target}`);
  }
  return target;
}
