import {
  ISLAND_BUILDING_IDS,
  PLAYER_ISLAND_CONFIG,
  getIslandLevelDefinition,
  getIslandOperationalLevelDefinition,
  getNextIslandLevelDefinition,
  type IslandBuildingId,
  type PlayerIslandConfig,
} from "@game/data";
import type { SaveProvider } from "@game/persistence";
import { z } from "zod";

export interface IslandBuildingState {
  readonly instanceId: string;
  readonly definitionId: IslandBuildingId;
  readonly plotId: string;
  readonly level: number;
}

export interface IslandPlotState {
  readonly id: string;
  readonly buildingInstanceId: string | null;
}

export interface PlayerIslandState {
  readonly level: number;
  readonly plots: readonly IslandPlotState[];
  readonly buildings: readonly IslandBuildingState[];
}

export type PlaceIslandBuildingResult =
  | { readonly ok: true; readonly building: IslandBuildingState }
  | { readonly ok: false; readonly reason: "unknown_building" | "unknown_plot" | "plot_occupied" | "already_built" };

export type UpgradeIslandBuildingResult =
  | { readonly ok: true; readonly building: IslandBuildingState }
  | { readonly ok: false; readonly reason: "not_built" | "max_level" | "unauthored_level" | "island_level_required" };

export type UpgradeIslandLevelResult =
  | { readonly ok: true; readonly level: number }
  | { readonly ok: false; readonly reason: "max_level" };

const IslandBuildingIdSchema = z.enum(ISLAND_BUILDING_IDS);
const IslandSnapshotSchema = z.object({
  version: z.literal(1),
  level: z.number().int().min(1).max(6).optional(),
  plots: z.array(z.object({ id: z.string().min(1), buildingInstanceId: z.string().min(1).nullable() })),
  buildings: z.array(z.object({
    instanceId: z.string().min(1),
    definitionId: IslandBuildingIdSchema,
    plotId: z.string().min(1),
    level: z.number().int().min(1),
  })),
});

type IslandSnapshot = z.infer<typeof IslandSnapshotSchema>;

function createInitialState(config: PlayerIslandConfig): PlayerIslandState {
  const buildings: IslandBuildingState[] = config.initialBuildings.map((building) => ({ ...building }));
  const buildingByPlot = new Map<string, string>(buildings.map((building) => [building.plotId, building.instanceId] as const));
  return {
    level: 1,
    plots: config.plots.map((plot) => ({ id: plot.id, buildingInstanceId: buildingByPlot.get(plot.id) ?? null })),
    buildings,
  };
}

/** Authoritative Player Island state. Economy, workers and production remain owned by their existing domains. */
export class PlayerIslandService implements SaveProvider {
  readonly providerId = "player_island";
  readonly #config: PlayerIslandConfig;
  #state: PlayerIslandState;

  constructor(config: PlayerIslandConfig = PLAYER_ISLAND_CONFIG) {
    this.#config = config;
    this.#state = createInitialState(config);
  }

