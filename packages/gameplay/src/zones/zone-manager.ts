import { EventBus } from "@game/core";
import type { ZoneEventMap } from "./zone-events.js";
import { ZoneRegistry } from "./zone-registry.js";
import type {
  ZoneDefinition,
  ZoneDefinitionId,
  ZoneId,
  ZoneInstance,
  ZoneStatus,
  ZoneTransitionResult,
} from "./zone-types.js";
import { asZoneId } from "./zone-types.js";

let nextZoneCounter = 0;

function generateZoneId(definitionId: ZoneDefinitionId): ZoneId {
  nextZoneCounter += 1;
  return asZoneId(`zone_${definitionId}_${String(nextZoneCounter)}`);
}

/** Reset the internal counter — test-only. */
export function _resetZoneCounter(): void {
  nextZoneCounter = 0;
}

/**
 * Manages zone lifecycle: loading, activating, deactivating, unloading,
 * and transitioning between zones. At most one zone is active at a time.
 *
 * Data-driven, pure gameplay — no React/Phaser.
 */
export class ZoneManager {
  readonly events: EventBus<ZoneEventMap> = new EventBus<ZoneEventMap>();
  readonly registry: ZoneRegistry = new ZoneRegistry();

  readonly #zones = new Map<ZoneId, ZoneInstance>();
  #activeZoneId: ZoneId | undefined;

  // ── Registration ─────────────────────────────────────────────────────────

  registerDefinition(definition: ZoneDefinition): void {
    this.registry.register(definition);
    this.events.publish("zoneDefinitionRegistered", {
      definitionId: definition.id,
      name: definition.name,
      tier: definition.tier,
    });
  }

  // ── Loading / Unloading ──────────────────────────────────────────────────

  /** Creates a zone instance from a registered definition. */
  loadZone(definitionId: ZoneDefinitionId): ZoneTransitionResult {
    const definition = this.registry.get(definitionId);
    if (definition === undefined) {
      return { ok: false, reason: "definition_not_found" };
    }

    const zoneId = generateZoneId(definitionId);
    const instance: ZoneInstance = {
      id: zoneId,
      definitionId,
      status: "inactive",
    };
    this.#zones.set(zoneId, instance);
    this.events.publish("zoneLoaded", { zoneId, definitionId });
    return { ok: true, zoneId };
  }

  /** Unloads a zone. It must be inactive first. */
  unloadZone(zoneId: ZoneId): ZoneTransitionResult {
    const instance = this.#zones.get(zoneId);
    if (instance === undefined) {
      return { ok: false, reason: "zone_not_found" };
    }
    if (instance.status === "active") {
      return { ok: false, reason: "zone_already_active" };
    }
    this.#zones.delete(zoneId);
    this.events.publish("zoneUnloaded", {
      zoneId,
      definitionId: instance.definitionId,
    });
    return { ok: true, zoneId };
  }

  // ── Activation / Deactivation ────────────────────────────────────────────

  activateZone(zoneId: ZoneId): ZoneTransitionResult {
    const instance = this.#zones.get(zoneId);
    if (instance === undefined) {
      return { ok: false, reason: "zone_not_found" };
    }
    if (instance.status === "active") {
      return { ok: false, reason: "zone_already_active" };
    }

    // Deactivate current active zone first
    if (this.#activeZoneId !== undefined) {
      const deactivateResult = this.deactivateZone(this.#activeZoneId);
      if (!deactivateResult.ok) {
        return deactivateResult;
      }
    }

    this.#setStatus(zoneId, "active");
    const previousZoneId = this.#activeZoneId;
    const previousDef = previousZoneId !== undefined
      ? this.#zones.get(previousZoneId)
      : undefined;
    this.#activeZoneId = zoneId;

    this.events.publish("zoneActivated", {
      zoneId,
      definitionId: instance.definitionId,
    });
    this.events.publish("zoneChanged", {
      previousZoneId: previousZoneId ?? undefined,
      previousDefinitionId: previousDef?.definitionId ?? undefined,
      newZoneId: zoneId,
      newDefinitionId: instance.definitionId,
    });

    return { ok: true, zoneId };
  }

  deactivateZone(zoneId: ZoneId): ZoneTransitionResult {
    const instance = this.#zones.get(zoneId);
    if (instance === undefined) {
      return { ok: false, reason: "zone_not_found" };
    }
    if (instance.status !== "active") {
      return { ok: false, reason: "zone_not_active" };
    }
    this.#setStatus(zoneId, "inactive");
    if (this.#activeZoneId === zoneId) {
      this.#activeZoneId = undefined;
    }
    this.events.publish("zoneDeactivated", {
      zoneId,
      definitionId: instance.definitionId,
    });
    return { ok: true, zoneId };
  }

  // ── Convenience: change zone ─────────────────────────────────────────────

  /**
   * Load + activate a zone by definition. Deactivates + unloads the current
   * active zone if one exists.
   */
  changeZone(definitionId: ZoneDefinitionId): ZoneTransitionResult {
    // Deactivate + unload current
    if (this.#activeZoneId !== undefined) {
      const oldId = this.#activeZoneId;
      const deactivate = this.deactivateZone(oldId);
      if (!deactivate.ok) {
        return deactivate;
      }
      this.unloadZone(oldId);
    }

    // Load + activate new
    const loadResult = this.loadZone(definitionId);
    if (!loadResult.ok) {
      return loadResult;
    }
    return this.activateZone(loadResult.zoneId);
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  get activeZoneId(): ZoneId | undefined {
    return this.#activeZoneId;
  }

  getActiveZone(): ZoneInstance | undefined {
    if (this.#activeZoneId === undefined) {
      return undefined;
    }
    return this.#zones.get(this.#activeZoneId);
  }

  getZone(zoneId: ZoneId): ZoneInstance | undefined {
    return this.#zones.get(zoneId);
  }

  getLoadedZones(): readonly ZoneInstance[] {
    return [...this.#zones.values()];
  }

  get loadedZoneCount(): number {
    return this.#zones.size;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  clear(): void {
    this.#zones.clear();
    this.#activeZoneId = undefined;
    this.events.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  #setStatus(zoneId: ZoneId, status: ZoneStatus): void {
    const instance = this.#zones.get(zoneId);
    if (instance === undefined) {
      return;
    }
    // ZoneInstance is readonly — replace with updated copy
    this.#zones.set(zoneId, { ...instance, status });
  }
}
