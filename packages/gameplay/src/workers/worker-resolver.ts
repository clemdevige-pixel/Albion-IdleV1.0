import type { WorkerDefinition, WorkerDefinitionId } from "./worker-types.js";
import type { WorkerRegistry } from "./worker-registry.js";

export type ResolveWorkerResult =
  | { readonly ok: true; readonly definition: WorkerDefinition }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolves a worker definition from the registry.
 */
export function resolveWorkerDefinition(
  id: WorkerDefinitionId,
  registry: WorkerRegistry,
): ResolveWorkerResult {
  const definition = registry.get(id);
  if (definition === undefined) {
    return { ok: false, reason: `unknown_worker_definition:${id}` };
  }
  return { ok: true, definition };
}
