export const ISLAND_BUILDING_IDS = [
  "worker_house",
  "storage",
  "lumber_camp",
  "mine",
  "hunting_camp",
  "fiber_camp",
  "sawmill",
  "smelter",
  "tannery",
  "weaver",
  "workshop",
] as const;

export type IslandBuildingId = (typeof ISLAND_BUILDING_IDS)[number];
export type IslandBuildingCategory = "workers" | "gathering" | "refining" | "crafting" | "storage";
export type IslandProductionFamily = "wood" | "ore" | "hide" | "fiber";
export type IslandWorkerProfession = "woodcutter" | "miner" | "skinner" | "fiber_harvester";

export interface IslandGatheringServiceDefinition {
  readonly productionFamily: IslandProductionFamily;
  readonly workerProfession: IslandWorkerProfession;
}

export interface IslandConstructionRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export interface IslandConstructionDefinition {
  readonly silver: number;
  readonly requirements: readonly IslandConstructionRequirement[];
}

export interface IslandBuildingDefinition {
  readonly id: IslandBuildingId;
  readonly label: string;
  readonly category: IslandBuildingCategory;
  readonly description: string;
  readonly icon: string;
  readonly gatheringService?: IslandGatheringServiceDefinition;
  readonly construction?: IslandConstructionDefinition;
}

export interface IslandPlotDefinition {
  readonly id: string;
  readonly column: number;
  readonly row: number;
}

export interface InitialIslandBuildingDefinition {
  readonly instanceId: string;
  readonly definitionId: IslandBuildingId;
  readonly plotId: string;
  readonly level: number;
}

export interface IslandWorkerHouseLevelDefinition {
  readonly level: number;
  readonly workerCapacity: number;
  readonly recruitmentCost: number;
}

export interface IslandStorageLevelDefinition {
  readonly level: number;
  readonly capacity: number;
}

export interface PlayerIslandConfig {
  readonly plots: readonly IslandPlotDefinition[];
  readonly buildings: readonly IslandBuildingDefinition[];
  readonly initialBuildings: readonly InitialIslandBuildingDefinition[];
  readonly workerHouseLevels: readonly IslandWorkerHouseLevelDefinition[];
  readonly storageLevels: readonly IslandStorageLevelDefinition[];
}

const GATHERING_BUILDING_SILVER_COST = 100;
const T3_WOOD_ID = "item_resource_wood_t3";

const BUILDINGS: readonly IslandBuildingDefinition[] = [
  {
    id: "worker_house",
    label: "Maison des ouvriers",
    category: "workers",
    description: "Recrutement, capacité et affectation des ouvriers de l'île.",
    icon: "♟",
  },
  {
    id: "storage",
    label: "Entrepôt",
    category: "storage",
    description: "Stockage partagé utilisé automatiquement par les activités de l'île.",
    icon: "▣",
  },
  {
    id: "lumber_camp",
    label: "Camp de bûcherons",
    category: "gathering",
    description: "Production passive de bois par les ouvriers affectés.",
    icon: "♣",
    gatheringService: { productionFamily: "wood", workerProfession: "woodcutter" },
    construction: {
      silver: GATHERING_BUILDING_SILVER_COST,
      requirements: [{ itemId: T3_WOOD_ID, quantity: 20 }],
    },
  },
  {
    id: "mine",
    label: "Mine",
    category: "gathering",
    description: "Production passive de minerai par les ouvriers affectés.",
    icon: "◆",
    gatheringService: { productionFamily: "ore", workerProfession: "miner" },
    construction: {
      silver: GATHERING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 12 },
        { itemId: "item_resource_copper_ore_t3", quantity: 8 },
      ],
    },
  },
  {
    id: "hunting_camp",
    label: "Camp de chasse",
    category: "gathering",
    description: "Production passive de peaux par les ouvriers affectés.",
    icon: "◈",
    gatheringService: { productionFamily: "hide", workerProfession: "skinner" },
    construction: {
      silver: GATHERING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 12 },
        { itemId: "item_resource_hide_t3", quantity: 8 },
      ],
    },
  },
  {
    id: "fiber_camp",
    label: "Atelier de fibres",
    category: "gathering",
    description: "Production passive de fibres par les ouvriers affectés.",
    icon: "≈",
    gatheringService: { productionFamily: "fiber", workerProfession: "fiber_harvester" },
    construction: {
      silver: GATHERING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 12 },
        { itemId: "item_resource_fiber_t3", quantity: 8 },
      ],
    },
  },
  {
    id: "sawmill",
    label: "Scierie",
    category: "refining",
    description: "Transformation du bois brut en planches.",
    icon: "▥",
  },
  {
    id: "smelter",
    label: "Fonderie",
    category: "refining",
    description: "Transformation du minerai en lingots.",
    icon: "♨",
  },
  {
    id: "tannery",
    label: "Tannerie",
    category: "refining",
    description: "Transformation des peaux en cuir.",
    icon: "◫",
  },
  {
    id: "weaver",
    label: "Tisserand",
    category: "refining",
    description: "Transformation des fibres en tissu.",
    icon: "≋",
  },
  {
    id: "workshop",
    label: "Atelier d'équipement",
    category: "crafting",
    description: "Fabrication des armes, armures et objets utiles au héros.",
    icon: "⚒",
  },
] as const;

