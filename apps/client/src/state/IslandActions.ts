import type { EntityId } from "@game/core";
import {
  getIslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import type {
  CurrencyService,
  InventoryManager,
  PlayerIslandService,
  WalletId,
} from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge";

interface IslandActionsDependencies {
  readonly islandService: PlayerIslandService;
  readonly inventoryManager: InventoryManager;
  readonly productionStorageId: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly bridge: GameBridge;
  readonly resyncAll: () => void;
}

/** Application transaction layer for Island mutations. Domain ownership stays unchanged. */
export class IslandActions {
  readonly #deps: IslandActionsDependencies;

  constructor(deps: IslandActionsDependencies) {
    this.#deps = deps;
  }

  constructBuilding(definitionId: IslandBuildingId, plotId: string): boolean {
    const definition = getIslandBuildingDefinition(definitionId);
    const construction = definition.construction;
    if (construction === undefined) return false;

    const placement = this.#deps.islandService.canPlaceBuilding(definitionId, plotId);
    if (!placement.ok) return false;

    const builtIds = new Set(
      this.#deps.islandService.getState().buildings.map((building) => building.definitionId),
    );
    if (construction.prerequisiteBuildings?.some((requiredId) => !builtIds.has(requiredId)) === true) {
      return false;
    }

    for (const requirement of construction.requirements) {
      const available = this.#deps.inventoryManager
        .findEntriesByItemId(this.#deps.productionStorageId, requirement.itemId)
        .reduce((total, slot) => total + (slot.entry?.quantity ?? 0), 0);
      if (available < requirement.quantity) return false;
    }

    const payment = this.#deps.currencyService.debit(
      this.#deps.walletId,
      "currency_silver",
      construction.silver,
      "Island construction",
    );
    if (!payment.ok) return false;

    const paidMaterials: Array<{ itemId: string; quantity: number }> = [];
    for (const requirement of construction.requirements) {
      const removed = this.#deps.inventoryManager.removeQuantity(
        this.#deps.productionStorageId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        this.#refund(construction.silver, paidMaterials);
        return false;
      }
      paidMaterials.push(requirement);
    }

    const built = this.#deps.islandService.placeBuilding(definitionId, plotId);
    if (!built.ok) {
      this.#refund(construction.silver, paidMaterials);
      return false;
    }

    this.#deps.resyncAll();
    this.#deps.bridge.addEconomyNotification({
      id: `notif_island_build_${definitionId}_${String(Date.now())}`,
      type: "success",
      message: `${definition.label} construit`,
      timestamp: Date.now(),
    });
    return true;
  }

  #refund(
    silver: number,
    materials: readonly { readonly itemId: string; readonly quantity: number }[],
  ): void {
    this.#deps.currencyService.credit(this.#deps.walletId, "currency_silver", silver);
    for (const material of materials) {
      const restored = this.#deps.inventoryManager.addQuantity(
        this.#deps.productionStorageId,
        material.itemId,
        material.quantity,
        { itemId: material.itemId, stackable: true, maxStack: 999 },
      );
      if (!restored.ok || restored.value.remainder !== 0) {
        throw new Error(`Island construction rollback failed for ${material.itemId}`);
      }
    }
    this.#deps.resyncAll();
  }
}
