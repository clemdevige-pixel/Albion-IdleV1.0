import type { ResourceState } from "./resource-types.js";

// ---------------------------------------------------------------------------
// Valid state transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<ResourceState, ReadonlySet<ResourceState>> = new Map<
  ResourceState,
  ReadonlySet<ResourceState>
>([
  ["available", new Set<ResourceState>(["depleted", "destroyed"])],
  ["depleted", new Set<ResourceState>(["respawning", "destroyed"])],
  ["respawning", new Set<ResourceState>(["available", "destroyed"])],
  // "destroyed" is terminal — no transitions out
  ["destroyed", new Set<ResourceState>()],
]);

/**
 * Returns whether a state transition from `from` to `to` is valid.
 */
export function canTransition(from: ResourceState, to: ResourceState): boolean {
  const targets = VALID_TRANSITIONS.get(from);
  if (targets === undefined) {
    return false;
  }
  return targets.has(to);
}
