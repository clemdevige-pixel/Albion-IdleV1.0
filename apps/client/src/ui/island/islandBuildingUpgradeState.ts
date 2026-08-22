import {
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getIslandUpgradeableLevelDefinition,
  type IslandBuildingId,
} from "@game/data";
import { getIslandMaterialQuantity } from "./islandMaterialPresentation";

type InventoryManager = Parameters<typeof getIslandMaterialQuantity>[0];
type ProductionStorageId = Parameters<typeof getIslandMaterialQuantity>[1];

export function getIslandBuildingUpgradeState({
  definitionId,
  level,
  islandLevel,
  silver,
  inventoryManager,
  productionStorageId,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
  readonly islandLevel: number;
  readonly silver: number;
  readonly inventoryManager: InventoryManager;
  readonly productionStorageId: ProductionStorageId;
}) {
  const definition = getIslandBuildingDefinition(definitionId);
  const current = getIslandUpgradeableLevelDefinition(definitionId, level);
  const islandDefinition = getIslandLevelDefinition(islandLevel);
  const maxBuildingLevel = islandDefinition?.maxBuildingLevel ?? islandLevel;

  if (current === undefined) {
    return {
      definition,
      current: undefined,
      next: undefined,
      cost: undefined,
      maxBuildingLevel,
      islandLevelBlocked: false,
      materials: [],
      flexible: undefined,
      flexibleDistinct: 0,
      flexibleTotal: 0,
      flexibleReady: true,
      silverReady: true,
      affordable: false,
      canUpgrade: false,
    } as const;
  }

  const cost = current.upgradeToNext;
  const next = cost === undefined
    ? undefined
    : getIslandUpgradeableLevelDefinition(definitionId, level + 1);

  if (cost === undefined || next === undefined) {
    return {
      definition,
      current,
      next,
      cost,
      maxBuildingLevel,
      islandLevelBlocked: false,
      materials: [],
      flexible: undefined,
      flexibleDistinct: 0,
      flexibleTotal: 0,
      flexibleReady: true,
      silverReady: true,
      affordable: false,
      canUpgrade: false,
    } as const;
  }

  const requiredIslandLevel = next.minimumIslandLevel ?? next.level;
  const islandLevelBlocked = requiredIslandLevel > islandLevel || next.level > maxBuildingLevel;
  const materials = cost.requirements.map((requirement) => ({
    ...requirement,
    available: getIslandMaterialQuantity(inventoryManager, productionStorageId, requirement.itemId),
  }));
  const flexible = cost.flexibleRequirement;
  const flexibleAvailable = flexible?.itemIds.map((itemId) => ({
    itemId,
    available: getIslandMaterialQuantity(inventoryManager, productionStorageId, itemId),
  })) ?? [];
  const flexibleDistinct = flexibleAvailable.filter((entry) => entry.available > 0).length;
  const flexibleTotal = flexibleAvailable.reduce((sum, entry) => sum + entry.available, 0);
  const flexibleReady = flexible === undefined
    || (flexibleDistinct >= flexible.minimumDistinctItemIds && flexibleTotal >= flexible.totalQuantity);
  const silverReady = silver >= cost.silver;
  const affordable = silverReady
    && materials.every((requirement) => requirement.available >= requirement.quantity)
    && flexibleReady;

  return {
    definition,
    current,
    next,
    cost,
    maxBuildingLevel,
    islandLevelBlocked,
    materials,
    flexible,
    flexibleDistinct,
    flexibleTotal,
    flexibleReady,
    silverReady,
    affordable,
    canUpgrade: !islandLevelBlocked && affordable,
  } as const;
}
