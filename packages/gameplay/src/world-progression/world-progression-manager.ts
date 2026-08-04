import { EventBus } from "@game/core";
import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { WorldProgressionEventMap } from "./world-progression-events.js";
import type {
  UnlockEvaluationContext,
  WorldProgressionSaveState,
  WorldProgressionState,
  ZoneUnlockDefinition,
} from "./world-progression-types.js";
import { evaluateCondition } from "./unlock-conditions.js";

export class WorldProgressionManager {
  private readonly _bus = new EventBus<WorldProgressionEventMap>();
  private readonly _definitions = new Map<ZoneDefinitionId, ZoneUnlockDefinition>();
  private readonly _unlockedZones = new Set<ZoneDefinitionId>();
  private readonly _completedZones = new Set<ZoneDefinitionId>();

  // -----------------------------------------------------------------------
  // EventBus access
  // -----------------------------------------------------------------------

  get events(): EventBus<WorldProgressionEventMap> {
    return this._bus;
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  registerUnlockDefinition(def: ZoneUnlockDefinition): void {
    this._definitions.set(def.zoneDefId, def);
    if (def.unlockedByDefault === true) {
      this._unlock(def.zoneDefId);
    }
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  isUnlocked(zoneDefId: ZoneDefinitionId): boolean {
    return this._unlockedZones.has(zoneDefId);
  }

  getUnlockedZones(): ZoneDefinitionId[] {
    return [...this._unlockedZones];
  }

  getLockedZones(): ZoneDefinitionId[] {
    const locked: ZoneDefinitionId[] = [];
    for (const [id] of this._definitions) {
      if (!this._unlockedZones.has(id)) {
        locked.push(id);
      }
    }
    return locked;
  }

  getCompletedZones(): ZoneDefinitionId[] {
    return [...this._completedZones];
  }

  getState(): WorldProgressionState {
    return {
      unlockedZones: new Set(this._unlockedZones),
      completedZones: new Set(this._completedZones),
    };
  }

  // -----------------------------------------------------------------------
  // Serialisation
  // -----------------------------------------------------------------------

  getSaveState(): WorldProgressionSaveState {
    return {
      unlockedZones: [...this._unlockedZones],
      completedZones: [...this._completedZones],
    };
  }

  loadState(state: WorldProgressionSaveState): void {
    this._unlockedZones.clear();
    this._completedZones.clear();

    for (const id of state.unlockedZones) {
      this._unlockedZones.add(id);
    }
    for (const id of state.completedZones) {
      this._completedZones.add(id);
    }

    this._emitStateChanged();
  }

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  markCompleted(zoneDefId: ZoneDefinitionId): void {
    if (this._completedZones.has(zoneDefId)) return;

    this._completedZones.add(zoneDefId);
    this._bus.publish("zoneCompleted", { zoneDefId });

    // Re-evaluate all locked zones using completed zones as context.
    this.checkAndUnlock({
      currentTier: 0,
      currentFame: 0,
      completedZones: this._completedZones,
    });

    this._emitStateChanged();
  }

  checkAndUnlock(context: UnlockEvaluationContext): void {
    for (const [id, def] of this._definitions) {
      if (this._unlockedZones.has(id)) continue;
      if (def.conditions.length === 0) continue;

      const allMet = def.conditions.every((c) => evaluateCondition(c, context));
      if (allMet) {
        this._unlock(id);
      }
    }
  }

  clear(): void {
    this._definitions.clear();
    this._unlockedZones.clear();
    this._completedZones.clear();
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _unlock(zoneDefId: ZoneDefinitionId): void {
    if (this._unlockedZones.has(zoneDefId)) return;
    this._unlockedZones.add(zoneDefId);
    this._bus.publish("zoneUnlocked", { zoneDefId });
  }

  private _emitStateChanged(): void {
    this._bus.publish("progressionStateChanged", {
      unlockedCount: this._unlockedZones.size,
      completedCount: this._completedZones.size,
    });
  }
}
