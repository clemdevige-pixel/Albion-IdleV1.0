import type {
  WorkerTaskDefinition,
  WorkerTaskDefinitionId,
  WorkerTaskCategory,
} from "./worker-task-types.js";
import type { WorkerProfession } from "../workers/index.js";

export class WorkerTaskRegistry {
  private readonly _definitions = new Map<WorkerTaskDefinitionId, WorkerTaskDefinition>();

  register(def: WorkerTaskDefinition): void {
    this._definitions.set(def.id, def);
  }

  get(id: WorkerTaskDefinitionId): WorkerTaskDefinition | undefined {
    return this._definitions.get(id);
  }

  has(id: WorkerTaskDefinitionId): boolean {
    return this._definitions.has(id);
  }

  getAll(): readonly WorkerTaskDefinition[] {
    return [...this._definitions.values()];
  }

  getByCategory(category: WorkerTaskCategory): readonly WorkerTaskDefinition[] {
    return [...this._definitions.values()].filter((d) => d.category === category);
  }

  getByProfession(profession: WorkerProfession): readonly WorkerTaskDefinition[] {
    return [...this._definitions.values()].filter(
      (d) => d.requiredProfession === profession,
    );
  }

  clear(): void {
    this._definitions.clear();
  }
}
