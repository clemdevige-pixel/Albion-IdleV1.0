import type { EntityId } from "@game/core";
import {
  getIslandBuildingDefinition,
  getIslandOperationalLevelDefinition,
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

    if (!this.#canAfford(construction.silver, construction.requirements)) return false;
    const paid = this.#pay(construction.silver, construction.requirements, "Island construction");
    if (!paid) return false;

    const built = this.#deps.islandService.placeBuilding(definitionId, plotId);
    if (!built.ok) {
      this.#refund(construction.silver, construction.requirements);
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

  upgradeBuilding(definitionId: IslandBuildingId): boolean {
    const preview = this.#deps.islandService.canUpgradeBuilding(definitionId);
    if (!preview.ok) return false;

    const currentLevel = preview.building.level - 1;
    const currentDefinition = getIslandOperationalLevelDefinition(definitionId, currentLevel);
    const cost = currentDefinition?.upgradeToNext;
    if (cost === undefined) return false;

    if (!this.#canAfford(cost.silver, cost.requirements)) return false;
    const paid = this.#pay(cost.silver, cost.requirements, "Island upgrade");
    if (!paid) return false;

    const upgraded = this.#deps.islandService.upgradeBuilding(definitionId);
    if (!upgraded.ok) {
      this.#refund(cost.silver, cost.requirements);
      return false;
    }

    this.#deps.resyncAll();
    const definition = getIslandBuildingDefinition(definitionId);
    this.#deps.bridge.addEconomyNotification({
      id: `notif_island_upgrade_${definitionId}_${String(Date.now())}`,
      type: "success",
      message: `${definition.label} amélioré au niveau ${String(upgraded.building.level)}`,
      timestamp: Date.now(),
    });
    return true;
  }

  #canAfford(
    silver: number,
    materials: readonly { readonly itemId: string; readonly quantity: number }[],
  ): boolean {
    for (const requirement of materials) {
      const available = this.#deps.inventoryManager.getTotalQuantity(
        this.#deps.productionStorageId,
        requirement.itemId,
      );
      if (available < requirement.quantity) return false;
    }

    return this.#deps.currencyService.getBalance(
      this.#deps.walletId,
      "currency_silver",
    ) >= silver;
  }

  #pay(
    silver: number,
    materials: readonly { readonly itemId: string; readonly quantity: number }[],
    reason: string,
  ): boolean {
    const payment = this.#deps.currencyService.debit(
      this.#deps.walletId,
      "currency_silver",
      silver,
      reason,
    );
    if (!payment.ok) return false;

    const paidMaterials: Array<{ itemId: string; quantity: number }> = [];
    for (const requirement of materials) {
      const removed = this.#deps.inventoryManager.removeQuantity(
        this.#deps.productionStorageId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        this.#refund(silver, paidMaterials);
        return false;
      }
      paidMaterials.push(requirement);
    }

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
        throw new Error(`Island transaction rollback failed for ${material.itemId}`);
      }
    }
    this.#deps.resyncAll();
  }
}
