import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@game/core";
import { WorldCoordinator } from "../world-coordinator.js";
import type { WorldCoordinatorDeps } from "../world-coordinator.js";
import type { WorldIntegrationEventMap } from "../world-integration-events.js";
import { ZoneManager, _resetZoneCounter, asZoneDefinitionId } from "../../zones/index.js";
import { BiomeRegistry } from "../../biomes/biome-registry.js";
import { BiomeResolver } from "../../biomes/biome-resolver.js";
import { asBiomeId } from "../../biomes/biome-types.js";
import { WorldProgressionManager } from "../../world-progression/world-progression-manager.js";
import { ExplorationManager } from "../../exploration/exploration-manager.js";
import type { ZoneDefinition } from "../../zones/zone-types.js";

function makeZoneDef(id: string, tier = 1): ZoneDefinition {
  return {
    id: asZoneDefinitionId(id),
    name: id,
    tier,
    monsterSpawns: [],
    tags: [],
  };
}

describe("WorldCoordinator", () => {
  let zoneManager: ZoneManager;
  let biomeRegistry: BiomeRegistry;
  let biomeResolver: BiomeResolver;
  let progressionManager: WorldProgressionManager;
  let explorationManager: ExplorationManager;
  let eventBus: EventBus<WorldIntegrationEventMap>;
  let coordinator: WorldCoordinator;

  beforeEach(() => {
    _resetZoneCounter();
    zoneManager = new ZoneManager();
    biomeRegistry = new BiomeRegistry();
    biomeResolver = new BiomeResolver(biomeRegistry);
    progressionManager = new WorldProgressionManager();
    explorationManager = new ExplorationManager();
    eventBus = new EventBus<WorldIntegrationEventMap>();

    const deps: WorldCoordinatorDeps = {
      zoneManager,
      biomeRegistry,
      biomeResolver,
      progressionManager,
      explorationManager,
      eventBus,
    };
    coordinator = new WorldCoordinator(deps);

    // Register a zone definition and unlock it
    const def = makeZoneDef("forest");
    zoneManager.registerDefinition(def);
    progressionManager.registerUnlockDefinition({
      zoneDefId: asZoneDefinitionId("forest"),
      conditions: [],
      unlockedByDefault: true,
    });
  });

  it("changeZone succeeds for unlocked zone", () => {
    const result = coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    expect(result.ok).toBe(true);
  });

  it("changeZone fails for locked zone", () => {
    const lockedDef = makeZoneDef("dungeon");
    zoneManager.registerDefinition(lockedDef);
    progressionManager.registerUnlockDefinition({
      zoneDefId: asZoneDefinitionId("dungeon"),
      conditions: [{ type: "tier_reached", requiredTier: 99 }],
    });

    const result = coordinator.changeZone(asZoneDefinitionId("dungeon"), 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("zone_locked");
    }
  });

  it("changeZone records exploration — first visit vs revisit", () => {
    coordinator.changeZone(asZoneDefinitionId("forest"), 10);
    expect(explorationManager.isDiscovered(asZoneDefinitionId("forest"))).toBe(true);

    const disc1 = explorationManager.getDiscovery(asZoneDefinitionId("forest"));
    expect(disc1?.visitCount).toBe(1);

    coordinator.changeZone(asZoneDefinitionId("forest"), 20);
    const disc2 = explorationManager.getDiscovery(asZoneDefinitionId("forest"));
    expect(disc2?.visitCount).toBe(2);
  });

  it("changeZone reports isFirstVisit correctly", () => {
    const r1 = coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(r1.event.isFirstVisit).toBe(true);
    }

    const r2 = coordinator.changeZone(asZoneDefinitionId("forest"), 1);
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.event.isFirstVisit).toBe(false);
    }
  });

  it("changeZone resolves biome when associated", () => {
    const biomeId = asBiomeId("temperate");
    biomeRegistry.register({
      id: biomeId,
      name: "Temperate",
      theme: "forest",
      difficultyModifier: 1.0,
      enemyFamilies: [],
      resourceFamilies: [],
      encounterPoolId: "enc_1",
      visualThemeId: "vis_1",
      ambientAudioId: "amb_1",
      musicPlaylistId: "mus_1",
      weather: undefined,
      lighting: "daylight",
      decorationDensity: "Normal",
      tags: [],
    });
    biomeResolver.associate(asZoneDefinitionId("forest"), biomeId);

    const result = coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.biomeId).toBe(biomeId);
    }
  });

  it("changeZone returns undefined biomeId when no biome associated", () => {
    const result = coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.biomeId).toBeUndefined();
    }
  });

  it("getWorldState/loadWorldState roundtrip", () => {
    coordinator.changeZone(asZoneDefinitionId("forest"), 5);
    const state = coordinator.getWorldState();

    // Clear and restore
    coordinator.clearAll();
    expect(explorationManager.isDiscovered(asZoneDefinitionId("forest"))).toBe(false);

    coordinator.loadWorldState(state);
    expect(explorationManager.isDiscovered(asZoneDefinitionId("forest"))).toBe(true);
    expect(progressionManager.isUnlocked(asZoneDefinitionId("forest"))).toBe(true);
  });

  it("clearAll resets all subsystems", () => {
    coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    coordinator.clearAll();

    expect(explorationManager.isDiscovered(asZoneDefinitionId("forest"))).toBe(false);
    expect(progressionManager.isUnlocked(asZoneDefinitionId("forest"))).toBe(false);
  });

  it("initialize wires up event subscriptions and emits worldInitialized", () => {
    let initialized = false;
    eventBus.subscribe("worldInitialized", () => {
      initialized = true;
    });
    coordinator.initialize();
    expect(initialized).toBe(true);
  });

  it("dispose cleans up subscriptions", () => {
    coordinator.initialize();
    coordinator.dispose();
    // After dispose, no errors should occur on zone activation
    // (subscription was removed, so no dangling references)
    coordinator.changeZone(asZoneDefinitionId("forest"), 0);
  });

  it("emits worldZoneChanged event", () => {
    const events: unknown[] = [];
    eventBus.subscribe("worldZoneChanged", (e) => events.push(e));

    coordinator.changeZone(asZoneDefinitionId("forest"), 0);
    expect(events).toHaveLength(1);
  });

  it("emits worldStateLoaded on loadWorldState", () => {
    let loaded = false;
    eventBus.subscribe("worldStateLoaded", () => {
      loaded = true;
    });
    coordinator.loadWorldState({ progression: { unlockedZones: [], completedZones: [] }, exploration: { discoveries: [] } });
    expect(loaded).toBe(true);
  });

  it("emits worldCleared on clearAll", () => {
    let cleared = false;
    eventBus.subscribe("worldCleared", () => {
      cleared = true;
    });
    coordinator.clearAll();
    expect(cleared).toBe(true);
  });
});