  getState(): PlayerIslandState { return this.#state; }

  getBuildingLevel(definitionId: IslandBuildingId): number | undefined {
    return this.#state.buildings.find((building) => building.definitionId === definitionId)?.level;
  }

  canPlaceBuilding(definitionId: IslandBuildingId, plotId: string): PlaceIslandBuildingResult {
    if (!this.#config.buildings.some((definition) => definition.id === definitionId)) return { ok: false, reason: "unknown_building" };
    const plot = this.#state.plots.find((candidate) => candidate.id === plotId);
    if (plot === undefined) return { ok: false, reason: "unknown_plot" };
    if (plot.buildingInstanceId !== null) return { ok: false, reason: "plot_occupied" };
    if (this.#state.buildings.some((building) => building.definitionId === definitionId)) return { ok: false, reason: "already_built" };
    return { ok: true, building: { instanceId: `island_${definitionId}`, definitionId, plotId, level: 1 } };
  }

  placeBuilding(definitionId: IslandBuildingId, plotId: string): PlaceIslandBuildingResult {
    const preview = this.canPlaceBuilding(definitionId, plotId);
    if (!preview.ok) return preview;
    this.#state = {
      ...this.#state,
      plots: this.#state.plots.map((plot) => plot.id === plotId ? { ...plot, buildingInstanceId: preview.building.instanceId } : plot),
      buildings: [...this.#state.buildings, preview.building],
    };
    return preview;
  }

  canUpgradeBuilding(definitionId: IslandBuildingId): UpgradeIslandBuildingResult {
    const building = this.#state.buildings.find((candidate) => candidate.definitionId === definitionId);
    if (building === undefined) return { ok: false, reason: "not_built" };
    const currentLevel = getIslandOperationalLevelDefinition(definitionId, building.level);
    if (currentLevel === undefined) return { ok: false, reason: "unauthored_level" };
    if (currentLevel.upgradeToNext === undefined) return { ok: false, reason: "max_level" };
    const nextLevel = getIslandOperationalLevelDefinition(definitionId, building.level + 1);
    if (nextLevel === undefined) return { ok: false, reason: "unauthored_level" };
    const islandDefinition = getIslandLevelDefinition(this.#state.level);
    const maxBuildingLevel = islandDefinition?.maxBuildingLevel ?? this.#state.level;
    if (nextLevel.level > maxBuildingLevel) return { ok: false, reason: "island_level_required" };
    return { ok: true, building: { ...building, level: nextLevel.level } };
  }

  upgradeBuilding(definitionId: IslandBuildingId): UpgradeIslandBuildingResult {
    const preview = this.canUpgradeBuilding(definitionId);
    if (!preview.ok) return preview;
    this.#state = {
      ...this.#state,
      buildings: this.#state.buildings.map((building) => building.definitionId === definitionId ? preview.building : building),
    };
    return preview;
  }

  canUpgradeIslandLevel(): UpgradeIslandLevelResult {
    const next = getNextIslandLevelDefinition(this.#state.level);
    if (next === undefined) return { ok: false, reason: "max_level" };
    return { ok: true, level: next.level };
  }

  upgradeIslandLevel(): UpgradeIslandLevelResult {
    const preview = this.canUpgradeIslandLevel();
    if (!preview.ok) return preview;
    this.#state = { ...this.#state, level: preview.level };
    return preview;
  }

  save(): IslandSnapshot {
    return { version: 1, level: this.#state.level, plots: this.#state.plots.map((plot) => ({ ...plot })), buildings: this.#state.buildings.map((building) => ({ ...building })) };
  }

  load(data: unknown): void {
    const parsed = IslandSnapshotSchema.safeParse(data);
    if (!parsed.success || !this.#isValidSnapshot(parsed.data)) return;
    const savedPlotById = new Map(parsed.data.plots.map((plot) => [plot.id, plot] as const));
    const islandLevel = parsed.data.level ?? 1;
    const maxBuildingLevel = getIslandLevelDefinition(islandLevel)?.maxBuildingLevel ?? islandLevel;
    this.#state = {
      level: islandLevel,
      plots: this.#config.plots.map((plot) => ({ id: plot.id, buildingInstanceId: savedPlotById.get(plot.id)?.buildingInstanceId ?? null })),
      buildings: parsed.data.buildings.map((building) => ({
        ...building,
        level: Math.min(building.level, maxBuildingLevel),
      })),
    };
  }

  #isValidSnapshot(snapshot: IslandSnapshot): boolean {
    const validPlotIds = new Set(this.#config.plots.map((plot) => plot.id));
    const snapshotPlotIds = new Set(snapshot.plots.map((plot) => plot.id));
    const buildingInstanceIds = new Set(snapshot.buildings.map((building) => building.instanceId));
    const buildingDefinitionIds = new Set(snapshot.buildings.map((building) => building.definitionId));
    const validBuildingIds = new Set(this.#config.buildings.map((building) => building.id));
    if (snapshotPlotIds.size !== snapshot.plots.length || snapshot.plots.some((plot) => !validPlotIds.has(plot.id))) return false;
    if (buildingInstanceIds.size !== snapshot.buildings.length || buildingDefinitionIds.size !== snapshot.buildings.length) return false;
    if (snapshot.buildings.some((building) => !validPlotIds.has(building.plotId) || !validBuildingIds.has(building.definitionId))) return false;
    for (const building of snapshot.buildings) {
      const progression = getIslandOperationalLevelDefinition(building.definitionId, building.level);
      const isUtilityBuilding = building.definitionId === "worker_house" || building.definitionId === "storage";
      if (!isUtilityBuilding && progression === undefined) return false;
    }
    for (const plot of snapshot.plots) if (plot.buildingInstanceId !== null && !buildingInstanceIds.has(plot.buildingInstanceId)) return false;
    for (const building of snapshot.buildings) {
      const plot = snapshot.plots.find((candidate) => candidate.id === building.plotId);
      if (plot?.buildingInstanceId !== building.instanceId) return false;
    }
    return true;
  }
}
