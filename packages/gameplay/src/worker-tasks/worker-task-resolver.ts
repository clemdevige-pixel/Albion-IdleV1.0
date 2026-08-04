import type {
  WorkerTaskDefinition,
  WorkerTaskDefinitionId,
} from "./worker-task-types.js";
import type { WorkerTaskRegistry } from "./worker-task-registry.js";

export type ResolveResult =
  | { readonly ok: true; readonly definition: WorkerTaskDefinition }
  | { readonly ok: false; readonly reason: string };

export function resolveWorkerTask(
  id: WorkerTaskDefinitionId,
  registry: WorkerTaskRegistry,
): ResolveResult {
  const definition = registry.get(id);
  if (definition === undefined) {
    return { ok: false, reason: `Task definition not found: ${id}` };
  }
  return { ok: true, definition };
}