export const PLAYER_ISLAND_CONFIG: PlayerIslandConfig = {
  // The layout is visual-first. No punitive plot capacity rule is enforced.
  plots: [
    { id: "plot_01", column: 1, row: 1 },
    { id: "plot_02", column: 2, row: 1 },
    { id: "plot_03", column: 3, row: 1 },
    { id: "plot_04", column: 4, row: 1 },
    { id: "plot_05", column: 1, row: 2 },
    { id: "plot_06", column: 2, row: 2 },
    { id: "plot_07", column: 3, row: 2 },
    { id: "plot_08", column: 4, row: 2 },
  ],
  buildings: BUILDINGS,
  initialBuildings: [
    { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
    { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
  ],
  // Existing vertical-slice baselines. Additional levels remain unauthored.
  workerHouseLevels: [
    { level: 1, workerCapacity: 4, recruitmentCost: 250 },
  ],
  storageLevels: [
    { level: 1, capacity: 256 },
  ],
};

const BUILDING_BY_ID = new Map<IslandBuildingId, IslandBuildingDefinition>(
  BUILDINGS.map((definition) => [definition.id, definition] as const),
);
const INITIAL_BUILDING_BY_ID = new Map<IslandBuildingId, InitialIslandBuildingDefinition>(
  PLAYER_ISLAND_CONFIG.initialBuildings.map((definition) => [definition.definitionId, definition] as const),
);
const WORKER_HOUSE_LEVEL_BY_LEVEL = new Map<number, IslandWorkerHouseLevelDefinition>(
  PLAYER_ISLAND_CONFIG.workerHouseLevels.map((definition) => [definition.level, definition] as const),
);
const STORAGE_LEVEL_BY_LEVEL = new Map<number, IslandStorageLevelDefinition>(
  PLAYER_ISLAND_CONFIG.storageLevels.map((definition) => [definition.level, definition] as const),
);

export function getIslandBuildingDefinition(id: IslandBuildingId): IslandBuildingDefinition {
  const definition = BUILDING_BY_ID.get(id);
  if (definition === undefined) throw new Error(`Unknown island building: ${id}`);
  return definition;
}

export function getInitialIslandBuildingDefinition(id: IslandBuildingId): InitialIslandBuildingDefinition {
  const definition = INITIAL_BUILDING_BY_ID.get(id);
  if (definition === undefined) throw new Error(`Missing initial island building: ${id}`);
  return definition;
}

export function getIslandWorkerHouseLevelDefinition(level: number): IslandWorkerHouseLevelDefinition {
  const definition = WORKER_HOUSE_LEVEL_BY_LEVEL.get(level);
  if (definition === undefined) throw new Error(`Missing worker house level data: ${String(level)}`);
  return definition;
}

export function getInitialIslandWorkerHouseLevelDefinition(): IslandWorkerHouseLevelDefinition {
  return getIslandWorkerHouseLevelDefinition(
    getInitialIslandBuildingDefinition("worker_house").level,
  );
}

export function getIslandStorageLevelDefinition(level: number): IslandStorageLevelDefinition {
  const definition = STORAGE_LEVEL_BY_LEVEL.get(level);
  if (definition === undefined) throw new Error(`Missing storage level data: ${String(level)}`);
  return definition;
}

export function getInitialIslandStorageLevelDefinition(): IslandStorageLevelDefinition {
  return getIslandStorageLevelDefinition(
    getInitialIslandBuildingDefinition("storage").level,
  );
}
