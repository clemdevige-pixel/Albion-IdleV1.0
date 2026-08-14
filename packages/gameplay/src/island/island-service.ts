import {
  ISLAND_BUILDING_IDS,
  PLAYER_ISLAND_CONFIG,
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
  readonly plots: readonly IslandPlotState[];
  readonly buildings: readonly IslandBuildingState[];
}

const IslandBuildingIdSchema = z.enum(ISLAND_BUILDING_IDS);
const IslandSnapshotSchema = z.object({
  version: z.literal(1),
  plots: z.array(z.object({
    id: z.string().min(1),
    buildingInstanceId: z.string().min(1).nullable(),
  })),
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
  const buildingByPlot = new Map(buildings.map((building) => [building.plotId, building.instanceId]));

  return {
    plots: config.plots.map((plot) => ({
      id: plot.id,
      buildingInstanceId: buildingByPlot.get(plot.id) ?? null,
    })),
    buildings,
  };
}

/**
 * Authoritative Player Island state for the current save.
 *
 * Phase 1 intentionally owns only identity, placement and building level. It
 * does not duplicate gathering, refining, crafting, worker or storage rules.
 */
export class PlayerIslandService implements SaveProvider {
  readonly providerId = "player_island";
  readonly #config: PlayerIslandConfig;
  #state: PlayerIslandState;

  constructor(config: PlayerIslandConfig = PLAYER_ISLAND_CONFIG) {
    this.#config = config;
    this.#state = createInitialState(config);
  }

  getState(): PlayerIslandState {
    return this.#state;
  }

  save(): IslandSnapshot {
    return {
      version: 1,
      plots: this.#state.plots.map((plot) => ({ ...plot })),
      buildings: this.#state.buildings.map((building) => ({ ...building })),
    };
  }

  load(data: unknown): void {
    const parsed = IslandSnapshotSchema.safeParse(data);
    if (!parsed.success || !this.#isValidSnapshot(parsed.data)) return;

    this.#state = {
      plots: parsed.data.plots.map((plot) => ({ ...plot })),
      buildings: parsed.data.buildings.map((building) => ({ ...building })),
    };
  }

  #isValidSnapshot(snapshot: IslandSnapshot): boolean {
    const validPlotIds = new Set(this.#config.plots.map((plot) => plot.id));
    const buildingInstanceIds = new Set(snapshot.buildings.map((building) => building.instanceId));

    if (snapshot.plots.length !== this.#config.plots.length) return false;
    if (snapshot.plots.some((plot) => !validPlotIds.has(plot.id))) return false;
    if (snapshot.buildings.some((building) => !validPlotIds.has(building.plotId))) return false;

    for (const plot of snapshot.plots) {
      if (plot.buildingInstanceId !== null && !buildingInstanceIds.has(plot.buildingInstanceId)) return false;
    }

    return true;
  }
}
