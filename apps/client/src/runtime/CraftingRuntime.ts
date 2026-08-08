import type { EntityId } from "@game/core";
import type { DurabilityStore, InventoryManager } from "@game/gameplay";
import { canCraftRecipe } from "@game/gameplay";
import type { EQUIPMENT_CRAFT_RECIPES } from "../data/refiningRecipes.js";

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
  readonly durabilityStore: DurabilityStore;
  readonly recipes: typeof EQUIPMENT_CRAFT_RECIPES;
  readonly getItemPower: (itemId: string) => number | undefined;
}

export class CraftingRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly heroId: EntityId;
  private readonly durabilityStore: DurabilityStore;
  private readonly recipes: typeof EQUIPMENT_CRAFT_RECIPES;
  private readonly getItemPower: (itemId: string) => number | undefined;

  public constructor(deps: CraftingRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.heroId = deps.heroId;
    this.durabilityStore = deps.durabilityStore;
    this.recipes = deps.recipes;
    this.getItemPower = deps.getItemPower;
  }

  public craftEquipment(outputItemId: string): CraftEquipmentResult {
    const recipe = this.recipes.find((entry) => entry.outputItemId === outputItemId);
    if (recipe === undefined) return { ok: false };
    if (!canCraftRecipe(this.inventoryManager, this.heroId, recipe.requirements)) {
      return { ok: false };
    }

    const paid: { itemId: string; quantity: number }[] = [];
    for (const requirement of recipe.requirements) {
      const removed = this.inventoryManager.removeQuantity(
        this.heroId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        for (const entry of paid) {
          this.inventoryManager.addQuantity(this.heroId, entry.itemId, entry.quantity, {
            itemId: entry.itemId,
            stackable: true,
            maxStack: 999,
          });
        }
        return { ok: false };
      }
      paid.push(requirement);
    }

    const output = this.inventoryManager.addEntry(this.heroId, recipe.outputItemId);
    if (!output.ok) {
      for (const entry of paid) {
        this.inventoryManager.addQuantity(this.heroId, entry.itemId, entry.quantity, {
          itemId: entry.itemId,
          stackable: true,
          maxStack: 999,
        });
      }
      return { ok: false };
    }

    this.durabilityStore.attach(output.value.instanceId, 100);
    const itemPower = this.getItemPower(recipe.outputItemId) ?? 0;

    return {
      ok: true,
      recipeName: recipe.name,
      outputItemId: recipe.outputItemId,
      itemPower,
    };
  }
}
