import { describe, expect, it, vi } from "vitest";
import { WorldSaveProvider, type WorldLocationSaveState } from "../world-save-provider.js";
import type { WorldCoordinator } from "../world-coordinator.js";
import type { ZoneDefinitionId } from "../../zones/zone-types.js";

describe("WorldSaveProvider", () => {
  it("has providerId 'world'", () => {
    const mockCoordinator = {
      getWorldState: vi.fn(),
      loadWorldState: vi.fn(),
    } as unknown as WorldCoordinator;

    const provider = new WorldSaveProvider(mockCoordinator);
    expect(provider.providerId).toBe("world");
  });

  it("saves world subsystem state and optional location state", () => {
    const mockWorldState = {
      progression: { unlockedZones: ["zone_forest"], completedZones: [] },
      exploration: { discoveries: [] },
    };
    const mockCoordinator = {
      getWorldState: vi.fn().mockReturnValue(mockWorldState),
      loadWorldState: vi.fn(),
    } as unknown as WorldCoordinator;

    const mockLocationState: WorldLocationSaveState = {
      activeZoneDefId: "zone_forest" as ZoneDefinitionId,
      activeSegment: 2,
      farmMode: true,
      zoneMemories: [],
    };

    const provider = new WorldSaveProvider(
      mockCoordinator,
      () => mockLocationState,
    );

    const saved = provider.save() as { world: typeof mockWorldState; location: WorldLocationSaveState };
    expect(saved.world).toEqual(mockWorldState);
    expect(saved.location).toEqual(mockLocationState);
  });

  it("restores world subsystem state and location state on load", () => {
    const loadWorldState = vi.fn();
    const mockCoordinator = {
      getWorldState: vi.fn(),
      loadWorldState,
    } as unknown as WorldCoordinator;

    const setLocationState = vi.fn();

    const provider = new WorldSaveProvider(
      mockCoordinator,
      undefined,
      setLocationState,
    );

    const payload = {
      world: {
        progression: { unlockedZones: ["zone_forest", "zone_swamp"], completedZones: ["zone_forest"] },
        exploration: { discoveries: [] },
      },
      location: {
        activeZoneDefId: "zone_swamp" as ZoneDefinitionId,
        activeSegment: 1,
        farmMode: false,
        zoneMemories: [],
      },
    };

    provider.load(payload);

    expect(loadWorldState).toHaveBeenCalledWith(payload.world);
    expect(setLocationState).toHaveBeenCalledWith(payload.location);
  });

  it("supports backward compatibility when location property is missing", () => {
    const loadWorldState = vi.fn();
    const mockCoordinator = {
      getWorldState: vi.fn(),
      loadWorldState,
    } as unknown as WorldCoordinator;

    const setLocationState = vi.fn();

    const provider = new WorldSaveProvider(
      mockCoordinator,
      undefined,
      setLocationState,
    );

    const payload = {
      world: {
        progression: { unlockedZones: ["zone_forest"], completedZones: [] },
        exploration: { discoveries: [] },
      },
    };

    provider.load(payload);

    expect(loadWorldState).toHaveBeenCalledWith(payload.world);
    expect(setLocationState).toHaveBeenCalledWith(undefined);
  });
});
