import type { EventBus, Unsubscribe } from "@game/core";
import type { BiomeResolver } from "../biomes/biome-resolver.js";
import type { BiomeRegistry } from "../biomes/biome-registry.js";
import type { ExplorationManager } from "../exploration/exploration-manager.js";
import type { WorldProgressionManager } from "../world-progression/world-progression-manager.js";
import type { ZoneManager } from "../zones/zone-manager.js";
import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { WorldIntegrationEventMap } from "./world-integration-events.js";
import type { WorldSaveState, WorldZoneChangedEvent } from "./world-integration-types.js";

export interface WorldCoordinatorDeps {
  readonly zoneManager: ZoneManager;
  readonly biomeRegistry: BiomeRegistry;
  readonly biomeResolver: BiomeResolver;
  readonly progressionManager: WorldProgressionManager;
  readonly explorationManager: ExplorationManager;
  readonly eventBus: EventBus<WorldIntegrationEventMap>;
}

/**
 * Orchestrates all Bloc 12 subsystems (zones, biomes, progression,
 * exploration) behind a single facade.
 */
export class WorldCoordinator {
  readonly #deps: WorldCoordinatorDeps;
  readonly #unsubs: Unsubscribe[] = [];

  constructor(deps: WorldCoordinatorDeps) {
    this.#deps = deps;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Subscribe to zone events and wire up auto-biome resolution. */
  initialize(): void {
    const unsub = this.#deps.zoneManager.events.subscribe(
      "zoneActivated",
      (event) => {
        const biome = this.#deps.biomeResolver.resolve(event.definitionId);
        // Auto-resolve biome on zone activation — integration glue only.
        void biome; // resolved biome consumed via changeZone flow
      },
    );
    this.#unsubs.push(unsub);
    this.#deps.eventBus.publish("worldInitialized", undefined);
  }

  /** Clean up all subscriptions. */
  dispose(): void {
    for (const unsub of this.#unsubs) {
      unsub();
    }
    this.#unsubs.length = 0;
  }

  // ── Zone change orchestration ────────────────────────────────────────────

  /**
   * Orchestrated zone change:
   * 1. Check unlock
   * 2. Change zone via ZoneManager
   * 3. Resolve biome
   * 4. Record exploration
   * 5. Emit worldZoneChanged
   */
  changeZone(
    zoneDefId: ZoneDefinitionId,
    currentTick: number,
  ): { readonly ok: true; readonly event: WorldZoneChangedEvent } | { readonly ok: false; readonly reason: string } {
    // 1. Check if zone is unlocked
    if (!this.#deps.progressionManager.isUnlocked(zoneDefId)) {
      return { ok: false, reason: "zone_locked" };
    }

    // 2. Change zone via ZoneManager
    const result = this.#deps.zoneManager.changeZone(zoneDefId);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    // 3. Resolve biome
    const biome = this.#deps.biomeResolver.resolve(zoneDefId);
    const biomeId = biome?.id;

    // 4. Record exploration
    const isFirstVisit = !this.#deps.explorationManager.isDiscovered(zoneDefId);
    this.#deps.explorationManager.enterZone(zoneDefId, currentTick);

    // 5. Emit event
    const event: WorldZoneChangedEvent = {
      zoneDefId,
      zoneId: result.zoneId,
      biomeId,
      isFirstVisit,
    };
    this.#deps.eventBus.publish("worldZoneChanged", event);

    return { ok: true, event };
  }

  // ── State ────────────────────────────────────────────────────────────────

  /** Combined serializable state from all subsystems. */
  getWorldState(): WorldSaveState {
    return {
      progression: this.#deps.progressionManager.getSaveState(),
      exploration: this.#deps.explorationManager.getState(),
    };
  }

  /** Restore all subsystems from save. */
  loadWorldState(state: WorldSaveState): void {
    this.#deps.progressionManager.loadState(state.progression);
    this.#deps.explorationManager.loadState(state.exploration);
    this.#deps.eventBus.publish("worldStateLoaded", undefined);
  }

  /** Reset all subsystems. */
  clearAll(): void {
    this.#deps.progressionManager.clear();
    this.#deps.explorationManager.clear();
    this.#deps.eventBus.publish("worldCleared", undefined);
  }
}
