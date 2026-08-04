import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZoneManager, _resetZoneCounter } from "../zone-manager.js";
import type { ZoneDefinition } from "../zone-types.js";
import { asZoneDefinitionId, asZoneId } from "../zone-types.js";
import { asMonsterDefinitionId } from "../../monsters/types.js";
import { asSpawnGroupId } from "../../monster-spawn/spawn-types.js";

function makeDefinition(id: string): ZoneDefinition {
  return {
    id: asZoneDefinitionId(id),
    name: `Zone ${id}`,
    tier: 4,
    monsterSpawns: [
      {
        definitionId: asMonsterDefinitionId("mob_a"),
        spawnGroupId: asSpawnGroupId("grp_a"),
        count: 2,
        respawnDelayTicks: 30,
      },
    ],
    tags: [],
  };
}

describe("ZoneManager", () => {
  let manager: ZoneManager;

  beforeEach(() => {
    _resetZoneCounter();
    manager = new ZoneManager();
  });

  // ── Registration ─────────────────────────────────────────────────────────

  describe("registerDefinition", () => {
    it("registers a definition and emits event", () => {
      const handler = vi.fn();
      manager.events.subscribe("zoneDefinitionRegistered", handler);
      manager.registerDefinition(makeDefinition("forest"));
      expect(manager.registry.has(asZoneDefinitionId("forest"))).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ definitionId: asZoneDefinitionId("forest"), tier: 4 }),
      );
    });
  });

  // ── Loading ──────────────────────────────────────────────────────────────

  describe("loadZone", () => {
    it("loads a zone from a registered definition", () => {
      manager.registerDefinition(makeDefinition("swamp"));
      const result = manager.loadZone(asZoneDefinitionId("swamp"));
      expect(result.ok).toBe(true);
      if (result.ok) {
        const zone = manager.getZone(result.zoneId);
        expect(zone).toBeDefined();
        expect(zone?.status).toBe("inactive");
        expect(zone?.definitionId).toBe(asZoneDefinitionId("swamp"));
      }
    });

    it("fails if definition is not registered", () => {
      const result = manager.loadZone(asZoneDefinitionId("unknown"));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("definition_not_found");
      }
    });

    it("emits zoneLoaded event", () => {
      const handler = vi.fn();
      manager.events.subscribe("zoneLoaded", handler);
      manager.registerDefinition(makeDefinition("cave"));
      manager.loadZone(asZoneDefinitionId("cave"));
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  // ── Unloading ────────────────────────────────────────────────────────────

  describe("unloadZone", () => {
    it("unloads an inactive zone", () => {
      manager.registerDefinition(makeDefinition("hill"));
      const load = manager.loadZone(asZoneDefinitionId("hill"));
      expect(load.ok).toBe(true);
      if (!load.ok) return;

      const result = manager.unloadZone(load.zoneId);
      expect(result.ok).toBe(true);
      expect(manager.getZone(load.zoneId)).toBeUndefined();
    });

    it("fails on unknown zone", () => {
      const result = manager.unloadZone(asZoneId("nope"));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("zone_not_found");
    });

    it("fails if zone is active", () => {
      manager.registerDefinition(makeDefinition("d"));
      const load = manager.loadZone(asZoneDefinitionId("d"));
      if (!load.ok) return;
      manager.activateZone(load.zoneId);

      const result = manager.unloadZone(load.zoneId);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("zone_already_active");
    });

    it("emits zoneUnloaded event", () => {
      const handler = vi.fn();
      manager.events.subscribe("zoneUnloaded", handler);
      manager.registerDefinition(makeDefinition("e"));
      const load = manager.loadZone(asZoneDefinitionId("e"));
      if (!load.ok) return;
      manager.unloadZone(load.zoneId);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  // ── Activation ───────────────────────────────────────────────────────────

  describe("activateZone", () => {
    it("activates a loaded zone", () => {
      manager.registerDefinition(makeDefinition("plain"));
      const load = manager.loadZone(asZoneDefinitionId("plain"));
      if (!load.ok) return;

      const result = manager.activateZone(load.zoneId);
      expect(result.ok).toBe(true);
      expect(manager.activeZoneId).toBe(load.zoneId);
      expect(manager.getActiveZone()?.status).toBe("active");
    });

    it("emits zoneActivated and zoneChanged events", () => {
      const activated = vi.fn();
      const changed = vi.fn();
      manager.events.subscribe("zoneActivated", activated);
      manager.events.subscribe("zoneChanged", changed);

      manager.registerDefinition(makeDefinition("f"));
      const load = manager.loadZone(asZoneDefinitionId("f"));
      if (!load.ok) return;
      manager.activateZone(load.zoneId);

      expect(activated).toHaveBeenCalledOnce();
      expect(changed).toHaveBeenCalledOnce();
      expect(changed).toHaveBeenCalledWith(
        expect.objectContaining({
          previousZoneId: undefined,
          newZoneId: load.zoneId,
        }),
      );
    });

    it("auto-deactivates current active zone", () => {
      const deactivated = vi.fn();
      manager.events.subscribe("zoneDeactivated", deactivated);

      manager.registerDefinition(makeDefinition("g1"));
      manager.registerDefinition(makeDefinition("g2"));
      const z1 = manager.loadZone(asZoneDefinitionId("g1"));
      const z2 = manager.loadZone(asZoneDefinitionId("g2"));
      if (!z1.ok || !z2.ok) return;

      manager.activateZone(z1.zoneId);
      manager.activateZone(z2.zoneId);

      expect(deactivated).toHaveBeenCalledOnce();
      expect(manager.activeZoneId).toBe(z2.zoneId);
      expect(manager.getZone(z1.zoneId)?.status).toBe("inactive");
    });

    it("fails on unknown zone", () => {
      const result = manager.activateZone(asZoneId("nope"));
      expect(result.ok).toBe(false);
    });

    it("fails if zone is already active", () => {
      manager.registerDefinition(makeDefinition("h"));
      const load = manager.loadZone(asZoneDefinitionId("h"));
      if (!load.ok) return;
      manager.activateZone(load.zoneId);
      const result = manager.activateZone(load.zoneId);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("zone_already_active");
    });
  });

  // ── Deactivation ─────────────────────────────────────────────────────────

  describe("deactivateZone", () => {
    it("deactivates an active zone", () => {
      manager.registerDefinition(makeDefinition("i"));
      const load = manager.loadZone(asZoneDefinitionId("i"));
      if (!load.ok) return;
      manager.activateZone(load.zoneId);
      const result = manager.deactivateZone(load.zoneId);
      expect(result.ok).toBe(true);
      expect(manager.activeZoneId).toBeUndefined();
      expect(manager.getZone(load.zoneId)?.status).toBe("inactive");
    });

    it("emits zoneDeactivated event", () => {
      const handler = vi.fn();
      manager.events.subscribe("zoneDeactivated", handler);
      manager.registerDefinition(makeDefinition("j"));
      const load = manager.loadZone(asZoneDefinitionId("j"));
      if (!load.ok) return;
      manager.activateZone(load.zoneId);
      manager.deactivateZone(load.zoneId);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("fails if zone is not active", () => {
      manager.registerDefinition(makeDefinition("k"));
      const load = manager.loadZone(asZoneDefinitionId("k"));
      if (!load.ok) return;
      const result = manager.deactivateZone(load.zoneId);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("zone_not_active");
    });
  });

  // ── changeZone ───────────────────────────────────────────────────────────

  describe("changeZone", () => {
    it("loads and activates a new zone in one call", () => {
      manager.registerDefinition(makeDefinition("m"));
      const result = manager.changeZone(asZoneDefinitionId("m"));
      expect(result.ok).toBe(true);
      expect(manager.getActiveZone()?.definitionId).toBe(asZoneDefinitionId("m"));
    });

    it("deactivates and unloads old zone, then activates new", () => {
      manager.registerDefinition(makeDefinition("n1"));
      manager.registerDefinition(makeDefinition("n2"));
      manager.changeZone(asZoneDefinitionId("n1"));
      const oldZones = manager.getLoadedZones();

      manager.changeZone(asZoneDefinitionId("n2"));
      expect(manager.getActiveZone()?.definitionId).toBe(asZoneDefinitionId("n2"));
      // Old zone should be unloaded
      for (const z of oldZones) {
        expect(manager.getZone(z.id)).toBeUndefined();
      }
    });

    it("fails if definition is not registered", () => {
      const result = manager.changeZone(asZoneDefinitionId("unknown"));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("definition_not_found");
    });
  });

  // ── Queries ──────────────────────────────────────────────────────────────

  describe("queries", () => {
    it("getActiveZone returns undefined when no zone is active", () => {
      expect(manager.getActiveZone()).toBeUndefined();
      expect(manager.activeZoneId).toBeUndefined();
    });

    it("getLoadedZones returns all loaded zones", () => {
      manager.registerDefinition(makeDefinition("p1"));
      manager.registerDefinition(makeDefinition("p2"));
      manager.loadZone(asZoneDefinitionId("p1"));
      manager.loadZone(asZoneDefinitionId("p2"));
      expect(manager.getLoadedZones()).toHaveLength(2);
      expect(manager.loadedZoneCount).toBe(2);
    });
  });

  // ── Clear ────────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("removes all zones and resets active zone", () => {
      manager.registerDefinition(makeDefinition("q"));
      manager.changeZone(asZoneDefinitionId("q"));
      manager.clear();
      expect(manager.activeZoneId).toBeUndefined();
      expect(manager.loadedZoneCount).toBe(0);
    });
  });
});
