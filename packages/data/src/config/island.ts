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
export type IslandCraftingCategory = "weapons" | "armors" | "other";

export interface IslandGatheringServiceDefinition {
  readonly productionFamily: IslandProductionFamily;
  readonly workerProfession: IslandWorkerProfession;
}

export interface IslandRefiningServiceDefinition {
  readonly productionFamily: IslandProductionFamily;
}

export interface IslandCraftingServiceDefinition {
  readonly categories: readonly IslandCraftingCategory[];
}

export interface IslandConstructionRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export interface IslandConstructionDefinition {
  readonly silver: number;
  readonly requirements: readonly IslandConstructionRequirement[];
  readonly prerequisiteBuildings?: readonly IslandBuildingId[];
}

export interface IslandBuildingDefinition {
  readonly id: IslandBuildingId;
  readonly label: string;
  readonly category: IslandBuildingCategory;
  readonly description: string;
  readonly icon: string;
  readonly gatheringService?: IslandGatheringServiceDefinition;
  readonly refiningService?: IslandRefiningServiceDefinition;
  readonly craftingService?: IslandCraftingServiceDefinition;
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
const REFINING_BUILDING_SILVER_COST = 150;
const WORKSHOP_SILVER_COST = 200;
const T3_WOOD_ID = "item_resource_wood_t3";
const T3_ORE_ID = "item_resource_copper_ore_t3";
const T3_HIDE_ID = "item_resource_hide_t3";
const T3_FIBER_ID = "item_resource_fiber_t3";
const T3_PLANKS_ID = "item_refined_planks_t3";
const T3_BARS_ID = "item_refined_copper_bar_t3";

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
      requirements: [{ itemId: T3_WOOD_ID, quantity: 8 }],
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
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_ORE_ID, quantity: 6 },
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
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_HIDE_ID, quantity: 6 },
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
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_FIBER_ID, quantity: 6 },
      ],
    },
  },
  {
    id: "sawmill",
    label: "Scierie",
    category: "refining",
    description: "Transformation du bois brut en planches.",
    icon: "▥",
    refiningService: { productionFamily: "wood" },
    construction: {
      silver: REFINING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 8 },
        { itemId: T3_ORE_ID, quantity: 4 },
      ],
      prerequisiteBuildings: ["lumber_camp"],
    },
  },
  {
    id: "smelter",
    label: "Fonderie",
    category: "refining",
    description: "Transformation du minerai en lingots.",
    icon: "♨",
    refiningService: { productionFamily: "ore" },
    construction: {
      silver: REFINING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_ORE_ID, quantity: 8 },
      ],
      prerequisiteBuildings: ["mine"],
    },
  },
  {
    id: "tannery",
    label: "Tannerie",
    category: "refining",
    description: "Transformation des peaux en cuir.",
    icon: "◫",
    refiningService: { productionFamily: "hide" },
    construction: {
      silver: REFINING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_HIDE_ID, quantity: 8 },
      ],
      prerequisiteBuildings: ["hunting_camp"],
    },
  },
  {
    id: "weaver",
    label: "Tisserand",
    category: "refining",
    description: "Transformation des fibres en tissu.",
    icon: "≋",
    refiningService: { productionFamily: "fiber" },
    construction: {
      silver: REFINING_BUILDING_SILVER_COST,
      requirements: [
        { itemId: T3_WOOD_ID, quantity: 4 },
        { itemId: T3_FIBER_ID, quantity: 8 },
      ],
      prerequisiteBuildings: ["fiber_camp"],
    },
  },
  {
    id: "workshop",
    label: "Atelier d'équipement",
    category: "crafting",
    description: "Fabrication des armes, armures et objets utiles au héros.",
    icon: "⚒",
    craftingService: { categories: ["weapons", "armors", "other"] },
    construction: {
      silver: WORKSHOP_SILVER_COST,
      requirements: [
        { itemId: T3_PLANKS_ID, quantity: 4 },
        { itemId: T3_BARS_ID, quantity: 4 },
      ],
      prerequisiteBuildings: ["sawmill", "smelter"],
    },
  },
] as const;

export const PLAYER_ISLAND_CONFIG: PlayerIslandConfig = {
  // One gameplay plot per authored grassy parcel on the island background.
  // The source art contains twelve parcels; the twelfth remains available for future content.
  plots: [
    { id: "plot_01", column: 1, row: 1 },
    { id: "plot_02", column: 2, row: 1 },
    { id: "plot_03", column: 3, row: 1 },
    { id: "plot_04", column: 1, row: 2 },
    { id: "plot_05", column: 2, row: 2 },
    { id: "plot_06", column: 3, row: 2 },
    { id: "plot_07", column: 4, row: 2 },
    { id: "plot_08", column: 1, row: 3 },
    { id: "plot_09", column: 2, row: 3 },
    { id: "plot_10", column: 3, row: 3 },
    { id: "plot_11", column: 4, row: 3 },
    { id: "plot_12", column: 5, row: 3 },
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
