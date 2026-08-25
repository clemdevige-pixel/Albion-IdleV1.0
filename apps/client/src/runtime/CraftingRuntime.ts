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

export interface PlayerCraftRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export function getPlayerCraftRequirementQuantity(
  inventoryManager: PlayerInventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
  itemId: string,
): number {
  return isProductionMaterial(itemId)
    ? inventoryManager.getTotalQuantity(productionStorageId, itemId)
    : inventoryManager.getAccessibleQuantity(heroId, itemId);
}

/**
 * Player crafting treats Inventory + Bank as one logical possession space while
 * the island Production Storage remains a separate authored material store.
 * The dry-run also accounts for player-storage slots that inputs will free.
 */
export function canCraftWithPlayerStorage(
  inventoryManager: PlayerInventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
  requirements: readonly PlayerCraftRequirement[],
  outputItemId: string,
  outputQuantity = 1,
): boolean {
  if (!Number.isInteger(outputQuantity) || outputQuantity <= 0) return false;
  for (const requirement of requirements) {
    if (
      getPlayerCraftRequirementQuantity(
        inventoryManager,
        heroId,
        productionStorageId,
        requirement.itemId,
      ) < requirement.quantity
    ) return false;
  }

  const accessibleOwners = inventoryManager.getAccessibleStorageOwners(heroId);
  const freedByOwner = new Map<EntityId, Set<number>>();
  for (const ownerId of accessibleOwners) freedByOwner.set(ownerId, new Set());

  for (const requirement of requirements) {
    if (isProductionMaterial(requirement.itemId)) continue;
    let remaining = requirement.quantity;
    for (const ownerId of accessibleOwners) {
      if (remaining <= 0) break;
      for (const slot of inventoryManager.findEntriesByItemId(ownerId, requirement.itemId)) {
        if (remaining <= 0) break;
        const entry = slot.entry;
        if (entry === undefined) continue;
        const consumed = Math.min(entry.quantity, remaining);
        if (consumed === entry.quantity) freedByOwner.get(ownerId)?.add(slot.position);
        remaining -= consumed;
      }
    }
  }

  return accessibleOwners.some((ownerId) => inventoryManager.canAcceptQuantity(
    ownerId,
    outputItemId,
    outputQuantity,
    0,
    [...(freedByOwner.get(ownerId) ?? [])],
  ));
}

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
    if (
      recipe === undefined
      || !canCraftWithPlayerStorage(
        this.inventoryManager,
        this.heroId,
        this.productionStorageId,
        recipe.requirements,
        recipe.outputItemId,
      )
    ) return { ok: false };

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
