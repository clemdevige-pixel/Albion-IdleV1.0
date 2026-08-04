import type { CraftStationDefinition, CraftStationId } from "./craft-station-types.js";
import type { CraftStationRegistry } from "./craft-station-registry.js";

export type CraftStationResolveResult =
  | { readonly ok: true; readonly station: CraftStationDefinition }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolves a craft station by id from the registry.
 */
export function resolveCraftStation(
  id: CraftStationId,
  registry: CraftStationRegistry,
): CraftStationResolveResult {
  const station = registry.get(id);
  if (station === undefined) {
    return { ok: false, reason: `Craft station "${id}" not found` };
  }
  return { ok: true, station };
}
