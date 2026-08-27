import type { ProductionTier } from "../../data/productionFamilyCatalog";
import type { EntityId } from "@game/core";
import type { InventoryManager } from "@game/gameplay";
import type {
  CraftingRecipeVM,
  GameBridge,
  GatheringVM,
  RefiningVM,
} from "../../game/GameBridge";
import {
  canCraftWithPlayerStorage,
  getPlayerCraftRequirementQuantity,
} from "../../runtime/CraftingRuntime.js";

export function syncCraftingToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
  productionTier: ProductionTier,
  resourceOutputItemIds: {
    woodItemId: string;
    metalItemId: string;
    leatherItemId: string;
    clothItemId: string;
  },
  getItemPower: (itemId: string) => number | undefined,
  craftRecipes: readonly {
    family: CraftingRecipeVM["family"];
    name: string;
    outputItemId: string;
    tier: number;
    requirements: readonly { itemId: string; quantity: number }[];
  }[],
): void {
  const storedQuantity = (itemId: string): number =>
    inventoryManager.getTotalQuantity(productionStorageId, itemId);
  const plankQuantity = storedQuantity(resourceOutputItemIds.woodItemId);
  const barQuantity = storedQuantity(resourceOutputItemIds.metalItemId);
  const leatherQuantity = storedQuantity(resourceOutputItemIds.leatherItemId);
  const clothQuantity = storedQuantity(resourceOutputItemIds.clothItemId);

  const recipes: CraftingRecipeVM[] = craftRecipes.map((recipe) => {
    const requirements = recipe.requirements.map((requirement) => ({
      ...requirement,
      available: getPlayerCraftRequirementQuantity(
        inventoryManager,
        heroId,
        productionStorageId,
        requirement.itemId,
      ),
    }));
    const plankRequirement = requirements.find((entry) => entry.itemId.includes("planks"));
    const barRequirement = requirements.find((entry) => entry.itemId.includes("bar"));
    const canCraft = canCraftWithPlayerStorage(
      inventoryManager,
      heroId,
      productionStorageId,
      recipe.requirements,
      recipe.outputItemId,
    );
    const missingRequirement = requirements.find(
      (requirement) => requirement.available < requirement.quantity,
    );
    const missingIsPredecessor = missingRequirement !== undefined
      && craftRecipes.some((candidate) =>
        candidate.outputItemId === missingRequirement.itemId
        && candidate.tier === recipe.tier - 1);

    return {
      family: recipe.family,
      recipeName: recipe.name,
      outputItemId: recipe.outputItemId,
      tier: recipe.tier,
      itemPower: getItemPower(recipe.outputItemId) ?? 0,
      plankRequired: plankRequirement?.quantity ?? 0,
      barRequired: barRequirement?.quantity ?? 0,
      plankAvailable: plankRequirement?.available ?? 0,
      barAvailable: barRequirement?.available ?? 0,
      plankItemId: plankRequirement?.itemId ?? "",
      barItemId: barRequirement?.itemId ?? "",
      requirements,
      craftedQuantity: getPlayerCraftRequirementQuantity(
        inventoryManager,
        heroId,
        productionStorageId,
        recipe.outputItemId,
      ),
      canCraft,
      ...(canCraft ? {} : {
        blockedReason: missingRequirement === undefined
          ? "inventory_full" as const
          : missingIsPredecessor
            ? "missing_predecessor" as const
            : "missing_materials" as const,
      }),
    };
  });
  bridge.updateCrafting({
    productionTier,
    plankQuantity,
    barQuantity,
    leatherQuantity,
    clothQuantity,
    recipes,
  });
}

