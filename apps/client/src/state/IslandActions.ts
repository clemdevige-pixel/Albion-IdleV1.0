import type { EntityId } from "@game/core";
import {
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getIslandUpgradeableLevelDefinition,
  getNextIslandLevelDefinition,
  type IslandBuildingId,
  type IslandFlexibleConstructionRequirement,
  type IslandWorldRequirement,
} from "@game/data";
import type { CurrencyService, InventoryManager, PlayerIslandService, WalletId } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge";

interface IslandActionsDependencies { readonly islandService: PlayerIslandService; readonly inventoryManager: InventoryManager; readonly productionStorageId: EntityId; readonly currencyService: CurrencyService; readonly walletId: WalletId; readonly bridge: GameBridge; readonly isWorldRequirementMet: (requirement: IslandWorldRequirement) => boolean; readonly resyncAll: () => void; }
interface PaidMaterial { readonly itemId: string; readonly quantity: number; }

/** Application transaction layer for Island mutations. Domain ownership stays unchanged. */
export class IslandActions {
  readonly #deps: IslandActionsDependencies;
  constructor(deps: IslandActionsDependencies) { this.#deps = deps; }

  constructBuilding(definitionId: IslandBuildingId, plotId: string): boolean {
    const definition = getIslandBuildingDefinition(definitionId);
    const construction = definition.construction;
    if (construction === undefined) return false;
    const islandLevel = getIslandLevelDefinition(this.#deps.islandService.getState().level);
    if (islandLevel === undefined || !islandLevel.unlockedCategories.includes(definition.category)) return false;
    const placement = this.#deps.islandService.canPlaceBuilding(definitionId, plotId);
    if (!placement.ok) return false;
    const builtIds = new Set(this.#deps.islandService.getState().buildings.map((building) => building.definitionId));
    if (construction.prerequisiteBuildings?.some((requiredId) => !builtIds.has(requiredId)) === true) return false;
    if (!this.#canAfford(construction.silver, construction.requirements, construction.flexibleRequirement)) return false;
    const paid = this.#pay(construction.silver, construction.requirements, construction.flexibleRequirement);
    if (paid === undefined) return false;
    const built = this.#deps.islandService.placeBuilding(definitionId, plotId);
    if (!built.ok) { this.#refund(construction.silver, paid); return false; }
    this.#deps.resyncAll(); this.#notify(`notif_island_build_${definitionId}`, `${definition.label} construit`); return true;
  }

  moveBuilding(buildingInstanceId: string, targetPlotId: string): boolean {
    const result = this.#deps.islandService.moveBuilding(buildingInstanceId, targetPlotId);
    if (!result.ok) return false;
    this.#deps.resyncAll();
    const definition = getIslandBuildingDefinition(result.building.definitionId);
    this.#notify(`notif_island_move_${result.building.definitionId}`, `${definition.label} déplacé`);
    return true;
  }

  upgradeBuilding(definitionId: IslandBuildingId): boolean {
    const preview = this.#deps.islandService.canUpgradeBuilding(definitionId); if (!preview.ok) return false;
    const currentDefinition = getIslandUpgradeableLevelDefinition(definitionId, preview.building.level - 1);
    const cost = currentDefinition?.upgradeToNext;
    if (cost === undefined || !this.#canAfford(cost.silver, cost.requirements, cost.flexibleRequirement)) return false;
    const paid = this.#pay(cost.silver, cost.requirements, cost.flexibleRequirement); if (paid === undefined) return false;
    const upgraded = this.#deps.islandService.upgradeBuilding(definitionId);
    if (!upgraded.ok) { this.#refund(cost.silver, paid); return false; }
    this.#deps.resyncAll(); const definition = getIslandBuildingDefinition(definitionId);
    this.#notify(`notif_island_upgrade_${definitionId}`, `${definition.label} amélioré au niveau ${String(upgraded.building.level)}`); return true;
  }

  upgradeIslandLevel(): boolean {
    const preview = this.#deps.islandService.canUpgradeIslandLevel(); if (!preview.ok) return false;
    const next = getNextIslandLevelDefinition(this.#deps.islandService.getState().level); const cost = next?.upgradeCost;
    if (next === undefined || cost === undefined) return false;
    if (next.worldRequirementToReach !== undefined && !this.#deps.isWorldRequirementMet(next.worldRequirementToReach)) return false;
    if (!this.#canAfford(cost.silver, cost.requirements)) return false;
    const paid = this.#pay(cost.silver, cost.requirements); if (paid === undefined) return false;
    const upgraded = this.#deps.islandService.upgradeIslandLevel();
    if (!upgraded.ok) { this.#refund(cost.silver, paid); return false; }
    this.#deps.resyncAll(); this.#notify("notif_island_level", `Île améliorée au niveau ${String(upgraded.level)} · ${next.label}`); return true;
  }

  #notify(id: string, message: string): void { this.#deps.bridge.addEconomyNotification({ id: `${id}_${String(Date.now())}`, type: "success", message, timestamp: Date.now() }); }

  #getFlexiblePayment(requirement: IslandFlexibleConstructionRequirement): PaidMaterial[] | undefined {
    const available = requirement.itemIds
      .map((itemId) => ({ itemId, quantity: this.#deps.inventoryManager.getTotalQuantity(this.#deps.productionStorageId, itemId) }))
      .filter((entry) => entry.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
    if (available.length < requirement.minimumDistinctItemIds) return undefined;
    if (available.reduce((sum, entry) => sum + entry.quantity, 0) < requirement.totalQuantity) return undefined;
    const paid: PaidMaterial[] = [];
    let remaining = requirement.totalQuantity;
    for (const entry of available.slice(0, requirement.minimumDistinctItemIds)) { paid.push({ itemId: entry.itemId, quantity: 1 }); remaining -= 1; entry.quantity -= 1; }
    for (const entry of available) {
      if (remaining <= 0) break;
      const quantity = Math.min(entry.quantity, remaining); if (quantity <= 0) continue;
      const existing = paid.find((material) => material.itemId === entry.itemId);
      if (existing !== undefined) { (existing as { quantity: number }).quantity += quantity; } else paid.push({ itemId: entry.itemId, quantity });
      remaining -= quantity;
    }
    return remaining === 0 ? paid : undefined;
  }

  #canAfford(silver: number, materials: readonly PaidMaterial[], flexible?: IslandFlexibleConstructionRequirement): boolean {
    for (const requirement of materials) if (this.#deps.inventoryManager.getTotalQuantity(this.#deps.productionStorageId, requirement.itemId) < requirement.quantity) return false;
    if (flexible !== undefined && this.#getFlexiblePayment(flexible) === undefined) return false;
    const balance = this.#deps.currencyService.getBalance(this.#deps.walletId, "currency_silver"); return balance.ok && balance.value >= silver;
  }

  #pay(silver: number, materials: readonly PaidMaterial[], flexible?: IslandFlexibleConstructionRequirement): PaidMaterial[] | undefined {
    const flexiblePayment = flexible === undefined ? [] : this.#getFlexiblePayment(flexible); if (flexiblePayment === undefined) return undefined;
    const allMaterials = [...materials, ...flexiblePayment];
    const payment = this.#deps.currencyService.debit(this.#deps.walletId, "currency_silver", silver); if (!payment.ok) return undefined;
    const paidMaterials: PaidMaterial[] = [];
    for (const requirement of allMaterials) {
      const removed = this.#deps.inventoryManager.removeQuantity(this.#deps.productionStorageId, requirement.itemId, requirement.quantity);
      if (!removed.ok) { this.#refund(silver, paidMaterials); return undefined; }
      paidMaterials.push(requirement);
    }
    return paidMaterials;
  }

  #refund(silver: number, materials: readonly PaidMaterial[]): void {
    this.#deps.currencyService.credit(this.#deps.walletId, "currency_silver", silver);
    for (const material of materials) {
      const restored = this.#deps.inventoryManager.addQuantity(this.#deps.productionStorageId, material.itemId, material.quantity, { itemId: material.itemId, stackable: true, maxStack: 999 });
      if (!restored.ok || restored.value.remainder !== 0) throw new Error(`Island transaction rollback failed for ${material.itemId}`);
    }
    this.#deps.resyncAll();
  }
}
