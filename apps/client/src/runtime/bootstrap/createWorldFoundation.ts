import { EventBus } from "@game/core";
import {
  BiomeRegistry,
  BiomeResolver,
  ExplorationManager,
  WorldCoordinator,
  WorldProgressionManager,
  ZoneManager,
  type WorldIntegrationEventMap,
  type ZoneDefinitionId,
} from "@game/gameplay";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import type { WorldVM } from "../../game/GameBridge.js";
import { resolveEnvironmentPresentation } from "../../data/environmentPresentation.js";
import { resolveEncounterCategory } from "../../data/monsterContentCatalog.js";
import {
  BIOME_BY_ZONE,
  BIOME_DEFINITIONS,
  WORLD_ZONE_IDS,
  WORLD_ZONE_ORDER,
  ZONE_DEFINITIONS,
  ZONE_UNLOCK_DEFINITIONS,
} from "../../data/worldContentCatalog.js";
import { WorldRuntime } from "../WorldRuntime.js";

/** Framework-agnostic world registries, progression and runtime assembly. */
export function createWorldFoundation() {
  const biomeRegistry = new BiomeRegistry();
  for (const definition of BIOME_DEFINITIONS) {
    biomeRegistry.register(definition);
  }

  const biomeResolver = new BiomeResolver(biomeRegistry);
  const zoneManager = new ZoneManager();
  for (const definition of ZONE_DEFINITIONS) {
    zoneManager.registerDefinition(definition);
  }
  for (const [zoneId, biomeId] of BIOME_BY_ZONE) {
    biomeResolver.associate(zoneId, biomeId);
  }

  const progressionManager = new WorldProgressionManager();
  for (const definition of ZONE_UNLOCK_DEFINITIONS) {
    progressionManager.registerUnlockDefinition(definition);
  }

  const explorationManager = new ExplorationManager();
  const worldEventBus = new EventBus<WorldIntegrationEventMap>();
  const worldCoordinator = new WorldCoordinator({
    zoneManager,
    biomeRegistry,
    biomeResolver,
    progressionManager,
    explorationManager,
    eventBus: worldEventBus,
  });

  worldCoordinator.initialize();
  worldCoordinator.changeZone(WORLD_ZONE_IDS.forest, 0);

  const worldRuntime = new WorldRuntime({
    zoneManager,
    progressionManager,
    worldCoordinator,
  });

  return {
    biomeRegistry,
    biomeResolver,
    zoneManager,
    progressionManager,
    explorationManager,
    worldEventBus,
    worldCoordinator,
    worldRuntime,
    zoneOrder: WORLD_ZONE_ORDER as readonly ZoneDefinitionId[],
    forestZoneDefId: WORLD_ZONE_IDS.forest,
  };
}

export type WorldFoundation = ReturnType<typeof createWorldFoundation>;

/** Maps authoritative world state to the existing bridge presentation model. */
export function buildWorldViewModel({
  zoneManager,
  biomeResolver,
  progressionManager,
  explorationManager,
  worldRuntime,
  zoneOrder,
}: WorldFoundation): WorldVM {
  const zone = worldRuntime.getActiveZoneDef();
  const biome = biomeResolver.resolve(zone.defId);
  const saveState = worldRuntime.getWorldLocationSaveState();

  return {
    zoneIndex: worldRuntime.currentZoneIndex + 1,
    zoneCount: zoneOrder.length,
    canGoPreviousZone: worldRuntime.currentZoneIndex > 0,
    canGoNextZone:
      worldRuntime.currentZoneIndex + 1 < zoneOrder.length
      && progressionManager.isUnlocked(zoneOrder[worldRuntime.currentZoneIndex + 1]!),
    pendingZoneIndex:
      worldRuntime.pendingZone === null ? null : worldRuntime.pendingZone + 1,
    zones: zoneOrder.map((zoneDefId, index) => {
      const definition = zoneManager.registry.get(zoneDefId);
      const zoneBiome = biomeResolver.resolve(zoneDefId);
      const memory = saveState.zoneMemories[index]!;
      const isActive = index === worldRuntime.currentZoneIndex;

      return {
        zoneIndex: index + 1,
        zoneName: definition?.name ?? "Unknown",
        biomeName: zoneBiome?.name ?? "Unknown",
        isUnlocked: progressionManager.isUnlocked(zoneDefId),
        isActive,
        segmentIndex: memory.currentSegment + 1,
        unlockedSegmentCount: memory.highestUnlockedSegment + 1,
        completedSegments: [...memory.completedSegments].map(
          (segment) => segment + 1,
        ),
      };
    }),
    zoneName: zone.name,
    zoneDefId: zone.defId,
    biomeName: biome?.name ?? "Unknown",
    biomeTheme: biome?.theme ?? "Nature",
    environmentVisualManifestId: resolveEnvironmentPresentation(zone.defId),
    segmentIndex: worldRuntime.currentSegment + 1,
    segmentCount: SEGMENTS_PER_ZONE,
    encounterIndex: worldRuntime.currentEncounter + 1,
    encounterCount: ENCOUNTERS_PER_SEGMENT,
    unlockedSegmentCount: worldRuntime.highestUnlockedSegment + 1,
    completedSegments: [...worldRuntime.completedSegments].map(
      (segment) => segment + 1,
    ),
    pendingSegmentIndex:
      worldRuntime.pendingZone !== null
        ? (worldRuntime.pendingZoneSegment ?? 0) + 1
        : worldRuntime.pendingSegment === null
          ? null
          : worldRuntime.pendingSegment + 1,
    farmMode: worldRuntime.farmMode,
    encounterType: resolveEncounterCategory(
      worldRuntime.currentSegment,
      worldRuntime.currentEncounter,
    ),
    zoneProgress: Math.floor(
      ((worldRuntime.currentSegment * ENCOUNTERS_PER_SEGMENT
        + worldRuntime.currentEncounter)
        / (SEGMENTS_PER_ZONE * ENCOUNTERS_PER_SEGMENT))
        * 100,
    ),
    isFirstVisit: !explorationManager.isDiscovered(zone.defId),
  };
}