export function syncGatheringToBridge(
  updateBridge: (vm: GatheringVM) => void,
  session: {
    id: string | number;
    getRequiredTicks: () => number;
    getElapsedTicks: (tick: number) => number;
  } | undefined,
  currentTick: number,
  masteryLevel: number,
  requiredMasteryLevel: number,
  defaultDurationTicks: number,
  resourceName: string,
  resourceFamily: GatheringVM["resourceFamily"],
  visualManifestId: string,
  resourceTier: GatheringVM["resourceTier"],
  storedQuantity: number,
  strikesUsed: number,
  streak: number,
  yieldScore: number,
  yieldMultiplier: 1 | 2 | 3,
  nextYieldThreshold: number | null,
  yieldProgressToNext: number,
  activeResource?: {
    readonly resourceName: string;
    readonly resourceTier: GatheringVM["resourceTier"];
  },
): void {
  const requiredTicks = session?.getRequiredTicks() ?? defaultDurationTicks;
  const elapsedTicks = session === undefined ? 0 : session.getElapsedTicks(currentTick);
  const progress = session === undefined
    ? 0
    : Math.min(100, Math.round((elapsedTicks / requiredTicks) * 100));
  const activeTier = activeResource?.resourceTier ?? resourceTier;
  const isViewedTierActive = session !== undefined && activeTier === resourceTier;
  const viewedDurationTicks = isViewedTierActive ? requiredTicks : defaultDurationTicks;
  updateBridge({
    status: isViewedTierActive ? "gathering" : "idle",
    resourceName,
    resourceFamily,
    visualManifestId,
    resourceTier,
    masteryLevel,
    requiredMasteryLevel,
    isMasteryUnlocked: masteryLevel >= requiredMasteryLevel,
    progress: isViewedTierActive ? progress : 0,
    durationSeconds: viewedDurationTicks * 0.5,
    storedQuantity,
    activeCycle: session === undefined
      ? undefined
      : {
          resourceName: activeResource?.resourceName ?? resourceName,
          resourceTier: activeTier,
          progress,
          durationSeconds: requiredTicks * 0.5,
          cycleId: String(session.id),
          strikesUsed,
        },
    activeMiniGame: !isViewedTierActive
      ? undefined
      : {
          cycleId: String(session.id),
          strikesUsed,
          streak,
          yieldScore,
          yieldMultiplier,
          nextYieldThreshold,
          yieldProgressToNext,
        },
  });
}

export function syncRefiningToBridge(
  updateBridge: (vm: RefiningVM) => void,
  session: {
    getRequiredTicks: () => number;
    getProgress: (tick: number) => number;
  } | undefined,
  currentTick: number,
  recipe: {
    name: string;
    durationTicks: number;
    requirements: readonly { itemId: string; quantity: number }[];
    outputQuantity: number;
    rawItemId: string;
    outputItemId: string;
  },
  reservedInputs: readonly { itemId: string; quantity: number }[],
  inventoryManager: InventoryManager,
  productionStorageId: EntityId,
): void {
  const requiredTicks = session?.getRequiredTicks() ?? recipe.durationTicks;
  updateBridge({
    status: session === undefined ? "idle" : "refining",
    recipeName: recipe.name,
    progress: session === undefined
      ? 0
      : Math.min(100, Math.round(session.getProgress(currentTick) * 100)),
    durationSeconds: requiredTicks * 0.5,
    inputQuantity: recipe.requirements[0]?.quantity ?? 0,
    outputQuantity: recipe.outputQuantity,
    rawStoredQuantity: inventoryManager.getTotalQuantity(productionStorageId, recipe.rawItemId),
    refinedStoredQuantity: inventoryManager.getTotalQuantity(productionStorageId, recipe.outputItemId),
    reservedInputQuantity: session === undefined
      ? 0
      : reservedInputs.reduce((total, entry) => total + entry.quantity, 0),
    requirements: recipe.requirements.map((requirement) => ({
      ...requirement,
      available: inventoryManager.getTotalQuantity(productionStorageId, requirement.itemId),
      reserved: reservedInputs.find((entry) => entry.itemId === requirement.itemId)?.quantity ?? 0,
    })),
  });
}
