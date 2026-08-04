import { EventBus } from "@game/core";
import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type {
  ZoneDiscoveryRecord,
  ExplorationSaveState,
} from "./exploration-types.js";
import type { ExplorationEventMap } from "./exploration-events.js";

export class ExplorationManager {
  readonly #discoveries = new Map<ZoneDefinitionId, ZoneDiscoveryRecord>();
  readonly events = new EventBus<ExplorationEventMap>();

  enterZone(zoneDefId: ZoneDefinitionId, currentTick: number): void {
    const existing = this.#discoveries.get(zoneDefId);
    if (existing === undefined) {
      const record: ZoneDiscoveryRecord = {
        zoneDefId,
        firstDiscoveredAt: currentTick,
        visitCount: 1,
        lastVisitedAt: currentTick,
      };
      this.#discoveries.set(zoneDefId, record);
      this.events.publish("zoneDiscovered", record);
    } else {
      const updated: ZoneDiscoveryRecord = {
        ...existing,
        visitCount: existing.visitCount + 1,
        lastVisitedAt: currentTick,
      };
      this.#discoveries.set(zoneDefId, updated);
      this.events.publish("zoneRevisited", updated);
    }
    this.events.publish("explorationStateChanged", undefined);
  }

  isDiscovered(zoneDefId: ZoneDefinitionId): boolean {
    return this.#discoveries.has(zoneDefId);
  }

  getDiscovery(zoneDefId: ZoneDefinitionId): ZoneDiscoveryRecord | undefined {
    return this.#discoveries.get(zoneDefId);
  }

  getDiscoveredZones(): ZoneDefinitionId[] {
    return [...this.#discoveries.keys()];
  }

  getDiscoveryCount(): number {
    return this.#discoveries.size;
  }

  getState(): ExplorationSaveState {
    return { discoveries: [...this.#discoveries.values()] };
  }

  loadState(state: ExplorationSaveState): void {
    this.#discoveries.clear();
    for (const record of state.discoveries) {
      this.#discoveries.set(record.zoneDefId, record);
    }
  }

  clear(): void {
    this.#discoveries.clear();
  }
}
