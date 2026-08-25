import type { EntityId } from "@game/core";
import type { DurabilityStore } from "@game/gameplay";
import {
  SPECIAL_CRAFT_RECIPES,
  type ClientCraftRecipe,
} from "../data/specialCraftRecipes.js";
import type { PlayerInventoryManager } from "./PlayerInventoryManager.js";
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
  readonly inventoryManager: PlayerInventoryManager;
  readonly heroId: EntityId;
  readonly productionStorageId?: EntityId;
  readonly durabilityStore: DurabilityStore;
  readonly recipes: readonly ClientCraftRecipe[];
  readonly getItemPower: (itemId: string) => number | undefined;
}

export class CraftingRuntime {
  private readonly inventoryManager: PlayerInventoryManager;
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
    if (recipe === undefined || !this.hasRequirements(recipe.requirements)) return { ok: false };

    const paid: { itemId: string; quantity: number }[] = [];
    for (const requirement of recipe.requirements) {
      const removed = isProductionMaterial(requirement.itemId)
        ? this.inventoryManager.removeQuantity(
            this.productionStorageId,
            requirement.itemId,
            requirement.quantity,
          ).ok
        : this.inventoryManager.removeAccessibleQuantity(
            this.heroId,
            requirement.itemId,
            requirement.quantity,
          );
      if (!removed) {
        this.refundRequirements(paid);
        return { ok: false };
      }
      paid.push(requirement);
    }

    const output = this.addOutputToAccessibleStorage(recipe.outputItemId);
    if (output === undefined) {
      this.refundRequirements(paid);
      return { ok: false };
    }

    const itemPower = this.getItemPower(recipe.outputItemId);
    if (itemPower !== undefined) {
      const outputSlot = this.inventoryManager.getSlot(output.ownerId, output.position);
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

  private hasRequirements(requirements: readonly { itemId: string; quantity: number }[]): boolean {
    return requirements.every((requirement) => {
      const available = isProductionMaterial(requirement.itemId)
        ? this.inventoryManager.getTotalQuantity(this.productionStorageId, requirement.itemId)
        : this.inventoryManager.getAccessibleQuantity(this.heroId, requirement.itemId);
      return available >= requirement.quantity;
    });
  }

  private addOutputToAccessibleStorage(
    itemId: string,
  ): { readonly ownerId: EntityId; readonly position: number } | undefined {
    for (const ownerId of this.inventoryManager.getAccessibleStorageOwners(this.heroId)) {
      const added = this.inventoryManager.addQuantity(ownerId, itemId, 1);
      if (!added.ok || added.value.added !== 1 || added.value.remainder !== 0) continue;
      const position = added.value.affectedPositions[0];
      if (position !== undefined) return { ownerId, position };
    }
    return undefined;
  }

  private refundRequirements(
    requirements: readonly { itemId: string; quantity: number }[],
  ): void {
    for (const requirement of requirements) {
      if (isProductionMaterial(requirement.itemId)) {
        const restored = this.inventoryManager.addQuantity(
          this.productionStorageId,
          requirement.itemId,
          requirement.quantity,
          { itemId: requirement.itemId, stackable: true, maxStack: 999 },
        );
        if (!restored.ok || restored.value.remainder !== 0) {
          throw new Error(`Crafting rollback failed for ${requirement.itemId}`);
        }
        continue;
      }

      if (!this.inventoryManager.addAccessibleQuantity(
        this.heroId,
        requirement.itemId,
        requirement.quantity,
      )) {
        throw new Error(`Crafting rollback failed for ${requirement.itemId}`);
      }
    }
  }
}
