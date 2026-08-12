import type { EntityId } from "@game/core";
import type { DurabilityStore, InventoryManager } from "@game/gameplay";
import { canCraftRecipe } from "@game/gameplay";
import {
  SPECIAL_CRAFT_RECIPES,
  type ClientCraftRecipe,
} from "../data/specialCraftRecipes.js";
import { isProductionMaterial } from "./ProductionStorage.js";

export type CraftEquipmentResult =
  | {
      readonly ok: true;
      readonly recipeName: string;
      readonly outputItemId: string;
      readonly itemPower: number;
    }
  | {
      readonly ok: false;
    };

export interface CraftingRuntimeDependencies {
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  readonly productionStorageId?: EntityId;
  readonly durabilityStore: DurabilityStore;
  readonly recipes: readonly ClientCraftRecipe[];
  readonly getItemPower: (itemId: string) => number | undefined;
}

export class CraftingRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly heroId: EntityId;
  private readonly productionStorageId: EntityId;
  private readonly durabilityStore: DurabilityStore;
  private readonly recipes: readonly ClientCraftRecipe[];
  private readonly getItemPower: (itemId: string) => number | undefined;

  public constructor(deps: CraftingRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.heroId = deps.heroId;
    this.productionStorageId = deps.productionStorageId ?? deps.heroId;
    this.durabilityStore = deps.durabilityStore;
    this.recipes = [
      ...deps.recipes,
      ...SPECIAL_CRAFT_RECIPES.filter((special) =>
        !deps.recipes.some((recipe) => recipe.outputItemId === special.outputItemId),
      ),
    ];
    this.getItemPower = deps.getItemPower;
  }

  public craftEquipment(outputItemId: string): CraftEquipmentResult {
    const recipe = this.recipes.find((entry) => entry.outputItemId === outputItemId);
    if (recipe === undefined) return { ok: false };
    if (!canCraftRecipe(this.inventoryManager, this.heroId, recipe.requirements, {
      itemId: recipe.outputItemId,
      quantity: 1,
    }, (itemId) => isProductionMaterial(itemId) ? this.productionStorageId : this.heroId)) {
      return { ok: false };
    }

    const paid: { itemId: string; quantity: number }[] = [];
    for (const requirement of recipe.requirements) {
      const ownerId = isProductionMaterial(requirement.itemId)
        ? this.productionStorageId
        : this.heroId;
      const removed = this.inventoryManager.removeQuantity(
        ownerId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        for (const entry of paid) {
          const refundOwnerId = isProductionMaterial(entry.itemId)
            ? this.productionStorageId
            : this.heroId;
          this.inventoryManager.addQuantity(refundOwnerId, entry.itemId, entry.quantity, {
            itemId: entry.itemId,
            stackable: true,
            maxStack: 999,
          });
        }
        return { ok: false };
      }
      paid.push(requirement);
    }

    const output = this.inventoryManager.addQuantity(this.heroId, recipe.outputItemId, 1);
    if (!output.ok || output.value.remainder > 0) {
      for (const entry of paid) {
        const refundOwnerId = isProductionMaterial(entry.itemId)
          ? this.productionStorageId
          : this.heroId;
        this.inventoryManager.addQuantity(refundOwnerId, entry.itemId, entry.quantity, {
          itemId: entry.itemId,
          stackable: true,
          maxStack: 999,
        });
      }
      return { ok: false };
    }

    const itemPower = this.getItemPower(recipe.outputItemId);
    const outputPosition = output.value.affectedPositions[0];
    if (itemPower !== undefined && outputPosition !== undefined) {
      const outputSlot = this.inventoryManager.getSlot(this.heroId, outputPosition);
      const outputEntry = outputSlot.ok ? outputSlot.value.entry : undefined;
      if (
        outputEntry !== undefined
        && this.durabilityStore.get(outputEntry.instanceId) === undefined
      ) {
        this.durabilityStore.attach(outputEntry.instanceId, 100);
      }
    }

    return {
      ok: true,
      recipeName: recipe.name,
      outputItemId: recipe.outputItemId,
      itemPower: itemPower ?? 0,
    };
  }
}
